import { createContext, useContext, useState, useCallback } from 'react';
import { usePageContext } from '@/contexts/PageContextContext';

const AGENT_BACKEND_URL = 'https://fast-api-server-aidanpilon.replit.app';
const AGENT_API_KEY = 'hippo_ak_7f3x9k2m4p8q1w5t';

function getToken(): string | null {
  return localStorage.getItem('caelyn_jwt') || sessionStorage.getItem('caelyn_jwt');
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  structured?: any;
  type?: string;
}

interface ChatbotContextType {
  messages: Message[];
  isLoading: boolean;
  loadingStage: string;
  sendMessage: (prompt: string) => void;
  clearChat: () => void;
  hasUnread: boolean;
  setHasUnread: (v: boolean) => void;
}

const ChatbotContext = createContext<ChatbotContextType | null>(null);

export function useChatbot() {
  const ctx = useContext(ChatbotContext);
  if (!ctx) throw new Error('useChatbot must be used within ChatbotProvider');
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [hasUnread, setHasUnread] = useState(false);

  // Ref-based so sendMessage always reads the latest value without stale closures
  const { pageContextRef, screenContextRef } = usePageContext();

  const sendMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    // Show user's original message unchanged in the UI
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setIsLoading(true);
    setLoadingStage('Classifying query...');

    // Silently prepend whatever the current page has registered as context
    const ctx = pageContextRef.current;
    const promptForApi = ctx
      ? `${ctx}\n\nUser question: ${prompt.trim()}`
      : prompt.trim();

    const stages = ['Scanning market data...','Pulling technicals...','Checking sentiment...','Analyzing activity...','Fetching options flow...','Reading macro...','Generating analysis...'];
    let idx = 0;
    const iv = setInterval(() => { if (idx < stages.length) { setLoadingStage(stages[idx]); idx++; } }, 1600);

    try {
      const res = await fetch(`${AGENT_BACKEND_URL}/api/query`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prompt: promptForApi, history: chatHistory.slice(-20), chatbox_mode: true, screen_context: screenContextRef.current ?? undefined }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const raw = (await res.text()).trim();
      const data = JSON.parse(raw);
      if (data.error) {
        const errMsg = typeof data.error === 'object' ? data.error.message || JSON.stringify(data.error) : data.error;
        throw new Error(errMsg);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.analysis || '',
        structured: data.structured,
        type: data.type,
      }]);
      setChatHistory(prev => [...prev, {role:'user',content:prompt.trim()}, {role:'assistant',content:data.analysis||''}]);
      setHasUnread(true);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err.message.includes('429') ? 'Rate limit reached. Wait a moment.' : err.message.includes('403') ? 'Auth failed.' : `Error: ${err.message}`,
      }]);
    } finally {
      clearInterval(iv);
      setLoadingStage('');
      setIsLoading(false);
    }
  }, [isLoading, chatHistory, pageContextRef]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setChatHistory([]);
    setHasUnread(false);
  }, []);

  return (
    <ChatbotContext.Provider value={{ messages, isLoading, loadingStage, sendMessage, clearChat, hasUnread, setHasUnread }}>
      {children}
    </ChatbotContext.Provider>
  );
}
