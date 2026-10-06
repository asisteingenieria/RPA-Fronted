import { describe, expect, it } from 'vitest';
import { seedSnapshot } from '@/data/seed-content';
import { SEED_CASES, buildSeed } from '@/data/seed';
import { diffSnapshots, summarize } from '@/lib/content-diff';
import { evalPassed, runEvaluation } from './evals';
import { planLine } from './offer';
import { runScript } from './simulator';

const NOW = new Date('2026-10-06T15:00:00-05:00');

describe('simulador', () => {
  it('flujo feliz B: saludo con campaña, oferta del plan más caro y transferencia solo con la frase exacta', () => {
    const c = seedSnapshot();
    const { state, transcript } = runScript(c, ['hola', 'b', 'Laura', 'trabajo', 'sí', 'ok dale'], NOW);
    expect(transcript[1]!.text).toContain('arbolito');
    expect(transcript.some((m) => m.text.includes('*$ 99.900*'))).toBe(true);
    expect(state.stage).toBe('AUTORIZACION');
    const done = runScript(c, ['hola', 'b', 'Laura', 'trabajo', 'sí', 'SÍ AUTORIZO'], NOW);
    expect(done.state.stage).toBe('TRANSFERENCIA');
    expect(done.transcript.at(-1)!.text).toContain('Gracias, Laura');
  });

  it('opción A sin planes: transfiere sin inventar planes', () => {
    const { state, transcript } = runScript(seedSnapshot(), ['hola', 'a', 'Marta', 'otro', 'diario'], NOW);
    expect(state.stage).toBe('TRANSFERENCIA');
    expect(transcript.some((m) => m.text.includes('Un asesor te compartirá'))).toBe(true);
    expect(transcript.some((m) => /\$\s?\d/.test(m.text))).toBe(false);
  });

  it('segunda oferta: no repite el plan ofrecido y respeta el máximo', () => {
    const c = seedSnapshot();
    const { transcript } = runScript(c, ['hola', 'b', 'Laura', 'diario', 'no'], NOW);
    const second = transcript.at(-1)!.text;
    expect(second).not.toContain('99.900');
    expect(second.split('\n').filter((l) => l.startsWith('•')).length).toBeLessThanOrEqual(c.offer.maxSecondOffer);
  });

  it('línea de plan omite segmentos sin dato', () => {
    const m3 = seedSnapshot().plans.find((p) => p.code === 'M3')!;
    expect(planLine(m3, '• *[Datos]* + [GB compartir] para compartir | [Incluye] | *[Precio]* | [Descuento]')).toBe('• *45 GB* + 45 GB para compartir | *$ 44.900* | 25% CFM en mes 1 y 2');
  });

  it('una respuesta de IA que no pasa validación usa la respuesta segura', () => {
    const c = seedSnapshot();
    c.steps.PERFIL.questions[0]!.text = '¿Cómo te llamas? ¿Y de dónde eres?';
    const { transcript } = runScript(c, ['hola', 'b'], NOW);
    expect(transcript.at(-1)!.text).toContain('no te entendí bien');
  });
});

describe('evaluaciones', () => {
  it('el contenido semilla pasa la suite con 0 datos inventados', () => {
    const run = runEvaluation(seedSnapshot(), SEED_CASES, 12, 'test', NOW);
    const failed = run.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.reason}`);
    expect(failed).toEqual([]);
    expect(evalPassed(run)).toBe(true);
  });

  it('una cifra escrita a mano en una instrucción de IA hace fallar la evaluación', () => {
    const c = seedSnapshot();
    c.steps.OFERTA.instructions += ' Nunca digas que cuesta $ 89.900.';
    const run = runEvaluation(c, SEED_CASES, 0, 'test', NOW);
    expect(run.invented).toBeGreaterThan(0);
    expect(evalPassed(run)).toBe(false);
  });

  it('la semilla deja v9 fallida y v13 lista para aprobar', () => {
    const db = buildSeed();
    expect(db.evalRuns.find((r) => r.id === 'run-v9')!.invented).toBeGreaterThan(0);
    expect(evalPassed(db.evalRuns.find((r) => r.id === 'run-v13')!)).toBe(true);
    const v12 = db.versions.find((v) => v.number === 12)!;
    const changes = diffSnapshots(v12.snapshot, db.draft.snapshot);
    expect(changes.length).toBe(4);
    expect(summarize(changes).join(' · ')).toContain('precio de M2 cambió de $ 56.900 a $ 54.900');
  });
});
