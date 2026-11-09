/**
 * "Probar agente": turnos del motor real (máquina de estados, catálogo, plantillas y validadores)
 * en el worker, por /admin/agent/test. No toca Avaya ni guarda la conversación: el estado vive aquí.
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

/**
 * D-034: como en Avaya, el cliente puede escribir varios mensajes seguidos. El robot espera
 * BURST_QUIET_MS sin mensajes nuevos (como BURST_QUIET_MS del worker) y los responde juntos; si
 * escribe mientras se arma la respuesta, esa respuesta se descarta y se rehace con todos (hasta
 * SUPERSEDE_MAX_MS desde el primero sin respuesta).
 */
const BURST_QUIET_MS = 4_000;
const SUPERSEDE_MAX_MS = 45_000;

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
  // D-035: sentimiento del cliente (solo medición).
  sentiment: 'Sentimiento',
  sentimentWorst: 'Sentimiento (el peor)',
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
  // D-034: mensajes del cliente que esperan respuesta (ráfaga) y el turno en curso.
  const [queued, setQueued] = useState(0);
  const queue = useRef<{ texts: string[]; firstAt: number }>({ texts: [], firstAt: 0 });
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldsRef = useRef<AgentFields | null>(null);
  const stateRef = useRef<AgentTestState>(EMPTY);
  stateRef.current = state;
  // Una respuesta que llega después de reiniciar la prueba se ignora.
  const generation = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  // D-017: una sola apertura por conversación (los efectos pueden correr dos veces).
  const opened = useRef(false);

  const reset = useCallback(() => {
    opened.current = false;
    generation.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    queue.current = { texts: [], firstAt: 0 };
    setQueued(0);
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

  /** Pinta lo que respondió el robot y avanza el estado de la simulación. */
  const apply = (r: AgentTestResult, customer: string) => {
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
        ? [{ kind: 'event', text: 'Imágenes de planes: en Avaya el robot las pega con su texto (activo con SEND_PLAN_IMAGES=true)', tone: 'info' } as ChatItem]
        : []),
      ...r.events.map((t): ChatItem => ({ kind: 'event', text: t, tone: eventTone(t) })),
    ]);
    const said = r.customerText ?? customer;
    const next: AgentTestState = {
      stage: r.stage,
      profile: r.profile,
      history: [
        ...stateRef.current.history,
        ...(said ? [{ role: 'customer' as const, text: said }] : []),
        ...r.replies.map((t) => ({ role: 'bot' as const, text: t })),
        // Como en producción, la imagen queda en el historial con el texto que la acompaña.
        ...images.flatMap((img) => (img.caption ? [{ role: 'bot' as const, text: img.caption }] : [])),
      ].slice(-40),
    };
    stateRef.current = next;
    setState(next);
  };

  const failed = (err: unknown) => {
    if (err instanceof ApiError && err.issues) {
      onIssues(err.issues);
      setError('Lo que hay en el editor tiene errores de revisión: corrígelos en Configuración.');
    } else {
      setError(errorMessage(err, 'No se pudo correr la prueba.'));
    }
  };

  /** D-034: responde la ráfaga de mensajes escritos (un turno a la vez). */
  const flush = async () => {
    if (inFlight.current || !queue.current.texts.length || !fieldsRef.current) return;
    const { texts: batch, firstAt } = queue.current;
    queue.current = { texts: [], firstAt: 0 };
    const gen = generation.current;
    inFlight.current = true;
    setSending(true);
    try {
      const message = batch.join('\n');
      const r = await api.testAgent({
        source,
        ...(source === 'editor' ? { fields: fieldsRef.current } : {}),
        state: stateRef.current,
        message,
      });
      if (gen !== generation.current) return;
      if (queue.current.texts.length && Date.now() - firstAt < SUPERSEDE_MAX_MS) {
        // Escribió otra vez mientras el robot armaba la respuesta: se rehace con todo.
        queue.current = { texts: [...batch, ...queue.current.texts], firstAt };
        setItems((x) => [
          ...x,
          {
            kind: 'event',
            text: 'El cliente escribió de nuevo: el robot descarta esa respuesta y responde todos los mensajes juntos',
            tone: 'info',
          },
        ]);
        return;
      }
      apply(r, message);
    } catch (err) {
      if (gen === generation.current) failed(err);
    } finally {
      inFlight.current = false;
      setSending(false);
      if (gen === generation.current) {
        setQueued(queue.current.texts.length);
        // Si la espera ya pasó mientras respondía, sigue de una vez con lo pendiente.
        if (queue.current.texts.length && !timer.current) void flushRef.current();
      }
    }
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;

  /** Mensaje escrito: se pinta de una vez y espera BURST_QUIET_MS por si el cliente sigue escribiendo. */
  const send = useCallback(
    (message: string, fields: AgentFields) => {
      if (ended) return;
      setError(null);
      setItems((x) => [...x, { kind: 'msg', from: 'client', text: message, time: formatTime(new Date()) }]);
      fieldsRef.current = fields;
      if (!queue.current.texts.length) queue.current.firstAt = Date.now();
      queue.current.texts.push(message);
      setQueued(queue.current.texts.length);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void flushRef.current();
      }, BURST_QUIET_MS);
    },
    [ended],
  );

  /** Nota de voz (D-010): se sube y el servidor la transcribe con el proveedor real; va sola. */
  const sendAudio = useCallback(
    async (audio: Blob, durationSec: number | null, fields: AgentFields) => {
      if (inFlight.current || queue.current.texts.length || ended) return;
      setError(null);
      const time = formatTime(new Date());
      setItems((x) => [...x, { kind: 'msg', from: 'client', text: '', time, voice: { durationSec, status: 'PENDING' } }]);
      const gen = generation.current;
      inFlight.current = true;
      setSending(true);
      try {
        const { audioId } = await api.uploadTestAudio(audio, durationSec);
        const r = await api.testAgent({ source, ...(source === 'editor' ? { fields } : {}), state: stateRef.current, audioId });
        if (gen !== generation.current) return;
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
        apply(r, '');
      } catch (err) {
        if (gen !== generation.current) return;
        setItems((x) => x.slice(0, -1));
        failed(err);
      } finally {
        inFlight.current = false;
        setSending(false);
      }
    },
    [ended, onIssues, source],
  );

  // `queued`: mensajes escritos que esperan respuesta (la nota de voz espera a que se respondan).
  return { source, setSource, state, items, sending, queued: queued > 0, error, ended, provider, reset, open, send, sendAudio };
}

export type AgentTest = ReturnType<typeof useAgentTest>;
