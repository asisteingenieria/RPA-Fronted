import { useMemo, useRef } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { Decoration, EditorView, MatchDecorator, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { Bold, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import { findUnknownVariables, hasHardcodedFigures, toggleBold } from '@/lib/whatsapp-format';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Callout } from './common';
import { VariableChip } from './badges';

const EMOJIS = ['😊', '🎉', '🚀', '👋', '💪', '📱', '📲', '🎄', '✨', '🎅', '🎁', '✅', '👉', '💙', '🔥', '⭐', '🅐', '🅑', '🅒', '🅓'];
const VAR_RE = /\[[A-Za-zÁÉÍÓÚáéíóúñÑ ]+\]|\{\{[A-Z_]+\}\}/g;

class LockedWidget extends WidgetType {
  constructor(readonly name: string) {
    super();
  }
  eq(o: LockedWidget) {
    return o.name === this.name;
  }
  toDOM() {
    const s = document.createElement('span');
    s.className = 'cm-locked inline-flex h-5 items-center rounded-sm bg-legal-soft px-1.5 align-baseline font-mono text-xs font-medium text-legal';
    s.textContent = `🔒 ${this.name}`;
    s.title = 'Variable bloqueada: no se puede borrar';
    return s;
  }
}

function variablesExtension(allowed: string[], locked: string[]): Extension[] {
  const decorator = new MatchDecorator({
    regexp: VAR_RE,
    decoration: (m) => {
      const name = m[0];
      if (locked.includes(name)) return Decoration.replace({ widget: new LockedWidget(name) });
      const known = allowed.includes(name);
      const system = name.startsWith('{{');
      return Decoration.mark({
        class: known
          ? cn('rounded-sm px-[3px] font-mono text-[12.5px]', system ? 'bg-exact-soft text-exact' : 'bg-primary-soft text-primary')
          : 'font-mono text-[12.5px] text-destructive underline decoration-destructive decoration-wavy underline-offset-[3px]',
        attributes: known ? {} : { title: 'Variable desconocida: no se reemplazará' },
      });
    },
  });
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = decorator.createDeco(view);
      }
      update(u: ViewUpdate) {
        this.decorations = decorator.updateDeco(u, this.decorations);
      }
    },
    {
      decorations: (v) => v.decorations,
      provide: (p) => EditorView.atomicRanges.of((view) => view.plugin(p)?.decorations ?? Decoration.none),
    },
  );
  const out: Extension[] = [plugin];
  if (locked.length) {
    // Las variables bloqueadas ({{FECHA}}) no se pueden borrar ni modificar.
    out.push(
      EditorState.changeFilter.of((tr) => {
        if (!tr.docChanged) return true;
        const doc = tr.startState.doc.toString();
        let blocked = false;
        for (const name of locked) {
          let i = doc.indexOf(name);
          while (i >= 0) {
            const from = i;
            const to = i + name.length;
            tr.changes.iterChangedRanges((fa, ta) => {
              if (fa < to && ta > from) blocked = true;
            });
            i = doc.indexOf(name, to);
          }
        }
        return !blocked;
      }),
    );
  }
  return out;
}

