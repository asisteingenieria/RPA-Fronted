import { createContext, useContext, useState, type ReactNode } from 'react';
import { can as canRole, PERMISSIONS, type Role } from '@/components/panel/navigation';
import type { User } from '@/data/types';
import type { Actor } from '@/data/store';

const KEY = 'panel-sofia:sesion';

export const ROLE_LABEL: Record<Role, string> = {
  operador: 'Operador',
  editor: 'Editor de contenido',
  aprobador: 'Aprobador',
  legal: 'Legal',
  administrador: 'Administrador',
};

interface Session {
  user: User;
  /** Token de la API de administración del robot (solo con VITE_ADMIN_API_URL). */
  adminToken?: string;
}

interface Ctx {
  session: Session | null;
  login: (s: Session) => void;
  logout: () => void;
}

const SessionCtx = createContext<Ctx>({ session: null, login: () => {}, logout: () => {} });

function read(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

/**
 * Sesión del panel. En producción la identidad viene del SSO corporativo (OIDC) y los permisos
 * los aplica el servidor; aquí se elige un usuario de demostración para recorrer los roles.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(read);
  const login = (s: Session) => {
    setSession(s);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      // sesión solo en memoria
    }
  };
  const logout = () => {
    setSession(null);
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // nada que limpiar
    }
  };
  return <SessionCtx.Provider value={{ session, login, logout }}>{children}</SessionCtx.Provider>;
}

export function useSessionCtx() {
  return useContext(SessionCtx);
}

/** Usuario actual (solo dentro del área autenticada). */
export function useUser() {
  const { session } = useContext(SessionCtx);
  if (!session) throw new Error('Sin sesión');
  const { user } = session;
  const actor: Actor = { name: user.name, role: user.roles.map((r) => ROLE_LABEL[r]).join(', ') };
  return {
    user,
    actor,
    adminToken: session.adminToken,
    can: (a: keyof typeof PERMISSIONS) => canRole(user.roles, a),
    reason: (a: keyof typeof PERMISSIONS) => PERMISSIONS[a].reason,
  };
}
