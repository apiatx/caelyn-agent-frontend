import { useEffect, useRef } from 'react';
import type { ScreenContext } from '@/contexts/PageContextContext';
import { usePageContext } from '@/contexts/PageContextContext';

export function useSetScreenContext(context: ScreenContext | null, deps: readonly unknown[]) {
  const { setScreenContext } = usePageContext();
  const setFn = useRef(setScreenContext);
  setFn.current = setScreenContext;

  useEffect(() => {
    setFn.current(context);
    return () => { setFn.current(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
