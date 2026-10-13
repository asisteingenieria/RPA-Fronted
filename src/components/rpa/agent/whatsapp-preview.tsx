/**
 * Chat de simulación (Agente → Probar agente). Es la ÚNICA vista con texto de mensajes: es texto de
 * prueba escrito en el panel, nunca datos reales de clientes.
 */
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  Info,
  Lock,
  Mic,
  Paperclip,
  Send,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderWhatsApp } from '@/lib/text-format';
import type { TranscriptStatus } from '@/lib/api';
import {
  MAX_RECORDING_SECONDS,
  WavRecorder,
  audioFileDuration,
  microphoneError,
  recordingBlockedReason,
} from '@/lib/voice-recorder';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Callout, ICON } from '../common';
import { VoiceNote, audioLength } from '../voice-note';
import mark from '@/assets/asiste-mark.png';

export type ReplyOrigin = 'plantilla' | 'modelo' | 'regenerado' | 'segura' | 'error';
export const ORIGIN_LABEL: Record<ReplyOrigin, string> = {
  plantilla: 'plantilla del sistema',
  modelo: 'modelo · validado',
  regenerado: 'modelo · regenerado 1 vez',
  segura: 'respuesta segura',
  error: 'proveedor con error',
};
const ORIGIN_CLS: Record<ReplyOrigin, string> = {
  plantilla: 'bg-cat-tyt-soft text-cat-tyt',
  modelo: 'bg-cat-tecnologia-soft text-cat-tecnologia',
  regenerado: 'bg-warning-soft text-warning',
  segura: 'bg-warning-soft text-warning',
  error: 'bg-danger-soft text-danger',
};

export type ChatItem =
  | {
      kind: 'msg';
      from: 'client' | 'bot';
      text: string;
      time: string;
      origin?: ReplyOrigin;
      meta?: string;
      /** D-010: nota de voz de prueba; `text` es lo que entendió el servidor. */
      voice?: { durationSec: number | null; status: TranscriptStatus; transcriptMs?: number | null };
      /** D-011: imagen de planes del catálogo; `text` es el texto que la acompaña. */
      image?: { url: string; sourceName: string; codes: string[] };
    }
  | { kind: 'event'; text: string; tone: 'ok' | 'info' | 'warn' };

/** Texto de un mensaje para guardar la prueba en el historial (notas de voz e imágenes en palabras). */
export function voiceTranscriptText(it: Extract<ChatItem, { kind: 'msg' }>): string {
  if (it.image) {
    const plans = it.image.codes.length ? ` (planes ${it.image.codes.join(', ')})` : '';
    return `🖼️ Imagen de planes «${it.image.sourceName}»${plans}${it.text ? `: ${it.text}` : ''}`;
  }
  if (!it.voice) return it.text;
  const len = it.voice.durationSec !== null ? ` (${audioLength(it.voice.durationSec)})` : '';
  return it.voice.status === 'OK' && it.text
    ? `🎤 Nota de voz${len}: «${it.text}»`
    : `🎤 Nota de voz${len}: no se pudo transcribir`;
}

/** Archivos que acepta el servidor (WhatsApp manda OGG/Opus). */
const AUDIO_ACCEPT = '.ogg,.opus,.mp3,.m4a,.aac,.wav,audio/ogg,audio/mpeg,audio/mp4,audio/aac,audio/wav';

const EVENT: Record<'ok' | 'info' | 'warn', { icon: LucideIcon; cls: string }> = {
  ok: { icon: CheckCircle2, cls: 'bg-success-soft text-success' },
  info: { icon: Info, cls: 'bg-primary-soft text-primary-soft-ink' },
  warn: { icon: AlertTriangle, cls: 'bg-warning-soft text-warning' },
};

interface Props {
  items: ChatItem[];
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  typing?: boolean;
  /** Aviso cuando la conversación terminó (transferencia, soporte, cierre, escalado). */
  lockedReason?: string;
  sending?: boolean;
  onSend?: (text: string) => void;
  /** D-010: enviar una nota de voz (grabada aquí o adjunta). Sin esto no hay botones de audio. */
  onSendAudio?: (audio: Blob, durationSec: number | null) => void;
  empty?: ReactNode;
  className?: string;
  height?: number;
}

