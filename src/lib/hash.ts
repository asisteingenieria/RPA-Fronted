/**
 * Huella encadenada de la auditoría (FNV-1a 64 bits). En el panel de demostración basta para
 * mostrar la cadena; la cadena real (SHA-256) la calcula y verifica el servidor.
 */
export function fnv64(input: string): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < input.length; i++) {
    h ^= BigInt(input.charCodeAt(i));
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, '0');
}

export function chainHash(prev: string, entry: object): string {
  return fnv64(prev + JSON.stringify(entry));
}
