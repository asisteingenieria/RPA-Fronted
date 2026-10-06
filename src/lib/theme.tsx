import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePref = 'claro' | 'oscuro' | 'sistema';
const KEY = 'panel-sofia:tema';

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'claro' || v === 'oscuro' || v === 'sistema') return v;
  } catch {
    // almacenamiento no disponible
  }
  return 'sistema';
}

const Ctx = createContext<{ pref: ThemePref; resolved: 'light' | 'dark'; setPref: (p: ThemePref) => void }>({
  pref: 'sistema',
  resolved: 'light',
  setPref: () => {},
});

/** Tema claro / oscuro / sistema con la clase `.dark` en <html> (patrón de shadcn). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readPref);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const resolved = pref === 'oscuro' || (pref === 'sistema' && systemDark) ? 'dark' : 'light';
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {
      // sin persistencia
    }
  };
  return <Ctx.Provider value={{ pref, resolved, setPref }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
