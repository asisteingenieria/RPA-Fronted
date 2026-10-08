/** Diferencias línea a línea entre dos textos (LCS). Para comparar versiones del guion. */
export interface DiffRow {
  type: 'same' | 'add' | 'del';
  text: string;
}

export function diffLines(before: string, after: string): DiffRow[] {
  const a = before.replace(/\r\n/g, '\n').split('\n');
  const b = after.replace(/\r\n/g, '\n').split('\n');
  // Prefijo y sufijo comunes: lo usual es que cambien pocas líneas en el medio.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;
  // Tabla LCS (el guion tiene como mucho unas centenas de líneas).
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] = midA[i] === midB[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const mid: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (midA[i] === midB[j]) {
      mid.push({ type: 'same', text: midA[i]! });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      mid.push({ type: 'del', text: midA[i++]! });
    } else {
      mid.push({ type: 'add', text: midB[j++]! });
    }
  }
  while (i < n) mid.push({ type: 'del', text: midA[i++]! });
  while (j < m) mid.push({ type: 'add', text: midB[j++]! });
  return [
    ...a.slice(0, start).map((text) => ({ type: 'same' as const, text })),
    ...mid,
    ...a.slice(endA).map((text) => ({ type: 'same' as const, text })),
  ];
}
