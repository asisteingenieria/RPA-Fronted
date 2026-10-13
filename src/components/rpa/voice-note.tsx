/**
 * Nota de voz del cliente (D-010): duración, estado de la transcripción y lo que se entendió.
 * Nunca un reproductor: el audio no se guarda. La usan Trazabilidad (conversación real) y Probar
 * agente (nota de prueba).
 */
import { AlertTriangle, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderWhatsApp } from '@/lib/text-format';
import { fmtMs } from '@/lib/format';
import type { TranscriptStatus } from '@/lib/api';
import { ICON } from './common';

/** Estado de la transcripción, siempre con texto (nunca solo color). */
export const TRANSCRIPT_LABEL: Record<TranscriptStatus, { label: string; warn: boolean }> = {
  PENDING: { label: 'transcribiendo…', warn: false },
  OK: { label: 'transcrita', warn: false },
  UNINTELLIGIBLE: { label: 'no se entendió', warn: true },
  TOO_LONG: { label: 'muy larga para transcribir', warn: true },
  FAILED: { label: 'error al transcribir', warn: true },
};

/** 8 → «8 s»; 72 → «1 min 12 s». */
export const audioLength = (sec: number) =>
  sec < 60 ? `${Math.round(sec)} s` : `${Math.floor(sec / 60)} min ${Math.round(sec % 60)} s`;

export function VoiceNote({
  durationSec,
  status,
  transcriptMs,
  text,
  missingText = '(no se pudo descifrar)',
}: {
  durationSec: number | null;
  status: TranscriptStatus;
  transcriptMs?: number | null;
  /** Transcripción (vacía si no se entendió o aún no está). */
  text: string;
  /** Qué decir si la nota quedó transcrita pero el texto no llegó. */
  missingText?: string;
}) {
  const st = TRANSCRIPT_LABEL[status] ?? { label: status, warn: true };
  return (
    <>
      <span className={cn('flex items-center gap-1 text-xs font-semibold', st.warn ? 'text-warning' : 'text-wa-meta')}>
        {st.warn ? (
          <AlertTriangle {...ICON} className="size-[13px] shrink-0" aria-hidden />
        ) : (
          <Mic {...ICON} className="size-[13px] shrink-0" aria-hidden />
        )}
        Nota de voz
        <span className="font-medium tabular-nums">
          · {durationSec !== null ? audioLength(durationSec) : '—'} · {st.label}
          {status === 'OK' && transcriptMs !== null && transcriptMs !== undefined && ` en ${fmtMs(transcriptMs)}`}
        </span>
      </span>
      {text ? (
        <span className="mt-0.5 block">{renderWhatsApp(text)}</span>
      ) : (
        status === 'OK' && <i className="mt-0.5 block text-wa-meta">{missingText}</i>
      )}
    </>
  );
}
