/**
 * Agente (v1.8, sección 6.3.8 del plan; kit: reference/screens/agente, probaragente, historial).
 * Configuración estilo Retell: guion completo en Markdown + ajustes + catálogo en solo lectura +
 * prueba en vivo. Reglas: precios y textos legales nunca en el guion (regla 11), el flujo lo decide
 * la máquina de estados (regla 12) y publicar SIEMPRE corre la suite de evaluación (regla 13).
 * Datos: /admin/agent, /admin/agent/review, /draft, /draft/publish, /versions, /restore, /test.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useBlocker, useNavigate, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Cpu,
  FlaskConical,
  History,
  Library,
  MessageCircle,
  Package,
  RotateCcw,
  Settings2,
  Shield,
  SlidersHorizontal,
  SquareCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ApiError,
  api,
  errorMessage,
  type AgentFields,
  type AgentIssue,
  type AgentOverview,
  type AgentVersionInfo,
} from '@/lib/api';
import { fmtDateTime, fmtMs, fmtWhen, formatPct } from '@/lib/format';
import { lintGuion } from '@/lib/guion-lint';
import { renderWhatsApp } from '@/lib/text-format';
import { PROCESS_LABEL } from '@/lib/labels';
import { reasonFor } from '@/lib/roles';
import { useUser } from '@/auth/session';
import { keys } from '@/hooks/queries';
import { PROFILE_LABEL, TERMINAL, useAgentTest, type AgentTest, type TestSource } from '@/hooks/use-agent-test';
import {
  ActionButton,
  Callout,
  ConfirmDialog,
  Empty,
  ErrorState,
  ICON,
  IconAction,
  Panel,
  Segmented,
  SkeletonCard,
  SubTabs,
  type TabItem,
} from '@/components/rpa/common';
import { VersionStatus } from '@/components/rpa/status';
import { PromptEditor, type EditorIssue, type PromptEditorHandle } from '@/components/rpa/agent/prompt-editor';
import { WhatsAppPreview } from '@/components/rpa/agent/whatsapp-preview';
import { AgentBrainsSelector, KnowledgeTab } from '@/pages/conocimiento';
import {
  AgentBar,
  CatalogReadOnly,
  EvalReport,
  LockedBadge,
  ModelSettings,
  Section,
  SectionStack,
  StageTrack,
  evalDuration,
  evalPct,
} from '@/components/rpa/agent/parts';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const AGENT_TABS = ['configuracion', 'probar', 'historial', 'evaluaciones', 'conocimiento'] as const;
export type AgentTab = (typeof AGENT_TABS)[number];
const CAMPAIGN = 'Claro Móvil';
const EVAL_POLL_MS = 5_000;

const fieldsOf = (v: AgentFields): AgentFields => ({
  agentName: v.agentName,
  companyName: v.companyName,
  companyInfo: v.companyInfo,
  welcome: v.welcome,
  prompt: v.prompt,
  model: v.model,
  temperature: v.temperature,
});
const keyOf = (f: AgentFields) => JSON.stringify(f);

/** Lo que el motor hace por código (no se configura en la UI: regla 12). */
const ENGINE_FUNCTIONS = [
  'Menú A–D y autorización deterministas: solo un «SÍ AUTORIZO» explícito es consentimiento.',
  'Transferir al backoffice con nota interna cuando el cliente autoriza.',
  'Cerrar el chat: soporte (*611), sin venta o por inactividad.',
  'Escalar a un asesor humano lo que el agente no puede manejar.',
  'Extraer nombre, operador actual y uso; el plan solo sale del catálogo.',
  'Validar cada respuesta: si falla, regenera una vez y luego responde con una frase segura.',
];