const baseTheme = EditorView.theme({
  '&': { backgroundColor: 'transparent', fontSize: '14px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': { fontFamily: 'var(--font-sans)', padding: '12px 14px', lineHeight: '22px', caretColor: 'var(--foreground)' },
  '.cm-line': { padding: '0' },
  '.cm-scroller': { fontFamily: 'var(--font-sans)' },
  '.cm-placeholder': { color: 'var(--ps-ink-faint)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'var(--ps-primary-soft) !important' },
  '.cm-cursor': { borderLeftColor: 'var(--foreground)' },
});

export interface ContentEditorProps {
  value: string;
  onChange: (v: string) => void;
  /** Variables que el sistema reemplaza en este texto (se insertan como chip). */
  allowedVars?: string[];
  /** Variables bloqueadas, no borrables (p. ej. {{FECHA}} del texto legal). */
  lockedVars?: string[];
  /** Editor de un texto que redacta la IA: avisa si hay cifras escritas a mano. */
  ai?: boolean;
  maxChars?: number;
  lastEdit?: { by: string; at: string };
  footerHint?: string;
  readOnly?: boolean;
  minHeight?: number;
  label?: string;
  invalid?: boolean;
}

export function ContentEditor({ value, onChange, allowedVars = [], lockedVars = [], ai, maxChars, lastEdit, footerHint, readOnly, minHeight = 140, label, invalid }: ContentEditorProps) {
  const ref = useRef<ReactCodeMirrorRef>(null);
  const extensions = useMemo(
    () => [EditorView.lineWrapping, baseTheme, ...variablesExtension(allowedVars, lockedVars), EditorView.contentAttributes.of({ 'aria-label': label ?? 'Editor de texto' })],
    [allowedVars.join('|'), lockedVars.join('|'), label],
  );

  const unknown = findUnknownVariables(value, allowedVars, lockedVars);
  const figures = ai && hasHardcodedFigures(value);
  const over = maxChars != null && value.length > maxChars;

  const insert = (text: string) => {
    const view = ref.current?.view;
    if (!view) return onChange(value + text);
    const { from, to } = view.state.selection.main;
    view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
    view.focus();
  };
  const bold = () => {
    const view = ref.current?.view;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const r = toggleBold(view.state.doc.toString(), from, to);
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: r.text }, selection: { anchor: r.start, head: r.end } });
    view.focus();
  };

  return (
    <div className={cn('overflow-hidden rounded-md border border-border-strong bg-card focus-within:ring-2 focus-within:ring-ring', (invalid || over) && 'border-destructive', readOnly && 'bg-surface-2')}>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 border-b bg-surface-2 px-2 py-1.5" role="toolbar" aria-label="Formato">
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button type="button" className="grid size-7 place-items-center rounded-sm text-muted-foreground hover:bg-border" aria-label="Insertar emoji">
                    <Smile className="size-4" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Insertar emoji</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map((e) => (
                  <button key={e} type="button" className="grid size-7 place-items-center rounded-sm text-base hover:bg-surface-2" onClick={() => insert(e)}>
                    {e}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={bold} className="grid size-7 place-items-center rounded-sm text-muted-foreground hover:bg-border" aria-label="Negrita WhatsApp">
                <Bold className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Negrita WhatsApp (*texto*)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={() => insert('• ')} className="grid size-7 place-items-center rounded-sm text-base text-muted-foreground hover:bg-border" aria-label="Viñeta">
                •
              </button>
            </TooltipTrigger>
            <TooltipContent>Viñeta</TooltipContent>
          </Tooltip>
          {allowedVars.length > 0 && <span className="mx-1 h-5 w-px bg-border" aria-hidden />}
          {allowedVars.map((v) => (
            <button key={v} type="button" onClick={() => insert(v)} className="rounded-sm hover:opacity-80" aria-label={`Insertar ${v}`}>
              <VariableChip name={v} />
            </button>
          ))}
        </div>
      )}
      <CodeMirror
        ref={ref}
        value={value}
        onChange={onChange}
        extensions={extensions}
        editable={!readOnly}
        readOnly={readOnly}
        basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false, autocompletion: false, searchKeymap: false, bracketMatching: false, closeBrackets: false }}
        theme="none"
        minHeight={`${minHeight}px`}
      />
      {(figures || unknown.length > 0) && (
        <div className="space-y-2 px-3.5 pb-3">
          {figures && (
            <Callout tone="warning">
              Los precios, GB y descuentos los inserta el sistema desde el Catálogo. Usa <VariableChip name="{{PLANES}}" />.
            </Callout>
          )}
          {unknown.length > 0 && (
            <Callout tone="danger">
              Variable desconocida: {unknown.map((u) => <VariableChip key={u} name={u} unknown />)}. No se reemplazará. Permitidas: {allowedVars.join(', ') || 'ninguna'}.
            </Callout>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 border-t px-3.5 py-2 text-xs text-muted-foreground">
        <span>{lastEdit ? `Última edición: ${lastEdit.by} · ${formatDateTime(lastEdit.at)}` : (footerHint ?? 'Respeta saltos de línea y emojis')}</span>
        <span className={cn('tabular', over && 'font-medium text-destructive')}>
          {[...value].length}
          {maxChars ? ` / ${maxChars}` : ''} caracteres
        </span>
      </div>
    </div>
  );
}
