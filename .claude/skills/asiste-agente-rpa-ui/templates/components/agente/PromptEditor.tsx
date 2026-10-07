/**
 * Editor del guion (el "prompt completo" del agente) — Markdown, máx. 30 000 caracteres.
 * Implementación sin dependencias: <textarea> real (accesible, con deshacer nativo) sobre una
 * capa de resaltado sincronizada (títulos de etapa, marcadores {{OFERTA:…}}, errores).
 * Ver reference/screens/agente.*.png.
 */
import { forwardRef, useImperativeHandle, useMemo, useRef, type ReactNode } from "react";
import { Code, Copy, Eye, FileText } from "lucide-react";
import { IconButton, Segmented, ICON } from "../ui";
import { estimateTokens, focusLine, GUION_MAX_CHARS, insertAtCursor, lintGuion, type LintIssue } from "../../../lib/guion-lint";

export interface PromptEditorHandle { insert: (snippet: string) => void; goToLine: (line: number) => void }

interface Props {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  mode: "md" | "preview";
  onModeChange: (m: "md" | "preview") => void;
  /** Fila de ajustes sobre el editor (modelo, temperatura, idioma). */
  toolbar?: ReactNode;
  /** Errores del servidor; si no llegan se usa la revisión local. */
  issues?: LintIssue[];
  tokens?: number;
  height?: number;
}

const ERR_RE = /(\{\{OFERTA:[A-Z0-9_]+\}\}|\$\s?\d{1,3}(?:\.\d{3})+|\b\d+(?:[.,]\d+)?\s?(?:GB|gigas?)\b|\b\d+(?:[.,]\d+)?\s?%)/gi;

function HighlightLine({ text }: { text: string }) {
  if (/^#{1,2}\s/.test(text)) return <span className="h2">{text}</span>;
  const parts = text.split(ERR_RE);
  return <>{parts.map((s, i) => (i % 2 === 0 ? s : s.startsWith("{{") ? <span key={i} className="mk">{s}</span> : <span key={i} className="err">{s}</span>))}{text === "" ? " " : null}</>;
}

/** Vista previa mínima del Markdown del guion (títulos, viñetas, párrafos). */
function MdPreview({ value }: { value: string }) {
  return (
    <div className="ai-md-preview">
      {value.split("\n").map((l, i) =>
        /^##\s/.test(l) ? <h2 key={i}>{l.slice(3)}</h2>
        : /^#\s/.test(l) ? <h2 key={i} style={{ fontSize: 17 }}>{l.slice(2)}</h2>
        : /^- /.test(l) ? <div key={i} style={{ paddingLeft: 14, textIndent: -10 }}>• {l.slice(2)}</div>
        : <div key={i} style={{ minHeight: 10 }}>{l}</div>)}
    </div>
  );
}

export const PromptEditor = forwardRef<PromptEditorHandle, Props>(function PromptEditor(p, ref) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const hl = useRef<HTMLDivElement>(null);
  const issues = useMemo(() => p.issues ?? lintGuion(p.value), [p.issues, p.value]);
  const badLines = useMemo(() => new Set(issues.map((i) => i.line)), [issues]);
  const lines = p.value.split("\n");

  useImperativeHandle(ref, () => ({
    insert(snippet) {
      if (!ta.current || p.readOnly) return;
      const { value, cursor } = insertAtCursor(ta.current, snippet);
      p.onChange(value);
      requestAnimationFrame(() => { ta.current?.focus(); ta.current?.setSelectionRange(cursor, cursor); });
    },
    goToLine(line) { if (ta.current) focusLine(ta.current, line); },
  }));

  const syncScroll = () => {
    if (!ta.current) return;
    if (hl.current) hl.current.scrollTop = ta.current.scrollTop;
  };

  // El número de línea vive en la misma fila que su texto (capa de resaltado), así coincide aunque
  // la línea se envuelva. El <textarea> transparente va encima con el mismo padding izquierdo (44 + 12 px).
  const font = "400 13px/21px var(--font-mono)";
  const wrap = { whiteSpace: "pre-wrap" as const, overflowWrap: "anywhere" as const };

  return (
    <div className="ai-panel ai-editor">
      <div className="ai-editor-head">
        <FileText {...ICON} size={18} style={{ color: "var(--primary-soft-ink)" }} />
        <span className="ai-editor-title">Guion del agente</span>
        <span className="ai-badge ai-badge--neutral">Markdown</span>
        <div className="ai-editor-tools">
          <Segmented label="Modo del editor" value={p.mode} onChange={p.onModeChange}
            items={[{ id: "preview", label: "Vista previa", icon: Eye }, { id: "md", label: "Markdown", icon: Code }]} />
          <IconButton icon={Copy} label="Copiar guion" onClick={() => navigator.clipboard?.writeText(p.value)} />
        </div>
      </div>
      {p.toolbar}

      {p.mode === "preview" ? (
        <div style={{ height: p.height ?? 560, overflow: "auto", background: "var(--code-bg)" }}><MdPreview value={p.value} /></div>
      ) : (
        <div style={{ position: "relative", height: p.height ?? 560, background: "var(--code-bg)", overflow: "hidden" }}>
          <div ref={hl} aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", padding: "10px 0", font, color: "var(--ink)", pointerEvents: "none" }}>
            {lines.map((l, i) => (
              <div key={i} className={badLines.has(i + 1) ? "ai-code-row is-errline" : "ai-code-row"}>
                <span className={badLines.has(i + 1) ? "ai-code-n is-err" : "ai-code-n"}>{i + 1}</span>
                <div style={wrap}><HighlightLine text={l} /></div>
              </div>
            ))}
          </div>
          <textarea
            ref={ta}
            value={p.value}
            readOnly={p.readOnly}
            onChange={(e) => p.onChange(e.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            maxLength={GUION_MAX_CHARS}
            aria-label="Guion del agente"
            aria-invalid={issues.length > 0}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", margin: 0, border: 0, padding: "10px 16px 10px 56px", font, ...wrap, resize: "none", background: "transparent", color: "transparent", caretColor: "var(--ink)", outline: "none" }}
          />
        </div>
      )}

      {issues.length > 0 && (
        <div className="ai-issues" role="alert">
          <b>{issues.length === 1 ? "1 error impide guardar" : `${issues.length} errores impiden guardar`}</b>
          {issues.map((e, i) => (
            <div key={i}>
              <a role="button" tabIndex={0} onClick={() => ta.current && focusLine(ta.current, e.line)} onKeyDown={(k) => k.key === "Enter" && ta.current && focusLine(ta.current, e.line)}>Línea {e.line}</a>
              {` · “${e.match}”: ${e.message}`}
            </div>
          ))}
        </div>
      )}
      <div className="ai-editor-foot">
        <span>{(p.tokens ?? estimateTokens(p.value)).toLocaleString("es-CO")} tokens</span>
        <span style={{ color: p.value.length > GUION_MAX_CHARS * 0.95 ? "var(--warning)" : undefined }}>
          {p.value.length.toLocaleString("es-CO")} / {GUION_MAX_CHARS.toLocaleString("es-CO")} caracteres
        </span>
        <span style={{ marginLeft: "auto" }}>{p.readOnly ? "Solo lectura" : "Revisión en vivo activa"}</span>
      </div>
    </div>
  );
});