export function AgentePage() {
  const me = useUser();
  const admin = me.role === 'ADMIN';
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { tab: rawTab } = useParams({ from: '/shell/agente/$tab' });
  const tab: AgentTab = (AGENT_TABS as readonly string[]).includes(rawTab) ? (rawTab as AgentTab) : 'configuracion';

  const [evaluatingPoll, setEvaluatingPoll] = useState(false);
  const agent = useQuery({ queryKey: keys.agent, queryFn: api.agent, refetchInterval: evaluatingPoll ? EVAL_POLL_MS : false });
  const versions = useQuery({ queryKey: keys.agentVersions, queryFn: api.agentVersions, refetchInterval: evaluatingPoll ? EVAL_POLL_MS : false });
  const data = agent.data;
  const working = data?.working ?? null;
  const evaluating = working?.status === 'EVALUATING' || (versions.data ?? []).some((v) => v.status === 'EVALUATING');
  useEffect(() => setEvaluatingPoll(evaluating), [evaluating]);

  // ───── Formulario (borrador en edición) ─────
  const base = useMemo(() => (data ? fieldsOf(data.working ?? data.published) : null), [data]);
  const [form, setForm] = useState<AgentFields | null>(null);
  const dirty = !!form && !!base && keyOf(form) !== keyOf(base);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    // Datos nuevos del servidor (evaluación terminada, otro ADMIN guardó…): solo si no hay cambios propios.
    if (base && (!form || !dirtyRef.current)) setForm(base);
  }, [base]);
  const set = <K extends keyof AgentFields>(k: K, v: AgentFields[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  // ───── Revisión en vivo (servidor) con respaldo local para el guion ─────
  const [review, setReview] = useState<{ key: string; issues: AgentIssue[] } | null>(null);
  useEffect(() => {
    if (!form || !admin) return;
    const k = keyOf(form);
    const t = setTimeout(() => {
      api.reviewAgent(form).then(
        (r) => setReview({ key: k, issues: r.issues }),
        () => undefined,
      );
    }, 600);
    return () => clearTimeout(t);
  }, [form, admin]);
  const fresh = !!form && review?.key === keyOf(form);
  const promptIssues: EditorIssue[] = form
    ? fresh
      ? review!.issues.filter((i) => i.field === 'prompt').map((i) => ({ line: i.line, message: i.message }))
      : lintGuion(form.prompt).map((i) => ({ line: i.line, match: i.match, message: i.message }))
    : [];
  const otherIssues = (review?.issues ?? []).filter((i) => i.field !== 'prompt');
  const issuesFor = (f: keyof AgentFields) => otherIssues.filter((i) => i.field === f).map((i) => i.message);
  const hasErrors = promptIssues.length + otherIssues.length > 0;

  // ───── Prueba (compartida entre la columna derecha y la pestaña Probar agente) ─────
  const onIssues = useCallback((issues: AgentIssue[]) => form && setReview({ key: keyOf(form), issues }), [form]);
  const test = useAgentTest({ defaultSource: admin ? 'editor' : 'published', onIssues });

  // ───── Acciones ─────
  const refresh = async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: keys.agent }), qc.invalidateQueries({ queryKey: keys.agentVersions })]);
  };
  const resetToServer = async () => {
    dirtyRef.current = false;
    setForm(null);
    await refresh();
  };
  const save = useMutation({
    mutationFn: () => api.saveAgentDraft(form!),
    onSuccess: async (v) => {
      toast.success(`Borrador v${v.version} guardado`, { description: 'Publícalo con evaluación para que el robot lo use.' });
      await resetToServer();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.issues && form) setReview({ key: keyOf(form), issues: err.issues });
      toast.error(errorMessage(err, 'No se pudo guardar el borrador.'));
    },
  });
  const publish = useMutation({
    mutationFn: api.publishAgent,
    onSuccess: async (r) => {
      toast.success('Evaluación iniciada', {
        description: `v${r.version}: si cumple 0 datos inventados y ≥ 95 % de casos correctos se publica sola.`,
      });
      setEvaluatingPoll(true);
      await refresh();
      void navigate({ to: '/agente/$tab', params: { tab: 'historial' } });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.issues && form) setReview({ key: keyOf(form), issues: err.issues });
      toast.error(errorMessage(err, 'No se pudo iniciar la evaluación.'));
    },
  });
  const [restoreFor, setRestoreFor] = useState<AgentVersionInfo | null>(null);
  const restore = useMutation({
    mutationFn: (v: AgentVersionInfo) => api.restoreAgentVersion(v.id),
    onSuccess: async (d, v) => {
      toast.success(`Contenido de v${v.version} copiado como borrador v${d.version}`);
      await resetToServer();
      void navigate({ to: '/agente/$tab', params: { tab: 'configuracion' } });
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo restaurar la versión.')),
  });

  // ───── Cambios sin guardar: avisar antes de salir ─────
  useEffect(() => {
    if (!dirty) return;
    const on = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [dirty]);
  const blocker = useBlocker({
    shouldBlockFn: ({ next }) => dirtyRef.current && !next.pathname.startsWith('/agente'),
    withResolver: true,
  });

  if (agent.isLoading || (!form && !agent.isError)) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <SkeletonCard className="h-[72px]" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] wide:grid-cols-[minmax(0,1fr)_340px_360px]">
          <SkeletonCard className="h-[640px]" />
          <SkeletonCard className="h-[640px]" />
          <SkeletonCard className="h-[640px] max-wide:hidden" />
        </div>
      </div>
    );
  }
  if (agent.isError || !data || !form || !base) {
    return (
      <Panel>
        <ErrorState message="No se pudo cargar la configuración del agente." onRetry={() => void agent.refetch()} retrying={agent.isFetching} />
      </Panel>
    );
  }

  const pub = data.published;
  const status = working?.status ?? 'PUBLISHED';
  const pubLine = pub.builtIn
    ? 'la v1 del código'
    : `v${pub.version} publicada ${pub.publishedAt ? fmtDateTime(pub.publishedAt) : ''}${pub.publishedBy ? ` por ${pub.publishedBy}` : ''}`;
  const meta = !working
    ? `${pub.builtIn ? 'v1 del código · sin versiones guardadas' : pubLine} · ${dirty ? 'con cambios en el editor' : 'sin cambios'}`
    : working.status === 'EVALUATING'
      ? `v${working.version} en evaluación · sigue publicada ${pub.builtIn ? 'la v1 del código' : `la v${pub.version}`}`
      : working.status === 'REJECTED'
        ? `v${working.version} rechazada ${fmtWhen(working.updatedAt).toLowerCase()} · sigue publicada ${pub.builtIn ? 'la v1 del código' : `la v${pub.version}`}`
        : `Borrador v${working.version} de ${working.createdBy} · basado en ${pubLine}`;

  const editReason = reasonFor(me.role, 'editarAgente');
  const readOnly = !admin || evaluating;
  const saveReason = evaluating ? 'Hay una evaluación en curso' : hasErrors ? 'Corrige los errores del guion para guardar' : undefined;
  const publishReason = evaluating
    ? 'Hay una evaluación en curso'
    : !data.canPublish
      ? (data.publishBlocker ?? 'El servidor no permite publicar todavía')
      : dirty
        ? 'Guarda los cambios antes de publicar'
        : working?.status !== 'DRAFT'
          ? 'No hay un borrador para publicar: guarda un cambio primero'
          : hasErrors
            ? 'Corrige los errores del guion'
            : undefined;

  const allVersions = versions.data ?? [];
  const latest = allVersions.reduce<AgentVersionInfo | null>((a, v) => (!a || v.version > a.version ? v : a), null);
  // Última versión rechazada posterior a la publicada (su reporte se muestra en Historial).
  const rejected =
    [...allVersions].sort((a, b) => b.version - a.version).find((v) => v.status === 'REJECTED' && v.evalSummary && v.version > pub.version) ?? null;
  const tabs: TabItem<AgentTab>[] = [
    { id: 'configuracion', label: 'Configuración', icon: SlidersHorizontal },
    { id: 'probar', label: 'Probar agente', icon: FlaskConical },
    { id: 'historial', label: 'Historial', icon: History, count: allVersions.length },
    { id: 'evaluaciones', label: 'Evaluaciones', icon: SquareCheck },
    { id: 'conocimiento', label: 'Conocimiento', icon: Library },
  ];
  const chatTitle = `${form.agentName || 'Agente'} · ${CAMPAIGN}`;

  return (
    <>
      <AgentBar
        name={`${form.agentName || 'Agente'} · ${CAMPAIGN} WhatsApp`}
        status={status}
        meta={meta}
        unsaved={dirty}
        saving={save.isPending}
        publishing={publish.isPending}
        editReason={editReason}
        saveReason={saveReason}
        publishReason={publishReason}
        onDiscard={() => setForm(base)}
        onSave={() => save.mutate()}
        onPublish={() => publish.mutate()}
      />

      <SubTabs items={tabs} active={tab} onChange={(t) => void navigate({ to: '/agente/$tab', params: { tab: t } })} />

      {!admin && (
        <Callout tone="info">Solo lectura: con el rol OPERADOR puedes ver la configuración, el historial y probar la versión publicada.</Callout>
      )}
      {admin && !data.canPublish && (
        <Callout tone="warning">
          Puedes guardar borradores, pero todavía no publicar: {data.publishBlocker}. Publicar corre la suite de evaluación completa contra el proveedor real
          (regla 13).
        </Callout>
      )}
      {evaluating && (
        <Callout tone="warning" icon={FlaskConical}>
          Evaluando v{working?.version ?? latest?.version}… La pantalla se actualiza cada 5 s. Mientras tanto no se puede editar.
        </Callout>
      )}
      {tab === 'configuracion' && working?.status === 'REJECTED' && (
        <Callout tone="danger">
          La v{working.version} no pasó la evaluación.{' '}
          <Link to="/agente/$tab" params={{ tab: 'historial' }} className="font-bold underline">
            Ver el reporte
          </Link>
          . Corrige el guion y guarda: se crea un borrador nuevo.
        </Callout>
      )}

      {tab === 'configuracion' && (
        <ConfigTab
          data={data}
          form={form}
          set={set}
          readOnly={readOnly}
          readOnlyReason={!admin ? 'Solo lectura · requiere rol ADMIN' : evaluating ? 'Solo lectura · evaluación en curso' : undefined}
          promptIssues={promptIssues}
          issuesFor={issuesFor}
          test={test}
          chatTitle={chatTitle}
          admin={admin}
        />
      )}
      {tab === 'probar' && <TestTab data={data} form={form} test={test} chatTitle={chatTitle} admin={admin} />}
      {tab === 'historial' && (
        <HistoryTab
          versions={allVersions}
          loading={versions.isLoading}
          error={versions.isError}
          onRetry={() => void versions.refetch()}
          rejected={rejected}
          admin={admin}
          busy={restore.isPending || evaluating}
          onRestore={setRestoreFor}
        />
      )}
      {tab === 'evaluaciones' && <EvaluationsTab versions={allVersions} loading={versions.isLoading} />}
      {tab === 'conocimiento' && <KnowledgeTab />}

      <ConfirmDialog
        open={!!restoreFor}
        onOpenChange={(o) => !o && setRestoreFor(null)}
        title={`¿Restaurar la v${restoreFor?.version ?? ''} como borrador?`}
        description={
          dirty
            ? 'Se copia su contenido como un borrador nuevo y se pierden los cambios sin guardar del editor.'
            : 'Se copia su contenido como un borrador nuevo. Para que el robot lo use hay que publicarlo con evaluación.'
        }
        confirmLabel="Sí, restaurar"
        danger={dirty}
        onConfirm={() => restore.mutateAsync(restoreFor!)}
      />
      <ConfirmDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(o) => !o && blocker.reset?.()}
        danger
        title="¿Salir sin guardar?"
        description="Tienes cambios sin guardar en el agente. Si sales ahora se pierden."
        confirmLabel="Salir sin guardar"
        onConfirm={() => blocker.proceed?.()}
      />
    </>
  );
}

