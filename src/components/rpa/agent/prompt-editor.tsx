/**
 * Editor del guion (el prompt completo del agente), en Markdown, máx. 30 000 caracteres.
 * Se ve como el editor de agentes de texto de Dapta: «Vista previa | Markdown» y una barra de
 * formato (títulos, negrita, listas, sangría, código, cita y marcador de plan).
 * <textarea> real (accesible, con deshacer nativo) sobre una capa de resaltado sincronizada:
 * títulos, marcadores {{OFERTA:…}} y cifras escritas a mano (errores).
 */
import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import { Copy, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { estimateTokens, focusLine, GUION_MAX_CHARS, HIGHLIGHT_RE, insertAtCursor } from '@/lib/guion-lint';
import { Markdown } from '@/lib/text-format';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ICON, IconAction } from '../common';

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
  /** Alto mínimo del área de texto; el editor crece hasta el alto de su fila. */
  minHeight?: number;
}

/* ───── Resaltado del modo Markdown ───── */
function HighlightLine({ text }: { text: string }) {
  const heading = /^(#{1,4})\s/.exec(text);
  if (heading) return <span className={cn('md-h', `md-h${heading[1]!.length}`)}>{text}</span>;
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

/* ───── Barra de formato ───── */
type Edit = { value: string; start: number; end: number };
type Tool = { id: string; label: string; text: ReactNode; apply: (v: string, s: number, e: number) => Edit };

/** Aplica `fn` a cada línea tocada por la selección y conserva la selección sobre esas líneas. */
function mapLines(v: string, s: number, e: number, fn: (line: string, i: number, all: string[]) => string): Edit {
  const from = v.lastIndexOf('\n', s - 1) + 1;
  const toIdx = v.indexOf('\n', e > s && v[e - 1] === '\n' ? e - 1 : e);
  const to = toIdx === -1 ? v.length : toIdx;
  const lines = v.slice(from, to).split('\n');
  const out = lines.map((l, i) => fn(l, i, lines)).join('\n');
  return { value: v.slice(0, from) + out + v.slice(to), start: from, end: from + out.length };
}

function wrap(v: string, s: number, e: number, mark: string, placeholder: string): Edit {
  const sel = v.slice(s, e) || placeholder;
  const value = v.slice(0, s) + mark + sel + mark + v.slice(e);
  return { value, start: s + mark.length, end: s + mark.length + sel.length };
}

const heading = (n: number) => (v: string, s: number, e: number) =>
  mapLines(v, s, e, (l) => {
    const m = /^(#{1,6})\s+/.exec(l);
    const body = m ? l.slice(m[0].length) : l;
    return m && m[1]!.length === n ? body : `${'#'.repeat(n)} ${body}`;
  });

const TOOLS: Tool[][] = [
  [
    { id: 'h1', label: 'Título 1', text: 'H1', apply: heading(1) },
    { id: 'h2', label: 'Título 2', text: 'H2', apply: heading(2) },
    { id: 'h3', label: 'Título 3', text: 'H3', apply: heading(3) },
    { id: 'h4', label: 'Título 4', text: 'H4', apply: heading(4) },
  ],
  [
    { id: 'b', label: 'Negrita (Ctrl+B)', text: <b>B</b>, apply: (v, s, e) => wrap(v, s, e, '**', 'texto') },
    {
      id: 'ul',
      label: 'Lista con viñetas',
      text: '•',
      apply: (v, s, e) =>
        mapLines(v, s, e, (l) => {
          const m = /^(\s*)[-*]\s+(.*)$/.exec(l);
          return m ? `${m[1]}${m[2]}` : l.replace(/^(\s*)/, '$1- ');
        }),
    },
    {
      id: 'ol',
      label: 'Lista numerada',
      text: '1.',
      apply: (v, s, e) =>
        mapLines(v, s, e, (l, i) => {
          const m = /^(\s*)\d+[.)]\s+(.*)$/.exec(l);
          return m ? `${m[1]}${m[2]}` : l.replace(/^(\s*)(?:[-*]\s+)?/, `$1${i + 1}. `);
        }),
    },
    { id: 'out', label: 'Quitar sangría', text: '⇤', apply: (v, s, e) => mapLines(v, s, e, (l) => l.replace(/^( {1,4}|\t)/, '')) },
    { id: 'in', label: 'Aumentar sangría', text: '⇥', apply: (v, s, e) => mapLines(v, s, e, (l) => `    ${l}`) },
  ],
  [
    { id: 'code', label: 'Código', text: '<>', apply: (v, s, e) => wrap(v, s, e, '`', 'código') },
    {
      id: 'quote',
      label: 'Cita',
      text: '“',
      apply: (v, s, e) => mapLines(v, s, e, (l) => (/^>\s?/.test(l) ? l.replace(/^>\s?/, '') : `> ${l}`)),
    },
    {
      id: 'marker',
      label: 'Insertar marcador de plan {{OFERTA:CÓDIGO}}',
      text: '{ }',
      apply: (v, s, e) => {
        const value = `${v.slice(0, s)}{{OFERTA:CODIGO}}${v.slice(e)}`;
        return { value, start: s + 9, end: s + 15 };
      },
    },
  ],
];

const seg = (on: boolean) =>
  cn(
    'inline-flex h-7 cursor-pointer items-center rounded-[7px] px-2.5 text-[12.5px] leading-4 font-medium whitespace-nowrap',
    on ? 'bg-primary font-semibold text-primary-foreground shadow-card' : 'text-ink-muted hover:text-ink',
  );

export const PromptEditor = forwardRef<PromptEditorHandle, Props>(function PromptEditor(p, ref) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const hl = useRef<HTMLDivElement>(null);
  const max = p.maxChars ?? GUION_MAX_CHARS;
  const badLines = new Set(p.issues.map((i) => i.line).filter((l): l is number => !!l));
  const lines = p.value.split('\n');
  const minHeight = p.minHeight ?? 560;
  const toolsOff = p.readOnly ? (p.readOnlyReason ?? 'Solo lectura') : p.mode !== 'md' ? 'Cambia a Markdown para editar el formato' : undefined;

  const goTo = (line: number) => {
    if (p.mode !== 'md') p.onModeChange('md');
    requestAnimationFrame(() => ta.current && focusLine(ta.current, line));
  };

  const apply = (tool: Tool) => {
    const el = ta.current;
    if (!el || toolsOff) return;
    const r = tool.apply(el.value, el.selectionStart, el.selectionEnd);
    if (r.value.length > max) {
      toast.error(`El guion no puede superar ${max.toLocaleString('es-CO')} caracteres.`);
      return;
    }
    p.onChange(r.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.start, r.end);
    });
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
    <section className="flex h-full min-w-0 flex-col rounded-lg border bg-surface-100 shadow-card">
      <div className="flex flex-wrap items-center gap-2.5 border-b px-4 py-3">
        <FileText {...ICON} className="size-[18px] text-primary-soft-ink" aria-hidden />
        <h2 className="m-0 font-display text-[15px] leading-5 font-semibold text-ink">Guion del agente</h2>
        <IconAction
          className="ml-auto"
          icon={Copy}
          label="Copiar guion"
          onClick={() => void navigator.clipboard?.writeText(p.value).then(() => toast.success('Guion copiado'))}
        />
      </div>
      {p.toolbar}

      {/* Barra estilo Dapta: modo + formato */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-surface-0 px-3 py-2">
        <div className="inline-flex rounded-md border bg-surface-100 p-[2px]" role="radiogroup" aria-label="Modo del editor">
          {(
            [
              ['preview', 'Vista previa'],
              ['md', 'Markdown'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={p.mode === id} className={seg(p.mode === id)} onClick={() => p.onModeChange(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="inline-flex flex-wrap items-center rounded-md border bg-surface-100 p-[2px]" role="toolbar" aria-label="Formato del guion">
          {TOOLS.map((group, gi) => (
            <span key={gi} className={cn('inline-flex items-center', gi > 0 && 'ml-0.5 border-l pl-0.5')}>
              {group.map((t) => (
                <Tooltip key={t.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={t.label}
                      aria-disabled={!!toolsOff || undefined}
                      onMouseDown={(e) => e.preventDefault() /* conserva la selección del textarea */}
                      onClick={() => apply(t)}
                      className="inline-grid h-7 min-w-7 cursor-pointer place-items-center rounded-[6px] px-1.5 font-mono text-[12px] font-semibold text-ink hover:bg-primary-soft hover:text-primary-soft-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:bg-transparent aria-disabled:hover:text-ink"
                    >
                      {t.text}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{toolsOff ? `${t.label}: ${toolsOff}` : t.label}</TooltipContent>
                </Tooltip>
              ))}
            </span>
          ))}
        </div>
      </div>

      {p.mode === 'preview' ? (
        // Capa absoluta: la vista previa se desplaza por dentro y no estira la fila.
        <div className="relative flex-1 bg-surface-100" style={{ minHeight }}>
          <div className="absolute inset-0 overflow-auto px-6 py-5" tabIndex={0} aria-label="Vista previa del guion">
            <Markdown source={p.value} />
          </div>
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden bg-code-bg" style={{ minHeight }}>
          <div
            ref={hl}
            aria-hidden
            className={cn('ai-code pointer-events-none absolute inset-0 overflow-hidden px-4 py-3 text-ink [scrollbar-gutter:stable]', font)}
          >
            {lines.map((l, i) => (
              <div key={i} className={cn('ai-code-line', badLines.has(i + 1) && 'is-errline')}>
                <HighlightLine text={l} />
              </div>
            ))}
          </div>
          <textarea
            ref={ta}
            value={p.value}
            readOnly={p.readOnly}
            onChange={(e) => p.onChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                apply(TOOLS[1]![0]!);
              }
            }}
            onScroll={() => {
              if (ta.current && hl.current) hl.current.scrollTop = ta.current.scrollTop;
            }}
            spellCheck={false}
            maxLength={max}
            aria-label="Guion del agente"
            aria-invalid={p.issues.length > 0 || undefined}
            aria-describedby={p.issues.length ? 'guion-errores' : undefined}
            className={cn(
              'absolute inset-0 m-0 size-full resize-none [scrollbar-gutter:stable] border-0 bg-transparent px-4 py-3 break-words whitespace-pre-wrap text-transparent caret-ink outline-none [overflow-wrap:anywhere] focus-visible:shadow-[inset_0_0_0_2px_var(--focus-ring)]',
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
        <span>{lines.length.toLocaleString('es-CO')} líneas</span>
        <span className="ml-auto">{p.readOnly ? (p.readOnlyReason ?? 'Solo lectura') : 'Revisión en vivo activa'}</span>
      </div>
    </section>
  );
});
