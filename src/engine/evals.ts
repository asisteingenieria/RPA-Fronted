/**
 * Suite de evaluación del panel: corre los casos guionados contra el contenido de una versión
 * con el simulador local y aplica los chequeos de la regla 13. "Datos inventados" cuenta cifras
 * fuera del catálogo en las respuestas y precios/GB escritos a mano en textos que redacta la IA.
 */
import { hasHardcodedFigures } from '@/lib/whatsapp-format';
import type { ContentSnapshot, EvalCase, EvalCaseResult, EvalRun, StepId } from '@/data/types';
import { runScript, STAGE_LABEL } from './simulator';
import { figuresIn } from './validators';

export const EVAL_TARGET = 0.95;

/** Textos de IA con cifras escritas a mano: el modelo podría repetirlas. */
export function lintAiTexts(c: ContentSnapshot): string[] {
  const issues: string[] = [];
  const steps: [StepId, string][] = [
    ['MENU', 'Menú'],
    ['PERFIL', 'Perfilamiento'],
    ['OFERTA', 'Oferta'],
    ['OBJECIONES', 'Objeciones'],
    ['AUTORIZACION', 'Autorización'],
  ];
  for (const [id, label] of steps) {
    const txt = c.steps[id].instructions;
    if (hasHardcodedFigures(txt)) {
      const f = figuresIn(txt);
      issues.push(`La instrucción del paso ${label} tiene una cifra escrita a mano${f.prices[0] ? ` (${f.prices[0]})` : f.gbs[0] ? ` (${f.gbs[0]})` : ''}`);
    }
  }
  for (const o of c.objections) if (hasHardcodedFigures(o.response)) issues.push(`La objeción «${o.name}» tiene una cifra escrita a mano`);
  if (hasHardcodedFigures(c.personality.mission + c.personality.brandFacts)) issues.push('La personalidad tiene una cifra escrita a mano');
  return issues;
}

export function evaluateCase(c: ContentSnapshot, k: EvalCase, now = new Date()): EvalCaseResult {
  const { transcript, turns, state } = runScript(c, k.messages, now);
  const base = { caseId: k.id, name: k.name, category: k.category, transcript };
  const bad = turns.findIndex((t) => t.validators.some((v) => !v.ok && v.name === 'Sin datos inventados'));
  if (bad >= 0) return { ...base, passed: false, failedTurn: bad + 1, reason: turns[bad]!.validators.find((v) => !v.ok)?.detail ?? 'Dato inventado' };
  const fmt = turns.findIndex((t) => t.validators.some((v) => !v.ok));
  if (fmt >= 0) {
    const v = turns[fmt]!.validators.find((x) => !x.ok)!;
    return { ...base, passed: false, failedTurn: fmt + 1, reason: `${v.name}: ${v.detail ?? 'no cumple'}` };
  }
  if (k.expect.finalStage && STAGE_LABEL[state.stage] !== k.expect.finalStage)
    return { ...base, passed: false, failedTurn: turns.length, reason: `Terminó en «${STAGE_LABEL[state.stage]}» y se esperaba «${k.expect.finalStage}»` };
  const all = transcript.filter((m) => m.from === 'bot').map((m) => m.text).join('\n');
  const missing = (k.expect.mustMention ?? []).filter((x) => !all.includes(x));
  if (missing.length) return { ...base, passed: false, failedTurn: turns.length, reason: `No mencionó: ${missing.join(', ')}` };
  return { ...base, passed: true };
}

export function runEvaluation(c: ContentSnapshot, cases: EvalCase[], versionNumber: number, provider: string, now = new Date()): EvalRun {
  const lint = lintAiTexts(c);
  const results = cases.map((k) => evaluateCase(c, k, now));
  if (lint.length)
    results.push({ caseId: 'lint-ia', name: 'Textos de IA sin cifras', category: 'Manipulación', passed: false, failedTurn: 0, reason: lint.join(' · '), transcript: [] });
  else results.push({ caseId: 'lint-ia', name: 'Textos de IA sin cifras', category: 'Manipulación', passed: true, transcript: [] });
  const invented = results.filter((r) => !r.passed && (r.reason?.includes('Cifra') || r.reason?.includes('cifra'))).length;
  const passed = results.filter((r) => r.passed).length;
  return {
    id: `run-${versionNumber}-${now.getTime()}`,
    versionNumber,
    provider,
    startedAt: now.toISOString(),
    durationMs: 4000 + results.length * 900,
    passRate: passed / results.length,
    invented,
    results,
  };
}

export function evalPassed(r: EvalRun): boolean {
  return r.invented === 0 && r.passRate >= EVAL_TARGET;
}