export function WhatsAppPreview({
  items,
  title,
  subtitle = 'Simulación · no toca Abaya',
  badge,
  typing,
  lockedReason,
  sending,
  onSend,
  onSendAudio,
  empty,
  className,
  height = 560,
}: Props) {
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight });
  }, [items, typing]);
  let prev: string | null = null;

  return (
    <div className={cn('ai-wa flex min-w-0 flex-col overflow-hidden rounded-lg border bg-wa-wallpaper', className)} style={{ height }}>
      <div className="flex items-center gap-2.5 bg-wa-header px-3.5 py-2.5 text-wa-ink">
        <div className="grid size-[34px] shrink-0 place-items-center overflow-hidden rounded-full bg-surface-100">
          <img src={mark} alt="" className="w-[22px]" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[14.5px] leading-[18px] font-semibold">{title}</div>
          <div className="text-xs leading-[15px] text-wa-meta">{typing ? 'escribiendo…' : subtitle}</div>
        </div>
        {badge && <div className="ml-auto">{badge}</div>}
      </div>

      <div ref={body} className="flex flex-1 flex-col gap-1 overflow-auto px-4 py-3.5" aria-live="polite">
        {items.length === 0 && empty && <div className="m-auto max-w-[280px] text-center text-[13px] text-wa-meta">{empty}</div>}
        {items.map((it, i) => {
          if (it.kind === 'event') {
            prev = null;
            const E = EVENT[it.tone];
            return (
              <div key={i} className={cn('my-2 inline-flex items-center gap-1.5 self-center rounded-full px-3 py-[5px] font-sans text-xs leading-4 font-semibold shadow-[var(--shadow-bubble)]', E.cls)}>
                <E.icon {...ICON} className="size-[13px]" aria-hidden />
                {it.text}
              </div>
            );
          }
          const first = it.from !== prev;
          prev = it.from;
          return (
            <Fragment key={i}>
              <div className={cn('ai-wa-msg', it.from, first && i > 0 && 'first')}>
                <span className="sr-only">{it.from === 'client' ? 'Cliente: ' : 'Agente: '}</span>
                {it.image ? (
                  <>
                    <img
                      src={it.image.url}
                      alt={`Imagen de planes «${it.image.sourceName}»${it.image.codes.length ? `: planes ${it.image.codes.join(', ')}` : ''}`}
                      loading="lazy"
                      className="-mx-1 -mt-0.5 mb-1 block h-auto max-h-[320px] w-[calc(100%+8px)] max-w-none rounded-md bg-surface-100 object-contain"
                    />
                    {it.text && renderWhatsApp(it.text)}
                  </>
                ) : it.voice ? (
                  <VoiceNote
                    durationSec={it.voice.durationSec}
                    status={it.voice.status}
                    transcriptMs={it.voice.transcriptMs ?? null}
                    text={it.text}
                    missingText="(sin texto)"
                  />
                ) : (
                  renderWhatsApp(it.text)
                )}
                <span className="ai-wa-time">
                  {it.time}
                  {it.from === 'client' && <CheckCheck size={14} strokeWidth={1.75} aria-hidden />}
                </span>
              </div>
              {it.from === 'bot' && it.origin && (
                <div className="mx-0.5 my-0.5 inline-flex items-center gap-1.5 self-start font-sans text-[11px] leading-[14px] font-semibold text-wa-meta">
                  <span className={cn('rounded-full px-[7px] py-px', ORIGIN_CLS[it.origin])}>{ORIGIN_LABEL[it.origin]}</span>
                  {it.meta && <span>{it.meta}</span>}
                </div>
              )}
            </Fragment>
          );
        })}
        {typing && (
          <div className="ai-wa-msg bot first" aria-label="El agente está escribiendo">
            <span className="ai-typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>

      {lockedReason ? (
        <div className="bg-wa-header px-3 py-2.5">
          <Callout tone="info" icon={Lock}>
            {lockedReason}
          </Callout>
        </div>
      ) : (
        <Composer onSend={onSend} onSendAudio={onSendAudio} sending={sending} />
      )}
    </div>
  );
}

/** Tipo por extensión: Windows a veces entrega `.opus` o `.m4a` sin tipo. */
const MIME_BY_EXT: Record<string, string> = {
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
};
const MAX_AUDIO_FILE_BYTES = 4 * 1024 * 1024;

/** Botón redondo del compositor; deshabilitado con motivo (tooltip), nunca oculto. */
function WaButton({
  icon: I,
  label,
  reason,
  onClick,
  primary,
  type = 'button',
}: {
  icon: LucideIcon;
  label: string;
  reason?: string | null;
  onClick?: () => void;
  primary?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type={type}
          aria-label={label}
          aria-disabled={!!reason || undefined}
          onClick={(e) => {
            if (reason) e.preventDefault();
            else onClick?.();
          }}
          className={cn(
            'grid size-[38px] shrink-0 cursor-pointer place-items-center rounded-full aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
            primary ? 'bg-primary text-primary-foreground' : 'text-wa-meta hover:bg-wa-in',
          )}
        >
          <I {...ICON} className="size-4" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>{reason ? `${label}: ${reason}` : label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Caja para escribir como cliente y, si hay `onSendAudio` (D-010), grabar o adjuntar una nota de
 * voz: el servidor la transcribe con el mismo proveedor que atiende las notas reales.
 */
function Composer({
  onSend,
  onSendAudio,
  sending,
}: {
  onSend?: (text: string) => void;
  onSendAudio?: (audio: Blob, durationSec: number | null) => void;
  sending?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const recorder = useRef<WavRecorder | null>(null);
  const [draft, setDraft] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [blocked] = useState(() => (onSendAudio ? recordingBlockedReason() : null));
  const recording = startedAt !== null;
  const busy = sending ? 'Espera la respuesta del agente' : null;

  useEffect(() => {
    if (!sending && !recording) input.current?.focus({ preventScroll: true });
  }, [sending, recording]);

  const finish = async () => {
    const r = recorder.current;
    if (!r) return;
    recorder.current = null;
    setStartedAt(null);
    const rec = await r.stop();
    if (rec.durationSec < 0.5) {
      setAudioError('La nota quedó muy corta: graba al menos un segundo.');
      return;
    }
    onSendAudio?.(rec.blob, rec.durationSec);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // Cronómetro; al llegar al tope (el mismo del servidor) se envía sola.
  useEffect(() => {
    if (startedAt === null) return;
    const t = setInterval(() => {
      const s = (Date.now() - startedAt) / 1000;
      setElapsed(s);
      if (s >= MAX_RECORDING_SECONDS) void finishRef.current();
    }, 250);
    return () => clearInterval(t);
  }, [startedAt]);
  // Si el panel se cierra grabando, se suelta el micrófono.
  useEffect(() => () => void recorder.current?.cancel(), []);

  const start = async () => {
    setAudioError(null);
    const r = new WavRecorder();
    try {
      await r.start();
    } catch (err) {
      await r.cancel();
      setAudioError(microphoneError(err));
      return;
    }
    recorder.current = r;
    setElapsed(0);
    setStartedAt(Date.now());
  };
  const discard = async () => {
    const r = recorder.current;
    recorder.current = null;
    setStartedAt(null);
    await r?.cancel();
  };
  const attach = async (f: File) => {
    setAudioError(null);
    if (f.size > MAX_AUDIO_FILE_BYTES) {
      setAudioError('El archivo pesa más de 4 MB: usa una nota de voz más corta.');
      return;
    }
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    const type = f.type || MIME_BY_EXT[ext];
    if (!type) {
      setAudioError('Formato no aceptado: usa OGG, OPUS, MP3, M4A, AAC o WAV.');
      return;
    }
    onSendAudio?.(f.type ? f : new Blob([f], { type }), await audioFileDuration(f));
  };

  if (recording) {
    return (
      <div className="flex items-center gap-2 bg-wa-header px-2.5 py-2" role="group" aria-label="Grabando nota de voz">
        <WaButton icon={Trash2} label="Descartar nota de voz" onClick={() => void discard()} />
        <div className="flex h-[38px] min-w-0 flex-1 items-center gap-2 rounded-lg bg-wa-in px-3 text-sm text-wa-ink">
          <span className="size-2 shrink-0 rounded-full bg-danger" aria-hidden />
          <span className="truncate">
            Grabando · <span className="tabular-nums">{audioLength(elapsed)}</span>
            <span className="text-wa-meta"> de {audioLength(MAX_RECORDING_SECONDS)}</span>
          </span>
        </div>
        <WaButton icon={Send} label="Enviar nota de voz" primary onClick={() => void finish()} />
      </div>
    );
  }

  const text = draft.trim();
  return (
    <div className="bg-wa-header">
      {audioError && (
        <div className="px-2.5 pt-2">
          <Callout tone="warning">{audioError}</Callout>
        </div>
      )}
      <form
        className="flex items-center gap-2 px-2.5 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text && onSend && !sending) {
            onSend(text);
            setDraft('');
          }
        }}
      >
        {onSendAudio && (
          <>
            <WaButton
              icon={Paperclip}
              label="Adjuntar audio (OGG, MP3, M4A o WAV)"
              reason={busy}
              onClick={() => file.current?.click()}
            />
            <input
              ref={file}
              type="file"
              accept={AUDIO_ACCEPT}
              className="hidden"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void attach(f);
              }}
            />
          </>
        )}
        <input
          ref={input}
          className="h-[38px] min-w-0 flex-1 rounded-lg bg-wa-in px-3 text-sm text-wa-ink outline-none placeholder:text-wa-meta focus-visible:shadow-[0_0_0_2px_var(--focus-ring)]"
          value={draft}
          maxLength={2000}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={onSendAudio ? 'Escribe o graba como cliente…' : 'Escribe como cliente…'}
          aria-label="Mensaje del cliente de prueba"
          disabled={!onSend || sending}
        />
        {onSendAudio && !text ? (
          <WaButton icon={Mic} label="Grabar nota de voz" primary reason={busy ?? blocked} onClick={() => void start()} />
        ) : (
          <button
            type="submit"
            className="grid size-[38px] shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Enviar"
            disabled={!onSend || sending || !text}
          >
            <Send {...ICON} className="size-4" aria-hidden />
          </button>
        )}
      </form>
    </div>
  );
}
