/**
 * "Probar agente": turnos del motor real (máquina de estados, catálogo, plantillas y validadores)
 * en el worker, por /admin/agent/test. No toca Abaya ni guarda la conversación: el estado vive aquí.
 */
import { useCallback, useState } from 'react';
import { ApiError, api, errorMessage, type AgentFields, type AgentIssue, type AgentTestState } from '@/lib/api';
import { formatTime, fmtMs } from '@/lib/format';
import type { ChatItem, ReplyOrigin } from '@/components/rpa/agent/whatsapp-preview';

export type TestSource = 'editor' | 'published';

const EMPTY: AgentTestState = { stage: 'MENU', profile: {}, history: [] };

const ORIGIN: Record<string, ReplyOrigin> = {
  OK: 'modelo',
  REGENERATED: 'regenerado',
  FALLBACK: 'segura',
  NO_LLM: 'plantilla',
  PROVIDER_ERROR: 'error',
};

export const TERMINAL: Record<string, string> = {
  TRANSFERENCIA: 'transferida al backoffice',
  SOPORTE: 'redirigida a soporte (*611)',
  CIERRE_SIN_VENTA: 'cerrada sin venta',
  ESCALAR: 'escalada a un asesor humano',
};

export const PROFILE_LABEL: Record<string, string> = {
  process: 'Proceso',
  name: 'Nombre',
  currentOperator: 'Operador actual',
  usage: 'Uso',
  offeredPlanCode: 'Plan ofrecido',
  planCode: 'Plan aceptado',
};

function eventTone(text: string): 'ok' | 'info' | 'warn' {
  if (/consentimiento|transferencia/i.test(text)) return 'ok';
  if (/escalado|revisión/i.test(text)) return 'warn';
  return 'info';
}

export function useAgentTest({ defaultSource, onIssues }: { defaultSource: TestSource; onIssues: (i: AgentIssue[]) => void }) {
  const [source, setSourceState] = useState<TestSource>(defaultSource);
  const [state, setState] = useState<AgentTestState>(EMPTY);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  const reset = useCallback(() => {
    setState(EMPTY);
    setItems([]);
    setError(null);
  }, []);

  const setSource = useCallback(
    (s: TestSource) => {
      setSourceState(s);
      reset();
    },
    [reset],
  );

  const ended = state.stage in TERMINAL;

  const send = useCallback(
    async (message: string, fields: AgentFields) => {
      if (sending || ended) return;
      setError(null);
      const time = formatTime(new Date());
      setItems((x) => [...x, { kind: 'msg', from: 'client', text: message, time }]);
      setSending(true);
      try {
        const r = await api.testAgent({ source, ...(source === 'editor' ? { fields } : {}), state, message });
        const call = r.llm.at(-1);
        if (call) setProvider(`${call.provider} · ${call.model}`);
        const origin = ORIGIN[r.validation] ?? 'modelo';
        const meta = call ? `${call.model} · ${fmtMs(r.llm.reduce((a, c) => a + c.latencyMs, 0))}` : undefined;
        const at = formatTime(new Date());
        setItems((x) => [
          ...x,
          ...r.replies.map((t, i): ChatItem => ({
            kind: 'msg',
            from: 'bot',
            text: t,
            time: at,
            ...(i === r.replies.length - 1 ? { origin, ...(meta ? { meta } : {}) } : {}),
          })),
          ...r.events.map((t): ChatItem => ({ kind: 'event', text: t, tone: eventTone(t) })),
        ]);
        setState({
          stage: r.stage,
          profile: r.profile,
          history: [...state.history, { role: 'customer' as const, text: message }, ...r.replies.map((t) => ({ role: 'bot' as const, text: t }))].slice(-40),
        });
      } catch (err) {
        setItems((x) => x.slice(0, -1));
        if (err instanceof ApiError && err.issues) {
          onIssues(err.issues);
          setError('Lo que hay en el editor tiene errores de revisión: corrígelos en Configuración.');
        } else {
          setError(errorMessage(err, 'No se pudo correr la prueba.'));
        }
      } finally {
        setSending(false);
      }
    },
    [ended, onIssues, sending, source, state],
  );

  return { source, setSource, state, items, sending, error, ended, provider, reset, send };
}

export type AgentTest = ReturnType<typeof useAgentTest>;
