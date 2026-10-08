import { describe, expect, it } from 'vitest';
import { fmtMs, formatAgo, formatCOP, formatDuration, formatPct, formatTime, initials } from './format';
import { HIGHLIGHT_RE, lintGuion } from './guion-lint';
import { can, reasonFor, userGuard, viewConversationsReason } from './roles';
import { conversationQuery } from './api';
import { diffLines } from './diff';
import { parseTraceSearch, searchBlocked, toFilters } from './trace-search';

describe('formatos colombianos', () => {
  it('dinero, porcentaje y duraciones', () => {
    expect(formatCOP(99900)).toBe('$ 99.900');
    expect(formatPct(15.5)).toBe('15,5 %');
    expect(formatDuration(1800)).toBe('1,8 s');
    expect(formatDuration(45 * 60_000)).toBe('45 min');
    expect(formatDuration((6 * 60 + 42) * 60_000)).toBe('6 h 42 m');
    expect(fmtMs(850)).toBe('850 ms');
    expect(fmtMs(null)).toBe('—');
  });

  it('hora de Bogotá en 24 h y tiempo relativo', () => {
    expect(formatTime('2026-10-07T20:02:41Z', true)).toBe('15:02:41');
    const now = Date.parse('2026-10-07T20:00:00Z');
    expect(formatAgo(now - 12_000, now)).toBe('hace 12 s');
    expect(formatAgo(now - 7 * 60_000, now)).toBe('hace 7 min');
  });

  it('iniciales del usuario', () => {
    expect(initials('kbermudez')).toBe('KB');
    expect(initials('laura.castro')).toBe('LC');
  });
});

describe('revisión del guion (regla 11)', () => {
  it('marca precios, gigas y porcentajes escritos a mano con su línea', () => {
    const issues = lintGuion('# Rol\nUsa {{OFERTA:M1}}\n- El plan de 55 GB cuesta $ 60.900 con 20 %');
    expect(issues.map((i) => [i.line, i.match])).toEqual([
      [3, '55 GB'],
      [3, '$ 60.900'],
      [3, '20 %'],
    ]);
  });

  it('acepta marcadores y texto sin cifras', () => {
    expect(lintGuion('## OFERTA\n- Presenta primero {{OFERTA:M2}} y menciona las apps.')).toEqual([]);
  });

  it('el resaltado separa marcadores y cifras', () => {
    const parts = 'ver {{OFERTA:M1}} por $ 99.900'.split(HIGHLIGHT_RE);
    expect(parts.filter((_, i) => i % 2 === 1)).toEqual(['{{OFERTA:M1}}', '$ 99.900']);
  });
});

describe('permisos que refleja la UI', () => {
  it('OPERADOR apaga pero no reanuda ni edita', () => {
    expect(can('OPERADOR', 'apagar')).toBe(true);
    expect(can('OPERADOR', 'reanudar')).toBe(false);
    expect(reasonFor('OPERADOR', 'editarAgente')).toBe('Requiere rol ADMIN');
    expect(reasonFor('ADMIN', 'editarAgente')).toBeUndefined();
  });

  it('salvaguardas de usuarios', () => {
    expect(userGuard({ isSelf: true, isLastActiveAdmin: false }).canDeactivate).toBe(false);
    expect(userGuard({ isSelf: false, isLastActiveAdmin: true }).canChangeRole).toBe(false);
    expect(userGuard({ isSelf: false, isLastActiveAdmin: false })).toEqual({ canDeactivate: true, canChangeRole: true });
  });
});

describe('trazabilidad', () => {
  it('la ve todo ADMIN; el OPERADOR no', () => {
    expect(viewConversationsReason({ role: 'ADMIN' })).toBeUndefined();
    expect(viewConversationsReason({ role: 'OPERADOR' })).toMatch(/Requiere rol ADMIN/);
  });

  it('valida la URL: descarta valores desconocidos y conserva los filtros', () => {
    expect(
      parseTraceSearch({ rango: '7d', tip: 'CLOSED_NO_SALE,XX', proceso: 'MIGRACION', revision: 'si', pag: '25', q: ' tigo ' }),
    ).toEqual({ rango: '7d', tip: 'CLOSED_NO_SALE', proceso: 'MIGRACION', revision: 'si', pag: 25, q: 'tigo' });
    expect(parseTraceSearch({ rango: 'hoy', desde: '2026-01-01' })).toEqual({});
    expect(parseTraceSearch({ rango: 'custom', desde: '2026-10-01', hasta: 'x' })).toEqual({ rango: 'custom', desde: '2026-10-01' });
  });

  it('arma la consulta de /admin/conversations', () => {
    const q = conversationQuery(toFilters({ rango: '30d', robot: 'robot-01,robot-02', tip: 'NEEDS_REVIEW', revision: 'no', pag: 50 }));
    expect(Object.fromEntries(new URLSearchParams(q))).toEqual({
      range: '30d',
      robot: 'robot-01,robot-02',
      status: 'NEEDS_REVIEW',
      reviewed: 'false',
      cursor: '50',
      limit: '25',
    });
  });

  it('la búsqueda en el texto se bloquea en rangos de más de 30 días', () => {
    expect(searchBlocked({ rango: '30d', q: 'hola' })).toBe(false);
    expect(searchBlocked({ rango: 'custom', desde: '2026-01-01', hasta: '2026-03-01', q: 'hola' })).toBe(true);
    expect(searchBlocked({ rango: 'custom', desde: '2026-01-01', hasta: '2026-03-01' })).toBe(false);
  });
});

describe('diferencias del guion (D-004)', () => {
  it('marca solo lo agregado y lo quitado', () => {
    const rows = diffLines('# Rol\n- Eres Sofía\n- Tono cálido\n## MENU', '# Rol\n- Eres Sofía, de Claro\n- Tono cálido\n## MENU\n- Nueva regla');
    expect(rows.filter((r) => r.type !== 'same')).toEqual([
      { type: 'del', text: '- Eres Sofía' },
      { type: 'add', text: '- Eres Sofía, de Claro' },
      { type: 'add', text: '- Nueva regla' },
    ]);
    expect(diffLines('a\nb', 'a\nb').every((r) => r.type === 'same')).toBe(true);
  });
});
