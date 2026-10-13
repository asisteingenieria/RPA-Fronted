/**
 * Grabador de notas de voz para «Probar agente» (D-010). Graba en WAV PCM 16 bits, 16 kHz, mono:
 * lo entiende cualquier proveedor de voz a texto (el WebM de MediaRecorder no siempre) y pesa
 * ~32 KB/s (2 min ≈ 3,8 MB, bajo el tope del servidor). Sin librerías ni recursos externos.
 */

/** Igual que STT_MAX_SECONDS del servidor: más largas no se transcriben. */
export const MAX_RECORDING_SECONDS = 120;
const TARGET_RATE = 16_000;

export interface Recording {
  blob: Blob;
  durationSec: number;
}

/** Motivo por el que no se puede grabar aquí, o null si se puede. */
export function recordingBlockedReason(): string | null {
  if (typeof window === 'undefined') return 'No disponible';
  if (!window.isSecureContext) {
    return 'El navegador solo permite el micrófono con HTTPS (o en localhost). Puedes adjuntar un archivo de audio.';
  }
  if (!navigator.mediaDevices?.getUserMedia || !('AudioContext' in window)) {
    return 'Este navegador no permite grabar audio. Puedes adjuntar un archivo de audio.';
  }
  return null;
}

/** Mensaje en palabras para un error de getUserMedia. */
export function microphoneError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'No hay permiso para usar el micrófono. Actívalo en el candado de la barra de direcciones.';
  }
  if (name === 'NotFoundError') return 'No se encontró un micrófono en este equipo.';
  return 'No se pudo usar el micrófono.';
}

export class WavRecorder {
  private stream?: MediaStream;
  private ctx?: AudioContext;
  private node?: ScriptProcessorNode;
  private chunks: Float32Array[] = [];
  private rate = 48_000;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    this.ctx = new AudioContext();
    this.rate = this.ctx.sampleRate;
    const source = this.ctx.createMediaStreamSource(this.stream);
    // ScriptProcessor (y no AudioWorklet): no necesita cargar un módulo aparte, que la CSP del
    // panel (`script-src 'self'`) bloquearía si viniera de un blob.
    this.node = this.ctx.createScriptProcessor(4096, 1, 1);
    this.node.onaudioprocess = (e) => this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    source.connect(this.node);
    this.node.connect(this.ctx.destination);
  }

  /** Termina y devuelve el WAV. */
  async stop(): Promise<Recording> {
    const samples = merge(this.chunks);
    const rate = this.rate;
    await this.release();
    const pcm = downsample(samples, rate, TARGET_RATE);
    return { blob: encodeWav(pcm, TARGET_RATE), durationSec: pcm.length / TARGET_RATE };
  }

  /** Descarta lo grabado. */
  async cancel(): Promise<void> {
    await this.release();
  }

  private async release() {
    this.node?.disconnect();
    if (this.node) this.node.onaudioprocess = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close().catch(() => undefined);
    this.node = undefined;
    this.stream = undefined;
    this.ctx = undefined;
    this.chunks = [];
  }
}

function merge(chunks: Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

/** Promedio por bloques: suficiente para voz (no es audio de alta fidelidad). */
function downsample(input: Float32Array, from: number, to: number): Float32Array {
  if (from <= to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j]!;
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

export function encodeWav(samples: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true); // tamaño del bloque fmt
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); // bytes por segundo
  v.setUint16(32, 2, true); // bytes por muestra
  v.setUint16(34, 16, true); // bits
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

/**
 * Duración de un archivo de audio adjunto (null si el navegador no lo puede decodificar).
 * Se decodifica en memoria: un `<audio src="blob:…">` lo bloquearía la CSP del panel.
 */
export async function audioFileDuration(file: Blob): Promise<number | null> {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    return decoded.duration;
  } catch {
    return null;
  } finally {
    await ctx.close().catch(() => undefined);
  }
}
