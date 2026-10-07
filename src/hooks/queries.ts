import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage, type Overview, type Range } from '@/lib/api';

/** En vivo y Robots se refrescan cada 10 s; React Query lo pausa con la pestaña oculta. */
export const LIVE_MS = 10_000;

export const keys = {
  overview: ['overview'] as const,
  review: ['review'] as const,
  audit: ['audit'] as const,
  users: ['users'] as const,
  robots: (range: Range) => ['robots', range] as const,
  robot: (robotUser: string, range: Range) => ['robot', robotUser, range] as const,
  traces: (robotUser: string) => ['traces', robotUser] as const,
  agent: ['agent'] as const,
  agentVersions: ['agent-versions'] as const,
};

export const useOverview = () => useQuery({ queryKey: keys.overview, queryFn: api.overview, refetchInterval: LIVE_MS });
export const useReview = () => useQuery({ queryKey: keys.review, queryFn: api.review, refetchInterval: LIVE_MS });
export const useRobots = (range: Range) =>
  useQuery({ queryKey: keys.robots(range), queryFn: () => api.robots(range), refetchInterval: LIVE_MS });

/** Apagado de emergencia / reanudar (kill switch global en Redis). */
export function useKillSwitch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (active: boolean) => api.setKillSwitch(active),
    onSuccess: (r) => {
      qc.setQueryData<Overview>(keys.overview, (o) => (o ? { ...o, killSwitch: r.killSwitch } : o));
      void qc.invalidateQueries({ queryKey: keys.overview });
      toast.success(r.killSwitch ? 'Robot detenido' : 'Robot reanudado');
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo cambiar el estado del robot.')),
  });
}

/** Re-render periódico para textos relativos ("hace 12 s"). */
export function useNow(everyMs = 5_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}
