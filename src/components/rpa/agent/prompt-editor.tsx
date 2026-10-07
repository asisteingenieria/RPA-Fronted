/**
 * Editor del guion (el prompt completo del agente), en Markdown, máx. 30 000 caracteres.
 * <textarea> real (accesible, con deshacer nativo) sobre una capa de resaltado sincronizada:
 * títulos de etapa, marcadores {{OFERTA:…}} y cifras escritas a mano (errores).
 */
import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import { Code, Copy, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { estimateTokens, focusLine, GUION_MAX_CHARS, HIGHLIGHT_RE, insertAtCursor } from '@/lib/guion-lint';
import { Markdown } from '@/lib/text-format';
import { ICON, IconAction, Segmented } from '../common';

export interface PromptEditorHandle {
  insert: (snippet: string) => void;
  goToLine: (line: number) => void;
}

export interface EditorIssue {
  line?: number;
  match?: string;
  message: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  readOnlyReason?: string;
  mode: 'md' | 'preview';
  onModeChange: (m: 'md' | 'preview') => void;
  /** Fila de ajustes sobre el editor (modelo, temperatura, idioma). */
  toolbar?: ReactNode;
  issues: EditorIssue[];
  maxChars?: number;
  height?: number;
}

function HighlightLine({ text }: { text: string }) {
  if (/^#{1,2}\s/.test(text)) return <span className="h2">{text}</span>;
  const parts = text.split(HIGHLIGHT_RE);
  return (
    <>
      {parts.map((s, i) =>
        i % 2 === 0 ? (
          s
        ) : s.startsWith('{{') ? (
          <span key={i} className="mk">
            {s}
          </span>
        ) : (
          <span key={i} className="err">
            {s}
          </span>
        ),
      )}
      {text === '' ? ' ' : null}
    </>
  );
}

export const PromptEditor = forwardRef<PromptEditorHandle, Props>(function PromptEditor(p, ref) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const hl = useRef<HTMLDivElement>(null);
  const max = p.maxChars ?? GUION_MAX_CHARS;
  const badLines = new Set(p.issues.map((i) => i.line).filter((l): l is number => !!l));
  const lines = p.value.split('\n');
  const height = p.height ?? 560;

  const goTo = (line: number) => {
    if (p.mode !== 'md') p.onModeChange('md');
    requestAnimationFrame(() => ta.current && focusLine(ta.current, line));
  };

  useImperativeHandle(ref, () => ({
    insert(snippet) {
      if (!ta.current || p.readOnly) return;
      const { value, cursor } = insertAtCursor(ta.current, snippet);
      p.onChange(value);
      requestAnimationFrame(() => {
        ta.current?.focus();
        ta.current?.setSelectionRange(cursor, cursor);
      });
    },
    goToLine: goTo,
  }));

  const font = 'font-mono text-[13px] leading-[21px]';

  return (
    <section className="flex min-w-0 flex-col rounded-lg border bg-surface-100 shadow-card">
      <div className="flex flex-wrap items-center gap-2.5 border-b px-4 py-3">
        <FileText {...ICON} className="size-[18px] text-primary-soft-ink" aria-hidden />
        <h2 className="m-0 font-display text-[15px] leading-5 font-semibold text-ink">Guion del agente</h2>
        <span className="inline-flex h-6 items-center rounded-full bg-surface-200 px-2.5 text-xs font-medium text-ink-muted">Markdown</span>
        <div className="ml-auto flex items-center gap-2">
          <Segmented
            label="Modo del editor"
            value={p.mode}
            onChange={p.onModeChange}
            items={[
              { id: 'preview', label: 'Vista previa', icon: Eye },
              { id: 'md', label: 'Markdown', icon: Code },
            ]}
          />
          <IconAction
            icon={Copy}
            label="Copiar guion"
            onClick={() => void navigator.clipboard?.writeText(p.value).then(() => toast.success('Guion copiado'))}
          />
        </div>
      </div>
      {p.toolbar}

      {p.mode === 'preview' ? (
        <div className="overflow-auto bg-code-bg px-5 py-4 text-sm leading-[22px]" style={{ height }}>
          <Markdown source={p.value} />
        </div>
      ) : (
        <div className="relative overflow-hidden bg-code-bg" style={{ height }}>
          <div ref={hl} aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden py-2.5 text-ink [scrollbar-gutter:stable]', font)}>
            {lines.map((l, i) => (
              <div key={i} className={cn('ai-code-row', badLines.has(i + 1) && 'is-errline')}>
                <span className={cn('ai-code-n', badLines.has(i + 1) && 'is-err')}>{i + 1}</span>
                <div>
                  <HighlightLine text={l} />
                </div>
              </div>
            ))}
          </div>
          <textarea
            ref={ta}
            value={p.value}
            readOnly={p.readOnly}
            onChange={(e) => p.onChange(e.target.value)}
            onScroll={() => {
              if (ta.current && hl.current) hl.current.scrollTop = ta.current.scrollTop;
            }}
            spellCheck={false}
            maxLength={max}
            aria-label="Guion del agente"
            aria-invalid={p.issues.length > 0 || undefined}
            aria-describedby={p.issues.length ? 'guion-errores' : undefined}
            className={cn(
              'absolute inset-0 m-0 size-full resize-none [scrollbar-gutter:stable] border-0 bg-transparent py-2.5 pr-4 pl-14 break-words whitespace-pre-wrap text-transparent caret-ink outline-none [overflow-wrap:anywhere] focus-visible:shadow-[inset_0_0_0_2px_var(--focus-ring)]',
              font,
            )}
          />
        </div>
      )}

      {p.issues.length > 0 && (
        <div id="guion-errores" role="alert" className="flex flex-col gap-1.5 border-t border-danger bg-danger-soft px-4 py-2.5 text-[13px] text-danger">
          <b>{p.issues.length === 1 ? '1 error impide guardar' : `${p.issues.length} errores impiden guardar`}</b>
          {p.issues.map((e, i) => (
            <div key={i}>
              {e.line ? (
                <button type="button" className="cursor-pointer font-bold underline" onClick={() => goTo(e.line!)}>
                  Línea {e.line}
                </button>
              ) : (
                <b>Guion</b>
              )}
              {e.match ? ` · “${e.match}”: ${e.message}` : `: ${e.message}`}
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3.5 border-t px-4 py-2.5 text-xs leading-4 font-medium text-ink-subtle tabular-nums">
        <span>{estimateTokens(p.value).toLocaleString('es-CO')} tokens</span>
        <span className={cn(p.value.length > max * 0.95 && 'text-warning')}>
          {p.value.length.toLocaleString('es-CO')} / {max.toLocaleString('es-CO')} caracteres
        </span>
        <span className="ml-auto">{p.readOnly ? (p.readOnlyReason ?? 'Solo lectura') : 'Revisión en vivo activa'}</span>
      </div>
    </section>
  );
});
