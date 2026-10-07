import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { can as canRole, PERMISSIONS, type Role } from '@/components/panel/navigation';
import { backend, subscribe } from '@/data/store';
import type { User } from '@/data/types';
import type { Actor } from '@/data/store';

const KEY = 'panel-sofia:sesion';
/** La sesión expira tras 8 horas sin actividad. */
const IDLE_MS = 8 * 60 * 60 * 1000;

export const ROLE_LABEL: Record<Role, string> = {
  operador: 'Operador',
  editor: 'Editor de contenido',
  aprobador: 'Aprobador',
  legal: 'Legal',
  administrador: 'Administrador',
};

interface Session {
  userId: string;
  /** Contraseña temporal: hay que cambiarla antes de usar el panel. */
  mustChange: boolean;
  expiresAt: number;
  /** Token de la API de administración del robot (solo con VITE_ADMIN_API_URL). */
  adminToken?: string;
}

interface Ctx {
  session: Session | null;
  login: (s: Omit<Session, 'expiresAt'>) => void;
  passwordChanged: () => void;
  logout: () => void;
}

const SessionCtx = createContext<Ctx>({ session: null, login: () => {}, passwordChanged: () => {}, logout: () => {} });

function read(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as Session) : null;
    return s && s.userId && s.expiresAt > Date.now() ? s : null;
  } catch {
    return null;
  }
}

function write(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
    else sessionStorage.removeItem(KEY);
  } catch {
    // sesión solo en memoria
  }
}

/**
 * Sesión del panel (por pestaña). En producción la identidad la da el servidor o el SSO corporativo
 * y los permisos los aplica el servidor; la interfaz solo los refleja.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(read);
  const set = (s: Session | null) => {
    setSession(s);
    write(s);
  };

  // Renueva la expiración con la actividad y cierra la sesión al vencer.
  useEffect(() => {
    if (!session) return;
    const touch = () => {
      const next = { ...session, expiresAt: Date.now() + IDLE_MS };
      write(next);
    };
    const check = setInterval(() => {
      const cur = read();
      if (!cur) setSession(null);
    }, 60_000);
    window.addEventListener('pointerdown', touch);
    window.addEventListener('keydown', touch);
    return () => {
      clearInterval(check);
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
    };
  }, [session]);

  const value: Ctx = {
    session,
    login: (s) => set({ ...s, expiresAt: Date.now() + IDLE_MS }),
    passwordChanged: () => session && set({ ...session, mustChange: false }),
    logout: () => {
      const u = session && backend.snapshot().users.find((x) => x.id === session.userId);
      if (u) void backend.logout(u);
      set(null);
    },
  };
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSessionCtx() {
  return useContext(SessionCtx);
}

/** Usuario actual (solo dentro del área autenticada); el rol se lee siempre de la base. */
export function useUser() {
  const { session } = useContext(SessionCtx);
  const db = useSyncExternalStore(subscribe, backend.snapshot);
  if (!session) throw new Error('Sin sesión');
  const user: User = db.users.find((u) => u.id === session.userId) ?? { id: session.userId, name: 'Usuario', email: '', roles: [], title: '', lastAccess: '' };
  const actor: Actor = { name: user.name, role: user.roles.map((r) => ROLE_LABEL[r]).join(', ') };
  return {
    user,
    actor,
    adminToken: session.adminToken,
    can: (a: keyof typeof PERMISSIONS) => canRole(user.roles, a),
    reason: (a: keyof typeof PERMISSIONS) => PERMISSIONS[a].reason,
  };
}
