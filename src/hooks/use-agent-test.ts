/**
 * "Probar agente": turnos del motor real (máquina de estados, catálogo, plantillas y validadores)
 * en el worker, por /admin/agent/test. No toca Abaya ni guarda la conversación: el estado vive aquí.
 */
import { useCallback, useRef, useState } from 'react';
import {
  ApiError,
  api,
  errorMessage,
  type AgentFields,
  type AgentIssue,
  imageUrls,
  type AgentTestResult,
  type AgentTestState,
} from '@/lib/api';
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
  SOPORTE: 'cerrada después de darle los canales de atención (*611)',
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
  supportRedirected: 'Soporte',
  authorizationDeclined: 'Autorización',
  planImagesSent: 'Imágenes',
  planImagesRestSent: 'Más imágenes',
  // Datos del cliente tras el «SÍ» (la venta pasa cuando están los que pide el flujo).
  saleDocument: 'Documento',
  saleFullName: 'Nombre completo',
  saleEmail: 'Correo',
  salePhone: 'Celular',
};

/** Marcas del flujo (D-003) en palabras para «Estado de la simulación». */
export const PROFILE_FLAG_TEXT: Record<string, string> = {
  supportRedirected: 'Se le dieron los canales de atención; el chat sigue abierto',
  authorizationDeclined: 'No autorizó; se le ofreció un asesor',
  planImagesSent: 'Se le envió la imagen del plan más caro',
  planImagesRestSent: 'No aceptó el primero: se le enviaron las demás imágenes',
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
  // D-017: una sola apertura por conversación (los efectos pueden correr dos veces).
  const opened = useRef(false);

  const reset = useCallback(() => {
    opened.current = false;
    setState(EMPTY);
    setItems([]);
    setError(null);
  }, []);

  /**
   * D-017: como en un caso real, el robot abre la conversación con el saludo y el menú, sin que el
   * cliente escriba primero. Solo con el chat vacío y una vez por conversación.
   */
  const open = useCallback(
    async (fields: AgentFields) => {
      if (opened.current || sending || state.history.length) return;
      opened.current = true;
      setError(null);
      setSending(true);
      try {
        const r = await api.testAgent({ source, ...(source === 'editor' ? { fields } : {}), state, opening: true });
        const at = formatTime(new Date());
        setItems((x) => [...x, ...r.replies.map((t): ChatItem => ({ kind: 'msg', from: 'bot', text: t, time: at, origin: 'plantilla' }))]);
        setState({ stage: r.stage, profile: r.profile, history: r.replies.map((t) => ({ role: 'bot' as const, text: t })) });
      } catch (err) {
        if (err instanceof ApiError && err.issues) {
          onIssues(err.issues);
          setError('Lo que hay en el editor tiene errores de revisión: corrígelos en Configuración.');
        } else {
          setError(errorMessage(err, 'No se pudo abrir la conversación de prueba.'));
        }
      } finally {
        setSending(false);
      }
    },
    [onIssues, sending, source, state],
  );

  const setSource = useCallback(
    (s: TestSource) => {
      setSourceState(s);
      reset();
    },
    [reset],
  );

  const ended = state.stage in TERMINAL;

  /**
   * Un turno: pinta el mensaje del cliente, llama al servidor y agrega lo que respondería el robot.
   * `voice`: la nota de voz se sube primero y el servidor la transcribe con el proveedor real (D-010).
   */
  const turn = useCallback(
    async (fields: AgentFields, input: { message: string } | { audio: Blob; durationSec: number | null }) => {
      if (sending || ended) return;
      setError(null);
      const time = formatTime(new Date());
      const voice = 'audio' in input;
      setItems((x) => [
        ...x,
        voice
          ? { kind: 'msg', from: 'client', text: '', time, voice: { durationSec: input.durationSec, status: 'PENDING' } }
          : { kind: 'msg', from: 'client', text: input.message, time },
      ]);
      setSending(true);
      try {
        const base = { source, ...(source === 'editor' ? { fields } : {}), state };
        let r: AgentTestResult;
        if (voice) {
          const { audioId } = await api.uploadTestAudio(input.audio, input.durationSec);
          r = await api.testAgent({ ...base, audioId });
          const heard = r.heard;
          // La burbuja del cliente muestra lo que el servidor entendió.
          setItems((x) =>
            x.map((it, i) =>
              i === x.length - 1 && it.kind === 'msg' && it.voice
                ? {
                    ...it,
                    text: heard?.transcript ?? '',
                    voice: { ...it.voice, status: heard?.status ?? 'FAILED', transcriptMs: heard?.latencyMs ?? null },
                  }
                : it,
            ),
          );
        } else {
          r = await api.testAgent({ ...base, message: input.message });
        }
        const call = r.llm.at(-1);
        if (call) setProvider(`${call.provider} · ${call.model}`);
        const origin = ORIGIN[r.validation] ?? 'modelo';
        const meta = call ? `${call.model} · ${fmtMs(r.llm.reduce((a, c) => a + c.latencyMs, 0))}` : undefined;
        const at = formatTime(new Date());
        const images = r.images ?? [];
        const imageItem = (img: (typeof images)[number]): ChatItem => ({
          kind: 'msg',
          from: 'bot',
          text: img.caption ?? '',
          time: at,
          image: { url: imageUrls.version(img.brainId, img.version, img.imageId), sourceName: img.sourceName, codes: img.codes },
          origin: 'plantilla',
          meta: `Imagen del catálogo v${img.version}`,
        });
        // D-011: cada imagen va después de `afterReply` mensajes de texto del turno.
        const replies = r.replies.flatMap((t, i): ChatItem[] => [
          ...images.filter((img) => img.afterReply === i).map(imageItem),
          {
            kind: 'msg',
            from: 'bot',
            text: t,
            time: at,
            ...(i === r.replies.length - 1 ? { origin, ...(meta ? { meta } : {}) } : {}),
          },
        ]);
        setItems((x) => [
          ...x,
          ...replies,
          ...images.filter((img) => img.afterReply >= r.replies.length).map(imageItem),
          ...(images.length
            ? [{ kind: 'event', text: 'Imágenes de planes: en Abaya el robot las pega con su texto (activo con SEND_PLAN_IMAGES=true)', tone: 'info' } as ChatItem]
            : []),
          ...r.events.map((t): ChatItem => ({ kind: 'event', text: t, tone: eventTone(t) })),
        ]);
        const customer = r.customerText ?? (voice ? '' : input.message);
        setState({
          stage: r.stage,
          profile: r.profile,
          history: [
            ...state.history,
            ...(customer ? [{ role: 'customer' as const, text: customer }] : []),
            ...r.replies.map((t) => ({ role: 'bot' as const, text: t })),
            // Como en producción, la imagen queda en el historial con el texto que la acompaña.
            ...images.flatMap((img) => (img.caption ? [{ role: 'bot' as const, text: img.caption }] : [])),
          ].slice(-40),
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

  const send = useCallback((message: string, fields: AgentFields) => turn(fields, { message }), [turn]);
  const sendAudio = useCallback(
    (audio: Blob, durationSec: number | null, fields: AgentFields) => turn(fields, { audio, durationSec }),
    [turn],
  );

  return { source, setSource, state, items, sending, error, ended, provider, reset, open, send, sendAudio };
}

export type AgentTest = ReturnType<typeof useAgentTest>;
