import { createContext, useContext, useState, useRef } from 'react';
import type { ReactNode } from 'react';

interface PageContextType {
  pageContextRef: React.MutableRefObject<string | null>;
  setPageContext: (ctx: string | null) => void;
}

const PageContextContext = createContext<PageContextType>({
  pageContextRef: { current: null },
  setPageContext: () => {},
});

export function usePageContext() {
  return useContext(PageContextContext);
}

export function PageContextProvider({ children }: { children: ReactNode }) {
  const [, forceUpdate] = useState(0);
  const pageContextRef = useRef<string | null>(null);

  const setPageContext = (ctx: string | null) => {
    pageContextRef.current = ctx;
    forceUpdate(n => n + 1);
  };

  return (
    <PageContextContext.Provider value={{ pageContextRef, setPageContext }}>
      {children}
    </PageContextContext.Provider>
  );
}
