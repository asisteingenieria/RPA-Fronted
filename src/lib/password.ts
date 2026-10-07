/**
 * Contraseñas del panel: PBKDF2-SHA256 con sal aleatoria (WebCrypto). Nunca se guarda ni se registra
 * la contraseña en claro. En producción esto lo hace el servidor (o el SSO corporativo).
 */
const ITERATIONS = 210_000;
const enc = new TextEncoder();

const toB64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export interface PasswordHash {
  hash: string;
  salt: string;
  iterations: number;
}

export async function hashPassword(password: string, salt?: string, iterations = ITERATIONS): Promise<PasswordHash> {
  const saltBytes = salt ? fromB64(salt) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations }, key, 256);
  return { hash: toB64(bits), salt: toB64(saltBytes), iterations };
}

/** Comparación en tiempo constante. */
export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const { hash } = await hashPassword(password, stored.salt, stored.iterations);
  const a = fromB64(hash);
  const b = fromB64(stored.hash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** Política: mínimo 10 caracteres, con letras y números. */
export function passwordIssues(pw: string): string[] {
  const out: string[] = [];
  if (pw.length < 10) out.push('Mínimo 10 caracteres');
  if (!/[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(pw)) out.push('Debe tener letras');
  if (!/\d/.test(pw)) out.push('Debe tener números');
  return out;
}

/** Contraseña temporal aleatoria (se muestra una sola vez al administrador). */
export function generateTempPassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (const b of bytes) out += chars[b % chars.length];
  // Garantiza letras y números para cumplir la política.
  return /\d/.test(out) && /[A-Za-z]/.test(out) ? out : generateTempPassword(length);
}
