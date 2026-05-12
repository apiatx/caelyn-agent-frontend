import { createContext, useContext, useState, useRef } from 'react';
import type { ReactNode } from 'react';

export interface ScreenContext {
  route: string;
  page: string;
  tab?: string;
  sub_tab?: string;
  filters?: Record<string, string | number | boolean | null>;
  sort?: { key: string; dir: 'asc' | 'desc' };
  visible_rows?: Array<Record<string, any>>;
  row_count?: number;
  selected?: string | null;
  freshness?: string;
  extra?: Record<string, any>;
}

interface PageContextType {
  pageContextRef: React.MutableRefObject<string | null>;
  setPageContext: (ctx: string | null) => void;
  screenContextRef: React.MutableRefObject<ScreenContext | null>;
  setScreenContext: (ctx: ScreenContext | null) => void;
}

const PageContextContext = createContext<PageContextType>({
  pageContextRef: { current: null },
  setPageContext: () => {},
  screenContextRef: { current: null },
  setScreenContext: () => {},
});

export function usePageContext() {
  return useContext(PageContextContext);
}

export function PageContextProvider({ children }: { children: ReactNode }) {
  const [, forceUpdate] = useState(0);
  const pageContextRef = useRef<string | null>(null);
  const screenContextRef = useRef<ScreenContext | null>(null);

  const setPageContext = (ctx: string | null) => {
    pageContextRef.current = ctx;
    forceUpdate(n => n + 1);
  };

  const setScreenContext = (ctx: ScreenContext | null) => {
    screenContextRef.current = ctx;
  };

  return (
    <PageContextContext.Provider value={{ pageContextRef, setPageContext, screenContextRef, setScreenContext }}>
      {children}
    </PageContextContext.Provider>
  );
}
