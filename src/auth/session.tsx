import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ApiError, api, type Me } from '@/lib/api';

/**
 * Sesión del panel: la valida el servidor (cookie httpOnly de 8 h, 30 min de inactividad). Aquí solo
 * se pregunta quién soy (/admin/auth/me). Un 401 en cualquier consulta vuelve al ingreso (main.tsx).
 */
export const ME_KEY = ['me'] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async (): Promise<Me | null> => {
      try {
        return await api.me();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: Infinity,
  });
}

/** Usuario con sesión (solo dentro del shell autenticado). */
export function useUser(): Me {
  const { data } = useMe();
  if (!data) throw new Error('useUser fuera de una sesión');
  return data;
}

export function useSessionActions() {
  const qc = useQueryClient();
  const setMe = useCallback((me: Me | null) => qc.setQueryData(ME_KEY, me), [qc]);
  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    qc.clear();
    qc.setQueryData(ME_KEY, null);
  }, [qc]);
  return { setMe, logout };
}