/* ───────────── Configuración ───────────── */
function FieldBlock({ id, label, errors, help, children }: { id: string; label: string; errors?: string[]; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
      </Label>
      {children}
      {errors?.map((e) => (
        <span key={e} className="text-xs leading-4 text-danger">
          {e}
        </span>
      ))}
      {help && <span className="text-xs leading-4 text-ink-subtle">{help}</span>}
    </div>
  );
}

function ConfigTab({
  data,
  form,
  set,
  readOnly,
  readOnlyReason,
  promptIssues,
  issuesFor,
  test,
  chatTitle,
  admin,
}: {
  data: AgentOverview;
  form: AgentFields;
  set: <K extends keyof AgentFields>(k: K, v: AgentFields[K]) => void;
  readOnly: boolean;
  readOnlyReason?: string;
  promptIssues: EditorIssue[];
  issuesFor: (f: keyof AgentFields) => string[];
  test: AgentTest;
  chatTitle: string;
  admin: boolean;
}) {
  const editor = useRef<PromptEditorHandle>(null);
  const [mode, setMode] = useState<'md' | 'preview'>('md');
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] wide:grid-cols-[minmax(0,1fr)_340px_360px]">
      <PromptEditor
        ref={editor}
        value={form.prompt}
        onChange={(v) => set('prompt', v)}
        readOnly={readOnly}
        readOnlyReason={readOnlyReason}
        mode={mode}
        onModeChange={setMode}
        issues={promptIssues}
        maxChars={data.limits.prompt}
        height={600}
        toolbar={
          <>
            <ModelSettings
              models={data.models}
              defaultModel={data.defaultModel}
              model={form.model}
              onModel={(m) => set('model', m)}
              temperature={form.temperature}
              min={data.limits.temperatureMin}
              max={data.limits.temperatureMax}
              onTemperature={(t) => set('temperature', t)}
              temperatureIgnored={!data.temperatureApplies}
              readOnly={readOnly}
            />
            {[...issuesFor('model'), ...issuesFor('temperature')].map((e) => (
              <div key={e} className="border-b bg-danger-soft px-4 py-2 text-xs text-danger">
                {e}
              </div>
            ))}
            <p className="m-0 border-b px-4 py-2 text-xs leading-4 text-ink-subtle">
              Organiza las instrucciones por etapa con títulos{' '}
              {data.stages.map((s, i) => (
                <span key={s}>
                  {i > 0 && ' '}
                  <code className="rounded-sm bg-surface-200 px-1 font-mono text-[11px]">## {s}</code>
                </span>
              ))}
              . El sistema le indica al modelo la etapa actual; el flujo, el menú, la autorización y los textos legales los controla el código.
            </p>
          </>
        }
      />

      <SectionStack>
        <Section title="Ajustes del agente" icon={Settings2} defaultOpen>
          <FieldBlock id="agent-name" label="Nombre del agente" errors={issuesFor('agentName')}>
            <Input id="agent-name" value={form.agentName} maxLength={data.limits.agentName} readOnly={readOnly} onChange={(e) => set('agentName', e.target.value)} />
          </FieldBlock>
          <FieldBlock id="company-name" label="Nombre de empresa" errors={issuesFor('companyName')}>
            <Input id="company-name" value={form.companyName} maxLength={data.limits.companyName} readOnly={readOnly} onChange={(e) => set('companyName', e.target.value)} />
          </FieldBlock>
          <FieldBlock id="company-info" label="Descripción de la empresa" errors={issuesFor('companyInfo')}>
            <Textarea id="company-info" rows={4} value={form.companyInfo} maxLength={data.limits.companyInfo} readOnly={readOnly} onChange={(e) => set('companyInfo', e.target.value)} />
          </FieldBlock>
        </Section>
        <Section title="Mensaje de bienvenida" icon={MessageCircle} defaultOpen>
          <Textarea
            aria-label="Saludo de bienvenida"
            rows={3}
            value={form.welcome}
            maxLength={data.limits.welcome}
            readOnly={readOnly}
            aria-invalid={issuesFor('welcome').length > 0 || undefined}
            onChange={(e) => set('welcome', e.target.value)}
          />
          {issuesFor('welcome').map((e) => (
            <span key={e} className="text-xs leading-4 text-danger">
              {e}
            </span>
          ))}
          <div className="flex flex-col gap-1 rounded-md bg-surface-200 px-3 py-2.5 text-[13px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <Shield {...ICON} className="size-3.5" aria-hidden />
              Menú fijo (el flujo depende de las letras)
            </span>
            <div className="whitespace-pre-wrap">{renderWhatsApp(data.menuOptions)}</div>
          </div>
          <span className="text-xs leading-4 text-ink-subtle">Sin promesas («gratis», «te regalo»), enlaces ni marcadores. Lo envía el sistema tal cual, seguido del menú.</span>
        </Section>
        <Section title="Catálogo" icon={Package} badge={<LockedBadge>Solo lectura</LockedBadge>} defaultOpen>
          <CatalogReadOnly plans={data.catalog} canInsert={!readOnly} onInsert={(m) => editor.current?.insert(m)} />
        </Section>
        <Section title="Conocimiento (Brains)" icon={Library}>
          <p className="m-0 text-xs text-ink-subtle">
            Brains publicados que usa el agente: un solo catálogo y los documentos que quieras. Sus datos van al modelo como información, nunca como
            instrucciones.
          </p>
          <AgentBrainsSelector />
        </Section>
        <Section title="Reglas del sistema" icon={Shield} badge={<LockedBadge>No editable</LockedBadge>}>
          <p className="m-0 text-xs text-ink-subtle">Van siempre antes del guion y no se pueden cambiar desde el panel.</p>
          <pre className="m-0 max-h-[360px] overflow-auto rounded-md bg-surface-200 px-3 py-2.5 font-mono text-[12.5px] leading-[19px] whitespace-pre-wrap text-ink-muted">
            {data.systemRules}
          </pre>
        </Section>
        <Section title="Funciones del motor" icon={Cpu} badge={<LockedBadge>En código</LockedBadge>}>
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[13px] text-ink-muted">
            {ENGINE_FUNCTIONS.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <span className="text-xs text-ink-subtle">Las decide la máquina de estados; no se configuran visualmente.</span>
        </Section>
      </SectionStack>

      <div className="lg:col-span-2 wide:col-span-1">
        <Panel
          title="Probar agente"
          icon={FlaskConical}
          actions={<IconAction icon={RotateCcw} label="Reiniciar conversación" onClick={test.reset} />}
          flush
        >
          <div className="flex flex-col gap-3 p-4">
            <SourcePicker test={test} admin={admin} published={data.published.version} />
            {test.error && <Callout tone="danger">{test.error}</Callout>}
            <WhatsAppPreview
              items={test.items}
              title={chatTitle}
              typing={test.sending}
              sending={test.sending}
              lockedReason={endedReason(test)}
              onSend={(t) => void test.send(t, form)}
              empty="Escribe como si fueras el cliente (por ejemplo «Hola»). El primer mensaje recibe la bienvenida y el menú."
              height={520}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function endedReason(test: AgentTest) {
  const t = TERMINAL[test.state.stage];
  return t ? `Conversación terminada: ${t}. Reinicia para probar otra vez.` : undefined;
}

function SourcePicker({ test, admin, published }: { test: AgentTest; admin: boolean; published: number }) {
  return (
    <Segmented<TestSource>
      label="Qué probar"
      value={test.source}
      onChange={test.setSource}
      className="w-full [&>button]:flex-1 [&>button]:justify-center"
      items={[
        { id: 'editor', label: 'Lo que hay en el editor', disabled: admin ? undefined : reasonFor('OPERADOR', 'probarEditor') },
        { id: 'published', label: `Versión publicada (v${published})` },
      ]}
    />
  );
}

/* ───────────── Probar agente ───────────── */
function TestTab({ data, form, test, chatTitle, admin }: { data: AgentOverview; form: AgentFields; test: AgentTest; chatTitle: string; admin: boolean }) {
  const profile = Object.entries(test.state.profile).filter(([k]) => PROFILE_LABEL[k]);
  const options: { id: TestSource; title: string; sub: string; reason?: string }[] = [
    { id: 'editor', title: 'Lo que hay en el editor', sub: 'Incluso sin guardar · solo ADMIN', reason: admin ? undefined : reasonFor('OPERADOR', 'probarEditor') },
    { id: 'published', title: 'Versión publicada', sub: `v${data.published.version} · lo que ven los clientes` },
  ];
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)] wide:grid-cols-[300px_minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-4">
        <Panel title="Qué probar">
          <div role="radiogroup" aria-label="Qué probar" className="flex flex-col gap-1">
            {options.map((o) => (
              <label
                key={o.id}
                className={cn('flex cursor-pointer items-start gap-3 py-2', o.reason && 'cursor-not-allowed opacity-55')}
                title={o.reason}
              >
                <input
                  type="radio"
                  name="fuente"
                  className="mt-0.5 size-[18px] accent-primary"
                  checked={test.source === o.id}
                  disabled={!!o.reason}
                  onChange={() => test.setSource(o.id)}
                />
                <span>
                  <b className="block font-semibold text-ink">{o.title}</b>
                  <span className="text-xs text-ink-subtle">{o.reason ?? o.sub}</span>
                </span>
              </label>
            ))}
          </div>
          <ActionButton variant="secondary" icon={RotateCcw} className="mt-3 w-full" onClick={test.reset} disabled={test.sending}>
            Reiniciar conversación
          </ActionButton>
        </Panel>
        <Callout tone="info" icon={Shield}>
          Simulación con el motor real: máquina de estados, catálogo y validadores. No toca Abaya ni guarda nada.
        </Callout>
        {data.provider === 'simulado' && (
          <Callout tone="warning">
            Con el proveedor <b>simulado</b> responde un cerebro heurístico que no lee el guion: sirve para probar el flujo, no la redacción. Para probar el guion
            configura un proveedor real con su API key.
          </Callout>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        {test.error && <Callout tone="danger">{test.error}</Callout>}
        <WhatsAppPreview
          items={test.items}
          title={chatTitle}
          typing={test.sending}
          sending={test.sending}
          lockedReason={endedReason(test)}
          onSend={(t) => void test.send(t, form)}
          empty="Escribe como si fueras el cliente (por ejemplo «Hola»). El primer mensaje recibe la bienvenida y el menú."
          height={680}
        />
      </div>

      <div className="flex flex-col gap-4 lg:col-span-2 lg:grid lg:grid-cols-2 wide:col-span-1 wide:flex">
        <Panel title="Estado de la simulación">
          <dl className="m-0 grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px]">
            <dt className="text-ink-subtle">Etapa actual</dt>
            <dd className="m-0 font-semibold text-ink">{test.state.stage}</dd>
            {profile.map(([k, v]) => (
              <span key={k} className="contents">
                <dt className="text-ink-subtle">{PROFILE_LABEL[k]}</dt>
                <dd className="m-0 font-semibold break-words text-ink">
                  {k === 'process' ? (PROCESS_LABEL[v] ?? v) : /plan/i.test(k) ? <code className="rounded-[5px] bg-cat-tyt-soft px-1.5 font-mono text-xs text-code-marker">{v}</code> : v}
                </dd>
              </span>
            ))}
            <dt className="text-ink-subtle">Proveedor</dt>
            <dd className="m-0 font-semibold break-words text-ink">{test.provider ?? data.provider}</dd>
          </dl>
        </Panel>
        <Panel title="Etapas">
          <StageTrack stages={[...data.stages, 'TRANSFERENCIA']} current={test.state.stage} />
          <p className="mt-2 mb-0 text-xs text-ink-subtle">Las etapas las decide la máquina de estados, no el modelo.</p>
        </Panel>
      </div>
    </div>
  );
}

/* ───────────── Historial ───────────── */
function evalLine(v: AgentVersionInfo): ReactNode {
  const s = v.evalSummary;
  if (v.status === 'EVALUATING') {
    return (
      <div className="w-[150px]">
        <div className="ai-progress-stripes h-2 animate-pulse rounded-full" role="progressbar" aria-label="Evaluación en curso" />
        <span className="text-xs text-ink-subtle">en curso…</span>
      </div>
    );
  }
  if (!s) return '—';
  if (s.cases === undefined) return <span className="whitespace-normal text-danger">{s.problems?.[0] ?? '—'}</span>;
  const pct = evalPct(s);
  return `${pct === null ? '—' : formatPct(pct)} · ${s.invented ?? 0} inventado${s.invented === 1 ? '' : 's'}`;
}

function HistoryTab({
  versions,
  loading,
  error,
  onRetry,
  rejected,
  admin,
  busy,
  onRestore,
}: {
  versions: AgentVersionInfo[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  rejected: AgentVersionInfo | null;
  admin: boolean;
  busy: boolean;
  onRestore: (v: AgentVersionInfo) => void;
}) {
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  return (
    <>
      {rejected?.evalSummary && <EvalReport version={rejected.version} summary={rejected.evalSummary} />}
      <Panel title="Historial de versiones" icon={History} flush>
        {loading ? (
          <div className="p-5">
            <SkeletonCard className="h-40" />
          </div>
        ) : error ? (
          <ErrorState message="No se pudo cargar el historial." onRetry={onRetry} />
        ) : sorted.length === 0 ? (
          <Empty icon={History} title="Sin versiones guardadas">
            El robot usa la v1 del código. Guarda un borrador en Configuración para empezar el historial.
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Versión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Guardó</TableHead>
                <TableHead>Publicó</TableHead>
                <TableHead>Evaluación</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-semibold">v{v.version}</TableCell>
                  <TableCell>
                    <VersionStatus status={v.status} />
                  </TableCell>
                  <TableCell>{v.agentName}</TableCell>
                  <TableCell className="font-mono text-xs">{v.model ?? 'por defecto'}</TableCell>
                  <TableCell>
                    {v.createdBy} · {fmtWhen(v.updatedAt)}
                  </TableCell>
                  <TableCell>{v.publishedAt ? `${v.publishedBy ?? '—'} · ${fmtWhen(v.publishedAt)}` : '—'}</TableCell>
                  <TableCell>{evalLine(v)}</TableCell>
                  <TableCell className="text-right">
                    {v.status !== 'DRAFT' && v.status !== 'EVALUATING' && (
                      <ActionButton
                        variant="ghost"
                        size="sm"
                        icon={RotateCcw}
                        reason={admin ? (busy ? 'Espera a que termine la acción en curso' : undefined) : reasonFor('OPERADOR', 'editarAgente')}
                        onClick={() => onRestore(v)}
                      >
                        Restaurar como borrador
                      </ActionButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}

/* ───────────── Evaluaciones ───────────── */
function EvaluationsTab({ versions, loading }: { versions: AgentVersionInfo[]; loading: boolean }) {
  const evaluated = [...versions].filter((v) => v.evalSummary).sort((a, b) => b.version - a.version);
  const last = evaluated[0];
  if (loading) return <SkeletonCard className="h-60" />;
  if (!last) {
    return (
      <Panel>
        <Empty icon={SquareCheck} title="Aún no hay evaluaciones">
          La suite (60 conversaciones guionadas) corre al pulsar «Publicar con evaluación». Meta: 0 datos inventados y ≥ 95 % de casos correctos.
        </Empty>
      </Panel>
    );
  }
  const s = last.evalSummary!;
  return (
    <>
      <EvalReport version={last.version} summary={s} published={last.status === 'PUBLISHED' || (last.status === 'ARCHIVED' && !s.problems?.length)} />
      <Panel title="Detalle de la última evaluación" icon={CheckCircle2}>
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-6 gap-y-4 text-[13px]">
          {[
            ['Proveedor', s.provider ?? '—'],
            ['Modelo', s.model ?? 'por defecto'],
            ['Latencia p50', fmtMs(s.p50)],
            ['Latencia p95', fmtMs(s.p95)],
            ['Regeneración', s.regenRate ?? '—'],
            ['Respuesta segura', s.fallbackRate ?? '—'],
            ['Duración', evalDuration(s)],
            ['Terminó', fmtDateTime(s.finishedAt)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-ink-subtle">{k}</dt>
              <dd className="m-0 mt-0.5 font-semibold text-ink tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel title="Evaluaciones anteriores" icon={History} flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Versión</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Terminó</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluated.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-semibold">v{v.version}</TableCell>
                <TableCell>
                  <VersionStatus status={v.status} />
                </TableCell>
                <TableCell>{evalLine(v)}</TableCell>
                <TableCell>{v.evalSummary?.provider ?? '—'}</TableCell>
                <TableCell>{fmtDateTime(v.evalSummary?.finishedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </>
  );
}

