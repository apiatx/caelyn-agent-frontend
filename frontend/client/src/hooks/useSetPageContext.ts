import { useEffect, useRef } from 'react';
import { usePageContext } from '@/contexts/PageContextContext';

export function useSetPageContext(context: string | null, deps: readonly unknown[]) {
  const { setPageContext } = usePageContext();
  const setFn = useRef(setPageContext);
  setFn.current = setPageContext;

  useEffect(() => {
    setFn.current(context);
    return () => { setFn.current(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
