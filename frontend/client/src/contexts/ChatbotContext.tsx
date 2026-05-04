import { createContext, useContext, useState, useCallback } from 'react';
import { useLocation } from 'wouter';

const AGENT_BACKEND_URL = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';
const AGENT_API_KEY = 'hippo_ak_7f3x9k2m4p8q1w5t';

function getToken(): string | null {
  return localStorage.getItem('caelyn_token') || sessionStorage.getItem('caelyn_token');
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

// ── MultiCharts context helpers ────────────────────────────────────────────────

const MC_KEY = 'caelyn_multicharts_views_v1';

function buildMultiChartsContext(): string | null {
  try {
    const raw = localStorage.getItem(MC_KEY);
    if (!raw) return null;
    const views = JSON.parse(raw) as Array<{ name: string; charts: Array<{ symbol: string }> }>;
    if (!Array.isArray(views) || views.length === 0) return null;

    const lines: string[] = ['[MultiCharts workspace — user is currently viewing this page]'];
    let anyTickers = false;
    for (const view of views) {
      const tickers = view.charts.map(c => c.symbol).filter(Boolean);
      if (tickers.length === 0) continue;
      anyTickers = true;
      lines.push(`Tab "${view.name}": ${tickers.join(', ')}`);
    }
    if (!anyTickers) return null;

    lines.push('');
    lines.push('When the user asks about "my multi-chart", "these tickers", "my charts", or asks for comparisons / best picks, use the tickers listed above as the subject of analysis.');
    lines.push('');
    return lines.join('\n');
  } catch {
    return null;
  }
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const [location] = useLocation();

  const sendMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    // Show user's original message unchanged in the UI
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setIsLoading(true);
    setLoadingStage('Classifying query...');

    // Silently prepend MultiCharts context when on that page
    const onMultiCharts = location === '/app/multicharts' || location === '/multicharts';
    const mcContext = onMultiCharts ? buildMultiChartsContext() : null;
    const promptForApi = mcContext ? `${mcContext}User question: ${prompt.trim()}` : prompt.trim();

    const stages = ['Scanning market data...','Pulling technicals...','Checking sentiment...','Analyzing activity...','Fetching options flow...','Reading macro...','Generating analysis...'];
    let idx = 0;
    const iv = setInterval(() => { if (idx < stages.length) { setLoadingStage(stages[idx]); idx++; } }, 1600);

    try {
      const res = await fetch(`${AGENT_BACKEND_URL}/api/query`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prompt: promptForApi, history: chatHistory.slice(-20), chatbox_mode: true }),
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
  }, [isLoading, chatHistory]);

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
