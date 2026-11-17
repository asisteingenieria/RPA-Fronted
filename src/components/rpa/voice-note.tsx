/**
 * Nota de voz del cliente (D-010): duración, estado de la transcripción y lo que se entendió.
 * D-047: también la imagen o el sticker que mandó el cliente, con su descripción automática.
 * Nunca un reproductor ni la imagen: el archivo no se guarda. La usan Trazabilidad (conversación
 * real), el monitor en vivo y Probar agente (nota de prueba).
 */
import { AlertTriangle, Camera, Mic } from 'lucide-react';
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

/** D-047: estado de la descripción de una imagen del cliente. */
export const IMAGE_LABEL: Record<TranscriptStatus, { label: string; warn: boolean }> = {
  PENDING: { label: 'describiendo…', warn: false },
  OK: { label: 'descrita', warn: false },
  UNINTELLIGIBLE: { label: 'no se pudo ver', warn: true },
  TOO_LONG: { label: 'muy grande', warn: true },
  FAILED: { label: 'no se pudo descargar ni describir', warn: true },
};

/** 8 → «8 s»; 72 → «1 min 12 s». */
export const audioLength = (sec: number) =>
  sec < 60 ? `${Math.round(sec)} s` : `${Math.floor(sec / 60)} min ${Math.round(sec % 60)} s`;

export function VoiceNote({
  kind = 'AUDIO',
  durationSec,
  status,
  transcriptMs,
  text,
  missingText = '(no se pudo descifrar)',
}: {
  /** D-047: nota de voz o imagen del cliente. */
  kind?: 'AUDIO' | 'IMAGE';
  durationSec: number | null;
  status: TranscriptStatus;
  transcriptMs?: number | null;
  /** Transcripción o descripción (vacía si no se entendió o aún no está). */
  text: string;
  /** Qué decir si quedó transcrita o descrita pero el texto no llegó. */
  missingText?: string;
}) {
  const image = kind === 'IMAGE';
  const st = (image ? IMAGE_LABEL : TRANSCRIPT_LABEL)[status] ?? { label: status, warn: true };
  const Icon = st.warn ? AlertTriangle : image ? Camera : Mic;
  return (
    <>
      <span className={cn('flex items-center gap-1 text-xs font-semibold', st.warn ? 'text-warning' : 'text-wa-meta')}>
        <Icon {...ICON} className="size-[13px] shrink-0" aria-hidden />
        {image ? 'Imagen' : 'Nota de voz'}
        <span className="font-medium tabular-nums">
          {!image && ` · ${durationSec !== null ? audioLength(durationSec) : '—'}`} · {st.label}
          {status === 'OK' && transcriptMs !== null && transcriptMs !== undefined && ` en ${fmtMs(transcriptMs)}`}
        </span>
      </span>
      {text ? (
        image ? (
          // La descripción la escribió el modelo, no el cliente: se marca como tal.
          <span className="mt-0.5 block">
            <span className="text-wa-meta">Descripción automática: </span>
            <i>{text}</i>
          </span>
        ) : (
          <span className="mt-0.5 block">{renderWhatsApp(text)}</span>
        )
      ) : (
        status === 'OK' && <i className="mt-0.5 block text-wa-meta">{missingText}</i>
      )}
    </>
  );
}
