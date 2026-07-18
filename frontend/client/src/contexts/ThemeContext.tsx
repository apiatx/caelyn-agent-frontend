import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface ColorPalette {
  bg: string; card: string; card2: string; surface: string; hero: string; cardAlt: string;
  border: string; borderFaint: string; borderBright: string;
  text: string; bright: string; dim: string; dimLow: string;
  teal: string; green: string; red: string; amber: string; gold: string;
  blue: string; purple: string; orange: string; yellow: string;
  headerBg: string;
}

export const DARK_C: ColorPalette = {
  bg: '#020202', card: '#0a0a0a', card2: '#060606', surface: '#060606',
  hero: '#020208', cardAlt: '#060606',
  border: 'rgba(255,255,255,0.10)', borderFaint: '#111111', borderBright: '#30363d',
  text: '#f5f5f0', bright: '#ffffff', dim: '#a9aaa6', dimLow: '#111111',
  teal: '#0ea5e9', green: '#22c55e', red: '#ef4444',
  amber: '#f59e0b', gold: '#f59e0b', blue: '#3b82f6', purple: '#a855f7',
  orange: '#fb923c', yellow: '#e3b341',
  headerBg: 'rgba(2,2,2,0.97)',
};

export const LIGHT_C: ColorPalette = {
  bg: '#f5f6f8', card: '#ffffff', card2: '#eef0f3', surface: '#eef0f3',
  hero: '#e8ecf2', cardAlt: '#eef0f3',
  border: 'rgba(0,0,0,0.10)', borderFaint: '#e5e7eb', borderBright: '#c4c9d4',
  text: '#0f1117', bright: '#000000', dim: '#5a6478', dimLow: '#dde1e8',
  teal: '#0284c7', green: '#16a34a', red: '#dc2626',
  amber: '#b45309', gold: '#b45309', blue: '#2563eb', purple: '#7c3aed',
  orange: '#ea580c', yellow: '#b45309',
  headerBg: 'rgba(245,246,248,0.97)',
};

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
  C: ColorPalette;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  toggleTheme: () => {},
  C: DARK_C,
});

const STORAGE_KEY = 'caelyn_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored !== 'light';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light'); } catch {}
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.style.background = isDark ? DARK_C.bg : LIGHT_C.bg;
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark(v => !v), []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, C: isDark ? DARK_C : LIGHT_C }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
