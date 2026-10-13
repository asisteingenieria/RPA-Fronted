/**
 * Agente (v1.8, sección 6.3.8 del plan; kit: reference/screens/agente, probaragente, historial).
 * Configuración estilo Retell: guion completo en Markdown + ajustes + catálogo en solo lectura +
 * prueba en vivo. Reglas: precios y textos legales nunca en el guion (regla 11), el flujo lo decide
 * la máquina de estados (regla 12) y publicar SIEMPRE corre la suite de evaluación (regla 13).
 * Datos: /admin/agent, /admin/agent/review, /draft, /draft/publish, /versions, /restore, /test.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Link,
  useBlocker,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  Upload,
  Cpu,
  FileText,
  FlaskConical,
  GitCompare,
  History,
  MessagesSquare,
  Coins,
  Library,
  MessageCircle,
  Package,
  RotateCcw,
  Settings2,
  Shield,
  Save,
  SlidersHorizontal,
  SquareCheck,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ApiError,
  api,
  errorMessage,
  type AgentFields,
  type AgentIssue,
  type AgentOverview,
  type AgentTestRecord,
  type AgentVersion,
  type AgentVersionInfo,
} from "@/lib/api";
import { fmtDateTime, fmtMs, fmtWhen, formatPct } from "@/lib/format";
import { lintGuion } from "@/lib/guion-lint";
import { renderWhatsApp } from "@/lib/text-format";
import { downloadJson, exportName } from "@/lib/download";
import { PROCESS_LABEL } from "@/lib/labels";
import { reasonFor } from "@/lib/roles";
import { useUser } from "@/auth/session";
import { keys } from "@/hooks/queries";
import {
  PROFILE_FLAG_TEXT,
  PROFILE_LABEL,
  TERMINAL,
  useAgentTest,
  type AgentTest,
  type TestSource,
} from "@/hooks/use-agent-test";
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
} from "@/components/rpa/common";
import { VersionStatus } from "@/components/rpa/status";
import {
  PromptEditor,
  type EditorIssue,
  type PromptEditorHandle,
} from "@/components/rpa/agent/prompt-editor";
import {
  WhatsAppPreview,
  voiceTranscriptText,
  type ChatItem,
} from "@/components/rpa/agent/whatsapp-preview";
import { AgentBrainsSelector, KnowledgeTab } from "@/pages/conocimiento";
import { UsageTab } from "@/pages/consumo";
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
} from "@/components/rpa/agent/parts";
import {
  EvalProgress,
  PromptDiff,
  PublishDialog,
  SaveDialog,
  VerdictBadge,
  VerdictCallout,
} from "@/components/rpa/agent/versioning";
import { TemplatesEditor } from "@/components/rpa/agent/templates-editor";
import {
  FlowEditor,
  menuOptionsText,
} from "@/components/rpa/agent/flow-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const AGENT_TABS = [
  "configuracion",
  "probar",
  "historial",
  "evaluaciones",
  "conocimiento",
  "consumo",
] as const;
export type AgentTab = (typeof AGENT_TABS)[number];
const CAMPAIGN = "Claro Móvil";
const EVAL_POLL_MS = 5_000;

const fieldsOf = (v: AgentFields): AgentFields => ({
  agentName: v.agentName,
  companyName: v.companyName,
  companyInfo: v.companyInfo,
  welcome: v.welcome,
  prompt: v.prompt,
  model: v.model,
  temperature: v.temperature,
  // D-013: un servidor anterior a las plantillas no las manda.
  templates: v.templates ?? [],
  reactivation: v.reactivation ?? { minutes: 5, max: 0 },
  // D-015: ni el flujo (entonces no se envía y el servidor usa el de la campaña).
  ...(v.flow ? { flow: v.flow } : {}),
});
const keyOf = (f: AgentFields) => JSON.stringify(f);

/**
 * Lo que el motor hace por código (regla 12). D-015: qué dice el agente y qué camino toma la
 * conversación se configuran (guion, plantillas, flujo y Brains); esto protege la venta.
 */
const ENGINE_FUNCTIONS = [
  "Autorización determinista: solo un «SÍ» explícito y escrito es consentimiento; el texto legal queda con su hash.",
  "Tras el «SÍ», pedir los datos y dar «Finalizar» en Abaya: la venta pasa a la cola de backoffice.",
  "Cerrar el chat en Abaya: soporte, sin venta (con su etiqueta) o por inactividad tras la reactivación.",
  "Aplicar el flujo configurado: letras del menú, datos por proceso, qué hacer con lo que no es de venta y orden de las imágenes.",
  "Precios, planes e imágenes solo del catálogo publicado; cada cifra del modelo se verifica.",
  "Validar cada respuesta: si falla, regenera una vez y luego envía la plantilla «Respuesta segura».",
];

export function AgentePage() {
  const me = useUser();
  const admin = me.role === "ADMIN";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { tab: rawTab } = useParams({ from: "/shell/agente/$tab" });
  const tab: AgentTab = (AGENT_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as AgentTab)
    : "configuracion";

  const [evaluatingPoll, setEvaluatingPoll] = useState(false);
  const agent = useQuery({
    queryKey: keys.agent,
    queryFn: api.agent,
    refetchInterval: evaluatingPoll ? EVAL_POLL_MS : false,
  });
  const versions = useQuery({
    queryKey: keys.agentVersions,
    queryFn: api.agentVersions,
    refetchInterval: evaluatingPoll ? EVAL_POLL_MS : false,
  });
  const data = agent.data;
  const working = data?.working ?? null;
  // D-005: la evaluación corre aparte del estado de la versión (puede estar ya publicada).
  const runningVersion =
    (versions.data ?? []).find((v) => v.evalVerdict === "RUNNING") ?? null;
  const evaluating = working?.evalVerdict === "RUNNING" || !!runningVersion;
  useEffect(() => setEvaluatingPoll(evaluating), [evaluating]);

  // ───── Formulario (borrador en edición) ─────
  const base = useMemo(
    () => (data ? fieldsOf(data.working ?? data.published) : null),
    [data],
  );
  const [form, setForm] = useState<AgentFields | null>(null);
  const dirty = !!form && !!base && keyOf(form) !== keyOf(base);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    // Datos nuevos del servidor (evaluación terminada, otro ADMIN guardó…): solo si no hay cambios propios.
    if (base && (!form || !dirtyRef.current)) setForm(base);
  }, [base]);
  const set = <K extends keyof AgentFields>(k: K, v: AgentFields[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  // ───── Revisión en vivo (servidor) con respaldo local para el guion ─────
  const [review, setReview] = useState<{
    key: string;
    issues: AgentIssue[];
  } | null>(null);
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
      ? review!.issues
          .filter((i) => i.field === "prompt")
          .map((i) => ({ line: i.line, message: i.message }))
      : lintGuion(form.prompt).map((i) => ({
          line: i.line,
          match: i.match,
          message: i.message,
        }))
    : [];
  const otherIssues = (review?.issues ?? []).filter(
    (i) => i.field !== "prompt",
  );
  const issuesFor = (f: keyof AgentFields) =>
    otherIssues.filter((i) => i.field === f).map((i) => i.message);
  const hasErrors = promptIssues.length + otherIssues.length > 0;

  // ───── Prueba (compartida entre la columna derecha y la pestaña Probar agente) ─────
  const onIssues = useCallback(
    (issues: AgentIssue[]) => form && setReview({ key: keyOf(form), issues }),
    [form],
  );
  const test = useAgentTest({
    defaultSource: admin ? "editor" : "published",
    onIssues,
  });
  // D-017: el robot abre la conversación de prueba (al cargar y al reiniciar), como en Abaya.
  const openTest = test.open;
  const testEmpty = test.items.length === 0 && !test.error;
  useEffect(() => {
    if (form && testEmpty) void openTest(form);
  }, [form, testEmpty, openTest]);
  // Versión abierta en el historial (también se abre desde el aviso de «Prueba guardada»).
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);
  // La prueba queda en la versión con la que EMPEZÓ la conversación, aunque mientras tanto se
  // publique otra.
  const startedVersion = useRef<
    { id: string; version: number } | null | undefined
  >(undefined);

  // ───── Acciones ─────
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: keys.agent }),
      qc.invalidateQueries({ queryKey: keys.agentVersions }),
    ]);
  };
  const resetToServer = async () => {
    dirtyRef.current = false;
    setForm(null);
    await refresh();
  };
  // D-005: guardar (borrador) y publicar al instante. D-008: ninguno de los dos evalúa (gasta
  // tokens); la evaluación de la versión publicada se lanza a pedido en Configuración → Evaluación.
  const [saveOpen, setSaveOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const save = useMutation({
    mutationFn: (o: { note: string }) =>
      api.saveAgentDraft(
        form!,
        o.note.trim() ? { changeNote: o.note.trim() } : {},
      ),
    onSuccess: async (v) => {
      toast.success(`Borrador v${v.version} guardado`, {
        description:
          "El robot sigue con la versión publicada hasta que publiques.",
      });
      setSaveOpen(false);
      await resetToServer();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.issues && form)
        setReview({ key: keyOf(form), issues: err.issues });
      toast.error(errorMessage(err, "No se pudo guardar."));
    },
  });
  const evaluate = useMutation({
    mutationFn: (id: string) => api.evaluateAgentVersion(id),
    onSuccess: async (v) => {
      toast.success("Evaluación iniciada", {
        description: `v${v.version}: la suite corre en segundo plano.`,
      });
      setEvaluatingPoll(true);
      await refresh();
    },
    onError: (err) =>
      toast.error(errorMessage(err, "No se pudo iniciar la evaluación.")),
  });
  // D-005: con cambios en el editor, se guardan como versión nueva y esa se publica.
  const publish = useMutation({
    mutationFn: async (o: { note: string; applyToOpen: boolean }) => {
      const versionId = dirtyRef.current
        ? (
            await api.saveAgentDraft(
              form!,
              o.note ? { changeNote: o.note } : {},
            )
          ).id
        : working!.id;
      return api.publishAgent({
        versionId,
        ...(o.note ? { reason: o.note } : {}),
        applyToOpen: o.applyToOpen,
        evaluate: false,
      });
    },
    onSuccess: async (r) => {
      const scope = r.applyToOpen
        ? `Ya la usan las conversaciones nuevas y ${r.openConversations} en curso.`
        : "La usan las conversaciones nuevas; las que están en curso terminan con su versión.";
      toast.success(`v${r.version} publicada`, { description: scope });
      setPublishOpen(false);
      if (r.evaluation === "RUNNING") setEvaluatingPoll(true);
      await resetToServer();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.issues && form)
        setReview({ key: keyOf(form), issues: err.issues });
      toast.error(errorMessage(err, "No se pudo publicar."));
    },
  });
  const [restoreFor, setRestoreFor] = useState<AgentVersionInfo | null>(null);
  const restore = useMutation({
    mutationFn: (v: AgentVersionInfo) => api.restoreAgentVersion(v.id),
    onSuccess: async (d, v) => {
      toast.success(
        `Contenido de v${v.version} copiado como borrador v${d.version}`,
      );
      await resetToServer();
      void navigate({ to: "/agente/$tab", params: { tab: "configuracion" } });
    },
    onError: (err) =>
      toast.error(errorMessage(err, "No se pudo restaurar la versión.")),
  });
  // D-019: llevar una versión a otro ambiente (local → producción) como archivo.
  const exportVersion = async (v: AgentVersionInfo) => {
    try {
      downloadJson(
        await api.exportAgentVersion(v.id),
        exportName(`agente-v${v.version}`),
      );
      toast.success(`v${v.version} exportada: impórtala en el otro ambiente desde el Historial`);
    } catch (err) {
      toast.error(errorMessage(err, "No se pudo exportar la versión."));
    }
  };
  const importVersion = useMutation({
    mutationFn: (f: File) => api.importAgentVersion(f),
    onSuccess: async (d) => {
      toast.success(
        `Importada como borrador v${d.version}: pruébala, evalúala y publícala` +
          (d.modelReset
            ? ". Su modelo no está permitido aquí: quedó el modelo por defecto"
            : ""),
      );
      await resetToServer();
      void navigate({ to: "/agente/$tab", params: { tab: "configuracion" } });
    },
    onError: (err) => {
      const issues =
        err instanceof ApiError && err.issues?.length
          ? `: ${err.issues
              .slice(0, 3)
              .map((i) => i.message)
              .join("; ")}`
          : "";
      toast.error(
        `${errorMessage(err, "No se pudo importar la versión.")}${issues}`,
      );
    },
  });

  // ───── Cambios sin guardar: avisar antes de salir ─────
  useEffect(() => {
    if (!dirty) return;
    const on = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", on);
    return () => window.removeEventListener("beforeunload", on);
  }, [dirty]);
  const blocker = useBlocker({
    shouldBlockFn: ({ next }) =>
      dirtyRef.current && !next.pathname.startsWith("/agente"),
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
        <ErrorState
          message="No se pudo cargar la configuración del agente."
          onRetry={() => void agent.refetch()}
          retrying={agent.isFetching}
        />
      </Panel>
    );
  }

  const pub = data.published;
  // D-004: versión que se está probando (el editor sin cambios = la versión en curso).
  const liveTestedVersion =
    test.source === "published"
      ? pub.builtIn
        ? null
        : { id: pub.id!, version: pub.version }
      : dirty
        ? null
        : working
          ? { id: working.id, version: working.version }
          : pub.builtIn
            ? null
            : { id: pub.id!, version: pub.version };
  // Se fija al primer mensaje de la conversación y se suelta al reiniciarla: la prueba queda en
  // la versión con la que se conversó, aunque mientras tanto se publique otra.
  if (test.items.length === 0) startedVersion.current = undefined;
  else if (startedVersion.current === undefined)
    startedVersion.current = liveTestedVersion;
  const testedVersion =
    startedVersion.current !== undefined
      ? startedVersion.current
      : liveTestedVersion;
  const status = working?.status ?? "PUBLISHED";
  const pubLine = pub.builtIn
    ? "la v1 del código"
    : `v${pub.version} publicada ${pub.publishedAt ? fmtDateTime(pub.publishedAt) : ""}${pub.publishedBy ? ` por ${pub.publishedBy}` : ""}`;
  const stillPub = pub.builtIn ? "la v1 del código" : `la v${pub.version}`;
  const meta = !working
    ? `${pub.builtIn ? "v1 del código · sin versiones guardadas" : pubLine} · ${dirty ? "con cambios en el editor" : "sin cambios"}`
    : working.evalVerdict === "RUNNING"
      ? `v${working.version} en evaluación · sigue publicada ${stillPub}`
      : working.status === "REJECTED"
        ? `v${working.version} rechazada ${fmtWhen(working.updatedAt).toLowerCase()} · sigue publicada ${stillPub}`
        : `v${working.version} de ${working.createdBy}${working.changeNote ? ` · «${working.changeNote}»` : ""} · sigue publicada ${stillPub}`;

  const editReason = reasonFor(me.role, "editarAgente");
  // D-004: se puede editar mientras evalúa; guardar otra versión cancela esa evaluación.
  const readOnly = !admin;
  const saveReason = hasErrors
    ? "Corrige los errores del guion para guardar"
    : undefined;
  const serverCanEvaluate = data.canEvaluate ?? data.canPublish;
  const evaluateBlocker = !serverCanEvaluate
    ? (data.evaluateBlocker ??
      data.publishBlocker ??
      "El servidor no puede evaluar todavía")
    : undefined;
  // D-005: publicar no depende de la evaluación; solo hace falta algo nuevo y sin errores del guion.
  const publishReason = hasErrors
    ? "Corrige los errores del guion para publicar"
    : !dirty && !working
      ? "No hay cambios para publicar"
      : undefined;

  const allVersions = versions.data ?? [];
  // D-008: lo que se evalúa a pedido es la versión publicada.
  const publishedInfo =
    allVersions.find((v) => v.status === "PUBLISHED") ?? null;
  const evaluatePublishedReason = !admin
    ? reasonFor("OPERADOR", "editarAgente")
    : pub.builtIn || !pub.id
      ? "Publica una versión primero: la v1 del código no se evalúa desde el panel"
      : evaluating
        ? "Ya hay una evaluación en curso"
        : evaluateBlocker;
  const latest = allVersions.reduce<AgentVersionInfo | null>(
    (a, v) => (!a || v.version > a.version ? v : a),
    null,
  );
  // Resultado que se avisa en Configuración: el del borrador en curso o, sin borrador, el de la publicada.
  const calloutFor: AgentVersionInfo | null =
    working ?? allVersions.find((v) => v.status === "PUBLISHED") ?? null;
  // Última versión evaluada sin publicar, posterior a la publicada (su reporte se muestra en Historial).
  const rejected =
    [...allVersions]
      .sort((a, b) => b.version - a.version)
      .find(
        (v) =>
          v.version > pub.version &&
          v.evalSummary?.cases !== undefined &&
          (v.status === "REJECTED" ||
            (v.status === "DRAFT" && !!v.evalVerdict)),
      ) ?? null;
  const tabs: TabItem<AgentTab>[] = [
    { id: "configuracion", label: "Configuración", icon: SlidersHorizontal },
    { id: "probar", label: "Probar agente", icon: FlaskConical },
    {
      id: "historial",
      label: "Historial",
      icon: History,
      count: allVersions.length,
    },
    { id: "evaluaciones", label: "Evaluaciones", icon: SquareCheck },
    { id: "conocimiento", label: "Conocimiento", icon: Library },
    { id: "consumo", label: "Consumo", icon: Coins },
  ];
  const chatTitle = `${form.agentName || "Agente"} · ${CAMPAIGN}`;

  return (
    <>
      <AgentBar
        name={`${form.agentName || "Agente"} · ${CAMPAIGN} WhatsApp`}
        status={status}
        verdict={
          working ? <VerdictBadge verdict={working.evalVerdict} /> : undefined
        }
        meta={meta}
        unsaved={dirty}
        saving={save.isPending}
        publishing={publish.isPending}
        editReason={editReason}
        saveReason={saveReason}
        publishReason={publishReason}
        onDiscard={() => setForm(base)}
        onSave={() => setSaveOpen(true)}
        onPublish={() => setPublishOpen(true)}
      />

      <SubTabs
        items={tabs}
        active={tab}
        onChange={(t) =>
          void navigate({ to: "/agente/$tab", params: { tab: t } })
        }
      />

      {!admin && (
        <Callout tone="info">
          Solo lectura: con el rol OPERADOR puedes ver la configuración, el
          historial y probar la versión publicada.
        </Callout>
      )}
      {admin && evaluateBlocker && (
        <Callout tone="info">
          Puedes guardar y publicar. Las evaluaciones (evidencia para el
          historial) todavía no se pueden correr: {evaluateBlocker}
        </Callout>
      )}
      {evaluating && (
        <EvalProgress
          version={
            (working?.evalVerdict === "RUNNING"
              ? working.version
              : runningVersion?.version) ??
            latest?.version ??
            0
          }
          summary={
            (working?.evalVerdict === "RUNNING"
              ? working.evalSummary
              : runningVersion?.evalSummary) ?? null
          }
          published={
            working?.evalVerdict !== "RUNNING" &&
            runningVersion?.status === "PUBLISHED"
          }
        />
      )}
      {tab === "configuracion" &&
        calloutFor?.evalVerdict &&
        calloutFor.evalVerdict !== "RUNNING" && (
          <VerdictCallout
            version={calloutFor.version}
            verdict={calloutFor.evalVerdict}
            summary={calloutFor.evalSummary}
            onOpenReport={() =>
              void navigate({
                to: "/agente/$tab",
                params: { tab: "historial" },
              })
            }
          />
        )}
      {tab === "configuracion" && working?.status === "REJECTED" && (
        <Callout tone="danger">
          La v{working.version} no pasó la evaluación.{" "}
          <Link
            to="/agente/$tab"
            params={{ tab: "historial" }}
            className="font-bold underline"
          >
            Ver el reporte
          </Link>
          . Corrige el guion y guarda: se crea un borrador nuevo.
        </Callout>
      )}

      {tab === "configuracion" && (
        <ConfigTab
          data={data}
          form={form}
          set={set}
          readOnly={readOnly}
          readOnlyReason={
            !admin ? "Solo lectura · requiere rol ADMIN" : undefined
          }
          promptIssues={promptIssues}
          issuesFor={issuesFor}
          templateIssues={otherIssues.filter((i) => i.field === "templates")}
          test={test}
          chatTitle={chatTitle}
          admin={admin}
          published={publishedInfo}
          evaluateReason={evaluatePublishedReason}
          evaluateLoading={evaluate.isPending}
          onEvaluate={() => pub.id && evaluate.mutate(pub.id)}
          onOpenHistory={() =>
            void navigate({ to: "/agente/$tab", params: { tab: "historial" } })
          }
        />
      )}
      {tab === "probar" && (
        <TestTab
          data={data}
          form={form}
          test={test}
          chatTitle={chatTitle}
          admin={admin}
          // D-004: la prueba se guarda en la versión probada (el editor sin cambios = la versión en curso).
          testedVersion={testedVersion}
          onSaved={(rec) => {
            // Aparece de inmediato en su versión y en «Pruebas guardadas»; luego se recarga.
            const key = ["agent-tests", rec.versionId ?? "unversioned"];
            qc.setQueryData<AgentTestRecord[]>(key, (old) => [
              rec,
              ...(old ?? []),
            ]);
            qc.setQueryData<AgentTestRecord[]>(
              ["agent-tests", "recent"],
              (old) => (old ? [rec, ...old] : old),
            );
            void qc.invalidateQueries({ queryKey: keys.agentVersions });
            void qc.invalidateQueries({ queryKey: ["agent-tests"] });
          }}
          onOpenHistory={(versionId) => {
            setHistoryOpenId(versionId);
            void navigate({ to: "/agente/$tab", params: { tab: "historial" } });
          }}
        />
      )}
      {tab === "historial" && (
        <HistoryTab
          openId={historyOpenId}
          onOpen={setHistoryOpenId}
          versions={allVersions}
          loading={versions.isLoading}
          error={versions.isError}
          onRetry={() => void versions.refetch()}
          rejected={rejected}
          admin={admin}
          busy={restore.isPending}
          onRestore={setRestoreFor}
          onExport={(v) => void exportVersion(v)}
          onImport={(f) => importVersion.mutate(f)}
          importing={importVersion.isPending}
          previousOf={(v) =>
            allVersions
              .filter((x) => x.version < v.version)
              .sort((a, b) => b.version - a.version)[0] ?? null
          }
        />
      )}
      {tab === "evaluaciones" && (
        <EvaluationsTab versions={allVersions} loading={versions.isLoading} />
      )}
      {tab === "conocimiento" && <KnowledgeTab />}
      {tab === "consumo" && <UsageTab />}

      <ConfirmDialog
        open={!!restoreFor}
        onOpenChange={(o) => !o && setRestoreFor(null)}
        title={`¿Restaurar la v${restoreFor?.version ?? ""} como borrador?`}
        description={
          dirty
            ? "Se copia su contenido como un borrador nuevo y se pierden los cambios sin guardar del editor."
            : "Se copia su contenido como un borrador nuevo. Para que el robot lo use, publícalo."
        }
        confirmLabel="Sí, restaurar"
        danger={dirty}
        onConfirm={() => restore.mutateAsync(restoreFor!)}
      />
      <SaveDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        saving={save.isPending}
        onSave={(o) => save.mutate(o)}
      />
      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        version={working ?? null}
        fromEditor={dirty}
        publishing={publish.isPending}
        onPublish={(o) => publish.mutate(o)}
      />
      <ConfirmDialog
        open={blocker.status === "blocked"}
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
function FieldBlock({
  id,
  label,
  errors,
  help,
  children,
}: {
  id: string;
  label: string;
  errors?: string[];
  help?: ReactNode;
  children: ReactNode;
}) {
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
      {help && (
        <span className="text-xs leading-4 text-ink-subtle">{help}</span>
      )}
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
  templateIssues,
  test,
  chatTitle,
  admin,
  published,
  evaluateReason,
  evaluateLoading,
  onEvaluate,
  onOpenHistory,
}: {
  data: AgentOverview;
  form: AgentFields;
  set: <K extends keyof AgentFields>(k: K, v: AgentFields[K]) => void;
  readOnly: boolean;
  readOnlyReason?: string;
  promptIssues: EditorIssue[];
  issuesFor: (f: keyof AgentFields) => string[];
  /** D-013: problemas de la revisión en las plantillas (con su id). */
  templateIssues: AgentIssue[];
  test: AgentTest;
  chatTitle: string;
  admin: boolean;
  /** D-008: versión publicada (la que se evalúa a pedido) y su último resultado. */
  published: AgentVersionInfo | null;
  evaluateReason?: string;
  evaluateLoading: boolean;
  onEvaluate: () => void;
  onOpenHistory: () => void;
}) {
  const editor = useRef<PromptEditorHandle>(null);
  const [mode, setMode] = useState<"md" | "preview">("md");
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] wide:grid-cols-[minmax(0,1fr)_340px_360px]">
      {/* El editor ocupa todo el alto de la fila: tan largo como la columna de ajustes. */}
      <div className="min-w-0 self-stretch">
        <PromptEditor
          ref={editor}
          value={form.prompt}
          onChange={(v) => set("prompt", v)}
          readOnly={readOnly}
          readOnlyReason={readOnlyReason}
          mode={mode}
          onModeChange={setMode}
          issues={promptIssues}
          maxChars={data.limits.prompt}
          minHeight={560}
          toolbar={
            <>
              <ModelSettings
                models={data.models}
                defaultModel={data.defaultModel}
                model={form.model}
                onModel={(m) => set("model", m)}
                temperature={form.temperature}
                min={data.limits.temperatureMin}
                max={data.limits.temperatureMax}
                onTemperature={(t) => set("temperature", t)}
                temperatureIgnored={!data.temperatureApplies}
                readOnly={readOnly}
              />
              {[...issuesFor("model"), ...issuesFor("temperature")].map((e) => (
                <div
                  key={e}
                  className="border-b bg-danger-soft px-4 py-2 text-xs text-danger"
                >
                  {e}
                </div>
              ))}
              <p className="m-0 border-b px-4 py-2 text-xs leading-4 text-ink-subtle">
                Organiza las instrucciones por etapa con títulos{" "}
                {data.stages.map((s, i) => (
                  <span key={s}>
                    {i > 0 && " "}
                    <code className="rounded-sm bg-surface-200 px-1 font-mono text-[11px]">
                      ## {s}
                    </code>
                  </span>
                ))}
                . El sistema le indica al modelo la etapa actual; el flujo, el
                menú, la autorización y los textos legales los controla el
                código.
              </p>
            </>
          }
        />
      </div>

      <SectionStack>
        <Section title="Ajustes del agente" icon={Settings2} defaultOpen>
          <FieldBlock
            id="agent-name"
            label="Nombre del agente"
            errors={issuesFor("agentName")}
          >
            <Input
              id="agent-name"
              value={form.agentName}
              maxLength={data.limits.agentName}
              readOnly={readOnly}
              onChange={(e) => set("agentName", e.target.value)}
            />
          </FieldBlock>
          <FieldBlock
            id="company-name"
            label="Nombre de empresa"
            errors={issuesFor("companyName")}
          >
            <Input
              id="company-name"
              value={form.companyName}
              maxLength={data.limits.companyName}
              readOnly={readOnly}
              onChange={(e) => set("companyName", e.target.value)}
            />
          </FieldBlock>
          <FieldBlock
            id="company-info"
            label="Descripción de la empresa"
            errors={issuesFor("companyInfo")}
          >
            <Textarea
              id="company-info"
              rows={4}
              value={form.companyInfo}
              maxLength={data.limits.companyInfo}
              readOnly={readOnly}
              onChange={(e) => set("companyInfo", e.target.value)}
            />
          </FieldBlock>
        </Section>
        <Section
          title="Evaluación"
          icon={FlaskConical}
          badge={
            published?.evalVerdict ? (
              <VerdictBadge verdict={published.evalVerdict} />
            ) : undefined
          }
        >
          <PublishedEvaluation
            published={published}
            reason={evaluateReason}
            loading={evaluateLoading}
            onEvaluate={onEvaluate}
            onOpenHistory={onOpenHistory}
          />
        </Section>
        <Section title="Mensaje de bienvenida" icon={MessageCircle} defaultOpen>
          <Textarea
            aria-label="Saludo de bienvenida"
            rows={3}
            value={form.welcome}
            maxLength={data.limits.welcome}
            readOnly={readOnly}
            aria-invalid={issuesFor("welcome").length > 0 || undefined}
            onChange={(e) => set("welcome", e.target.value)}
          />
          {issuesFor("welcome").map((e) => (
            <span key={e} className="text-xs leading-4 text-danger">
              {e}
            </span>
          ))}
          <div className="flex flex-col gap-1 rounded-md bg-surface-200 px-3 py-2.5 text-[13px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <Workflow {...ICON} className="size-3.5" aria-hidden />
              Menú (se edita en «Flujo»)
            </span>
            <div className="whitespace-pre-wrap">
              {renderWhatsApp(
                form.flow ? menuOptionsText(form.flow) : data.menuOptions,
              )}
            </div>
          </div>
          <span className="text-xs leading-4 text-ink-subtle">
            Sin promesas («gratis», «te regalo»), enlaces ni marcadores. Lo
            envía el sistema tal cual, seguido del menú. Si el saludo ya trae
            las opciones, se envían una sola vez.
          </span>
        </Section>
        {form.flow && (
          <Section
            title="Flujo"
            icon={Workflow}
            badge={
              issuesFor("flow").length ? (
                <span className="text-xs font-medium text-danger">
                  {issuesFor("flow").length}
                </span>
              ) : undefined
            }
          >
            <FlowEditor
              flow={form.flow}
              templates={form.templates}
              onChange={(f) => set("flow", f)}
              errors={issuesFor("flow")}
              readOnly={readOnly}
              maxMenuText={data.flowOptions?.limits.menuText ?? 60}
            />
          </Section>
        )}
        <Section
          title="Plantillas"
          icon={FileText}
          badge={
            <span className="ai-num text-xs font-medium text-ink-subtle">
              {form.templates.length}
            </span>
          }
        >
          <TemplatesEditor
            templates={form.templates}
            reactivation={form.reactivation}
            onChange={(t) => set("templates", t)}
            onReactivation={(r) => set("reactivation", r)}
            issues={templateIssues}
            readOnly={readOnly}
            readOnlyReason={readOnlyReason}
          />
        </Section>
        <Section
          title="Catálogo"
          icon={Package}
          badge={<LockedBadge>Solo lectura</LockedBadge>}
          defaultOpen
        >
          <CatalogReadOnly
            plans={data.catalog}
            canInsert={!readOnly}
            onInsert={(m) => editor.current?.insert(m)}
          />
        </Section>
        <Section title="Conocimiento (Brains)" icon={Library}>
          <p className="m-0 text-xs text-ink-subtle">
            Brains publicados que usa el agente: un solo catálogo y los
            documentos que quieras. Sus datos van al modelo como información,
            nunca como instrucciones.
          </p>
          <AgentBrainsSelector />
        </Section>
        <Section
          title="Reglas del sistema"
          icon={Shield}
          badge={<LockedBadge>No editable</LockedBadge>}
        >
          <p className="m-0 text-xs text-ink-subtle">
            Van siempre antes del guion y no se pueden cambiar desde el panel.
          </p>
          <pre className="m-0 max-h-[360px] overflow-auto rounded-md bg-surface-200 px-3 py-2.5 font-mono text-[12.5px] leading-[19px] whitespace-pre-wrap text-ink-muted">
            {data.systemRules}
          </pre>
        </Section>
        <Section
          title="Funciones del motor"
          icon={Cpu}
          badge={<LockedBadge>En código</LockedBadge>}
        >
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[13px] text-ink-muted">
            {ENGINE_FUNCTIONS.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <span className="text-xs text-ink-subtle">
            Las decide la máquina de estados; no se configuran visualmente.
          </span>
        </Section>
      </SectionStack>

      <div className="lg:col-span-2 wide:col-span-1">
        <Panel
          title="Probar agente"
          icon={FlaskConical}
          actions={
            <IconAction
              icon={RotateCcw}
              label="Reiniciar conversación"
              onClick={test.reset}
            />
          }
          flush
        >
          <div className="flex flex-col gap-3 p-4">
            <SourcePicker
              test={test}
              admin={admin}
              published={data.published.version}
            />
            {test.error && <Callout tone="danger">{test.error}</Callout>}
            <WhatsAppPreview
              items={test.items}
              title={chatTitle}
              typing={test.sending}
              sending={test.sending}
              lockedReason={endedReason(test)}
              onSend={(t) => void test.send(t, form)}
              onSendAudio={(audio, sec) =>
                void test.sendAudio(audio, sec, form)
              }
              empty="Escribe o graba una nota de voz como si fueras el cliente (por ejemplo «Hola»). El primer mensaje recibe la bienvenida y el menú."
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
  return t
    ? `Conversación terminada: ${t}. Reinicia para probar otra vez.`
    : undefined;
}

function SourcePicker({
  test,
  admin,
  published,
}: {
  test: AgentTest;
  admin: boolean;
  published: number;
}) {
  return (
    <Segmented<TestSource>
      label="Qué probar"
      value={test.source}
      onChange={test.setSource}
      className="w-full [&>button]:flex-1 [&>button]:justify-center"
      items={[
        {
          id: "editor",
          label: "Lo que hay en el editor",
          disabled: admin ? undefined : reasonFor("OPERADOR", "probarEditor"),
        },
        { id: "published", label: `Versión publicada (v${published})` },
      ]}
    />
  );
}

/* ───────────── Probar agente ───────────── */
function TestTab({
  data,
  form,
  test,
  chatTitle,
  admin,
  testedVersion,
  onSaved,
  onOpenHistory,
}: {
  data: AgentOverview;
  form: AgentFields;
  test: AgentTest;
  chatTitle: string;
  admin: boolean;
  testedVersion: { id: string; version: number } | null;
  onSaved: (rec: AgentTestRecord) => void;
  onOpenHistory: (versionId: string) => void;
}) {
  // Las marcas del flujo solo se muestran cuando están activas.
  const profile = Object.entries(test.state.profile).filter(
    ([k, v]) => PROFILE_LABEL[k] && v !== false,
  );
  const options: {
    id: TestSource;
    title: string;
    sub: string;
    reason?: string;
  }[] = [
    {
      id: "editor",
      title: "Lo que hay en el editor",
      sub: "Incluso sin guardar · solo ADMIN",
      reason: admin ? undefined : reasonFor("OPERADOR", "probarEditor"),
    },
    {
      id: "published",
      title: "Versión publicada",
      sub: `v${data.published.version} · lo que ven los clientes`,
    },
  ];
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)] wide:grid-cols-[300px_minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-4">
        <Panel title="Qué probar">
          <div
            role="radiogroup"
            aria-label="Qué probar"
            className="flex flex-col gap-1"
          >
            {options.map((o) => (
              <label
                key={o.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 py-2",
                  o.reason && "cursor-not-allowed opacity-55",
                )}
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
                  <span className="text-xs text-ink-subtle">
                    {o.reason ?? o.sub}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <ActionButton
            variant="secondary"
            icon={RotateCcw}
            className="mt-3 w-full"
            onClick={test.reset}
            disabled={test.sending}
          >
            Reiniciar conversación
          </ActionButton>
        </Panel>
        <SaveTestPanel
          test={test}
          admin={admin}
          testedVersion={testedVersion}
          onSaved={onSaved}
          onOpenHistory={onOpenHistory}
        />
        <Callout tone="info" icon={Shield}>
          Simulación con el motor real: máquina de estados, catálogo y
          validadores. No toca Abaya.
        </Callout>
        {data.provider === "simulado" && (
          <Callout tone="warning">
            Con el proveedor <b>simulado</b> responde un cerebro heurístico que
            no lee el guion: sirve para probar el flujo, no la redacción. Para
            probar el guion configura un proveedor real con su API key.
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
          onSendAudio={(audio, sec) => void test.sendAudio(audio, sec, form)}
          empty="Escribe o graba una nota de voz como si fueras el cliente (por ejemplo «Hola»). El primer mensaje recibe la bienvenida y el menú."
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
                  {typeof v === "boolean" ? (
                    (PROFILE_FLAG_TEXT[k] ?? "Sí")
                  ) : k === "process" ? (
                    (PROCESS_LABEL[v] ?? v)
                  ) : /plan/i.test(k) ? (
                    <code className="rounded-[5px] bg-cat-tyt-soft px-1.5 font-mono text-xs text-code-marker">
                      {v}
                    </code>
                  ) : (
                    v
                  )}
                </dd>
              </span>
            ))}
            <dt className="text-ink-subtle">Proveedor</dt>
            <dd className="m-0 font-semibold break-words text-ink">
              {test.provider ?? data.provider}
            </dd>
          </dl>
        </Panel>
        <Panel title="Etapas">
          <StageTrack
            stages={[...data.stages, "TRANSFERENCIA"]}
            current={test.state.stage}
          />
          <p className="mt-2 mb-0 text-xs text-ink-subtle">
            Las etapas las decide la máquina de estados, no el modelo.
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ───────────── Guardar una prueba (D-004) ───────────── */
function SaveTestPanel({
  test,
  admin,
  testedVersion,
  onSaved,
  onOpenHistory,
}: {
  test: AgentTest;
  admin: boolean;
  testedVersion: { id: string; version: number } | null;
  onSaved: (rec: AgentTestRecord) => void;
  onOpenHistory: (versionId: string) => void;
}) {
  const [note, setNote] = useState("");
  // Mensajes de la conversación cuando se guardó: no se vuelve a guardar la misma (duplicados).
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const alreadySaved = savedAt !== null && savedAt === test.items.length;
  const saveTest = useMutation({
    mutationFn: () =>
      api.saveAgentTest({
        ...(testedVersion ? { versionId: testedVersion.id } : {}),
        source: test.source,
        finalStage: test.state.stage,
        ...(note.trim() ? { note: note.trim() } : {}),
        transcript: test.items.map((it) =>
          it.kind === "event"
            ? { role: "event" as const, text: it.text }
            : {
                role:
                  it.from === "client"
                    ? ("customer" as const)
                    : ("bot" as const),
                // D-010: la nota de voz se guarda como lo que se entendió, no como audio.
                text: voiceTranscriptText(it),
              },
        ),
      }),
    onSuccess: (rec) => {
      toast.success("Prueba guardada", {
        description: rec.version
          ? `En el historial de la v${rec.version}.`
          : "Sin versión: el editor tenía cambios sin guardar. Está en Historial → Pruebas guardadas.",
        ...(rec.versionId
          ? {
              action: {
                label: "Ver en el historial",
                onClick: () => onOpenHistory(rec.versionId!),
              },
            }
          : {}),
      });
      setNote("");
      setSavedAt(test.items.length);
      onSaved(rec);
    },
    onError: (err) =>
      toast.error(errorMessage(err, "No se pudo guardar la prueba.")),
  });
  return (
    <Panel title="Guardar esta prueba">
      <div className="flex flex-col gap-2">
        <Input
          aria-label="Nota de la prueba"
          placeholder="Ej.: objeción de precio en portabilidad"
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <ActionButton
          variant="secondary"
          icon={Save}
          loading={saveTest.isPending}
          reason={
            !admin
              ? reasonFor("OPERADOR", "editarAgente")
              : test.items.length === 0
                ? "Primero conversa con el agente"
                : alreadySaved
                  ? "Esta conversación ya está guardada: sigue conversando o reiníciala"
                  : undefined
          }
          onClick={() => saveTest.mutate()}
        >
          Guardar en el historial
        </ActionButton>
        <span className="text-xs text-ink-subtle">
          {testedVersion
            ? `Queda en la v${testedVersion.version}.`
            : "El editor tiene cambios sin guardar: la prueba queda sin versión."}
        </span>
      </div>
    </Panel>
  );
}

/* ───────────── Historial ───────────── */
function evalLine(v: AgentVersionInfo): ReactNode {
  const s = v.evalSummary;
  if (v.evalVerdict === "RUNNING" || v.status === "EVALUATING") {
    const done = s?.progress?.done ?? 0;
    const total = s?.progress?.total;
    return (
      <div className="w-[150px]">
        <div
          className="ai-progress-stripes h-2 animate-pulse rounded-full"
          role="progressbar"
          aria-label="Evaluación en curso"
        />
        <span className="text-xs text-ink-subtle tabular-nums">
          {total ? `${done} de ${total} casos` : "en curso…"}
        </span>
      </div>
    );
  }
  if (!s) return "—";
  if (s.cases === undefined)
    return (
      <span className="whitespace-normal text-danger">
        {s.problems?.[0] ?? "—"}
      </span>
    );
  const pct = evalPct(s);
  return `${pct === null ? "—" : formatPct(pct)} · ${s.invented ?? 0} inventado${s.invented === 1 ? "" : "s"}`;
}

function HistoryTab({
  openId,
  onOpen: setOpenId,
  versions,
  loading,
  error,
  onRetry,
  rejected,
  admin,
  busy,
  onRestore,
  previousOf,
  onExport,
  onImport,
  importing,
}: {
  openId: string | null;
  onOpen: (id: string | null) => void;
  versions: AgentVersionInfo[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  rejected: AgentVersionInfo | null;
  admin: boolean;
  busy: boolean;
  onRestore: (v: AgentVersionInfo) => void;
  previousOf: (v: AgentVersionInfo) => AgentVersionInfo | null;
  /** D-019: llevar una versión a otro ambiente (local → producción). */
  onExport: (v: AgentVersionInfo) => void;
  onImport: (file: File) => void;
  importing: boolean;
}) {
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const opened = sorted.find((v) => v.id === openId) ?? null;
  return (
    <>
      {rejected?.evalSummary && (
        <EvalReport
          version={rejected.version}
          summary={rejected.evalSummary}
          verdict={rejected.evalVerdict}
          badge={
            rejected.evalVerdict ? (
              <VerdictBadge verdict={rejected.evalVerdict} />
            ) : undefined
          }
        />
      )}
      <Panel
        title="Historial de versiones"
        icon={History}
        flush
        actions={
          <>
            <input
              id="agent-import-file"
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onImport(f);
              }}
            />
            <ActionButton
              size="sm"
              variant="secondary"
              icon={Upload}
              loading={importing}
              reason={admin ? undefined : reasonFor("OPERADOR", "editarAgente")}
              onClick={() => document.getElementById("agent-import-file")?.click()}
            >
              Importar versión
            </ActionButton>
          </>
        }
      >
        {loading ? (
          <div className="p-5">
            <SkeletonCard className="h-40" />
          </div>
        ) : error ? (
          <ErrorState
            message="No se pudo cargar el historial."
            onRetry={onRetry}
          />
        ) : sorted.length === 0 ? (
          <Empty icon={History} title="Sin versiones guardadas">
            El robot usa la v1 del código. Guarda un cambio en Configuración
            para empezar el historial.
          </Empty>
        ) : (
          <Table className="[&_td]:px-3 [&_th]:px-3">
            <TableHeader>
              <TableRow>
                <TableHead>Versión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Nota del cambio</TableHead>
                <TableHead>Guardó</TableHead>
                <TableHead>Publicó</TableHead>
                <TableHead>Evaluación</TableHead>
                <TableHead>Conversaciones</TableHead>
                <TableHead>Pruebas</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((v) => (
                <TableRow
                  key={v.id}
                  className={cn(openId === v.id && "bg-primary-soft/40")}
                >
                  <TableCell className="font-semibold">v{v.version}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <VersionStatus status={v.status} />
                      {/* D-005: el resultado es evidencia de cada versión, publicada o no. */}
                      {(v.evalVerdict || v.status === "DRAFT") && (
                        <VerdictBadge verdict={v.evalVerdict} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px] whitespace-normal text-ink-muted">
                    {v.changeNote ?? "—"}
                  </TableCell>
                  <TableCell>
                    {v.createdBy} · {fmtWhen(v.updatedAt)}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {v.publishedAt ? (
                      <span
                        title={
                          v.publishReason
                            ? `Nota: ${v.publishReason}`
                            : undefined
                        }
                      >
                        {v.publishedBy ?? "—"} · {fmtWhen(v.publishedAt)}
                        {v.appliedToOpen && (
                          <span className="ml-1.5 rounded-full bg-warning-soft px-2 py-px text-[11px] font-semibold text-warning">
                            urgente
                          </span>
                        )}
                        {v.publishReason && (
                          <span className="block text-xs text-ink-subtle">
                            «{v.publishReason}»
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{evalLine(v)}</TableCell>
                  <TableCell>
                    {v.conversations ? (
                      <Link
                        to="/trazabilidad"
                        search={{ version: String(v.version), rango: "30d" }}
                        className="font-semibold text-primary-soft-ink tabular-nums hover:underline"
                      >
                        {v.conversations}
                      </Link>
                    ) : (
                      <span className="text-ink-subtle">0</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{v.tests ?? 0}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <ActionButton
                      variant="ghost"
                      size="sm"
                      icon={ChevronDown}
                      aria-expanded={openId === v.id}
                      onClick={() => setOpenId(openId === v.id ? null : v.id)}
                    >
                      {openId === v.id ? "Ocultar" : "Detalle"}
                    </ActionButton>
                    {admin && (
                      <ActionButton
                        variant="ghost"
                        size="sm"
                        icon={Download}
                        onClick={() => onExport(v)}
                      >
                        Exportar
                      </ActionButton>
                    )}
                    {v.status !== "DRAFT" && v.status !== "EVALUATING" && (
                      <ActionButton
                        variant="ghost"
                        size="sm"
                        icon={RotateCcw}
                        reason={
                          admin
                            ? busy
                              ? "Espera a que termine la acción en curso"
                              : undefined
                            : reasonFor("OPERADOR", "editarAgente")
                        }
                        onClick={() => onRestore(v)}
                      >
                        Restaurar
                      </ActionButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      {opened && (
        <VersionDetail version={opened} previous={previousOf(opened)} />
      )}
      <RecentTests
        openId={openId}
        onOpen={(id) => {
          setOpenId(id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </>
  );
}

/**
 * Todas las pruebas guardadas, las más recientes primero, con la versión en que quedaron: así se
 * encuentran siempre, aunque se hayan guardado en otra versión de la que se está mirando.
 */
function RecentTests({
  openId,
  onOpen,
}: {
  openId: string | null;
  onOpen: (versionId: string) => void;
}) {
  const [all, setAll] = useState(false);
  const tests = useQuery({
    queryKey: ["agent-tests", "recent"],
    queryFn: api.recentAgentTests,
    refetchOnMount: "always",
  });
  if (tests.isLoading)
    return (
      <Panel title="Pruebas guardadas" icon={MessagesSquare}>
        <SkeletonCard className="h-24" />
      </Panel>
    );
  if (tests.isError || !tests.data?.length) return null;
  const shown = all ? tests.data : tests.data.slice(0, 8);
  return (
    <Panel
      title={`Pruebas guardadas · ${tests.data.length}`}
      icon={MessagesSquare}
    >
      <div className="flex flex-col gap-2">
        {shown.map((t) => (
          <SavedTest
            key={t.id}
            test={t}
            versionLabel={t.version ? `v${t.version}` : "Sin versión"}
            onOpenVersion={
              t.versionId && t.versionId !== openId
                ? () => onOpen(t.versionId!)
                : undefined
            }
          />
        ))}
      </div>
      {tests.data.length > 8 && (
        <button
          type="button"
          className="mt-2 cursor-pointer text-[13px] font-semibold text-primary underline"
          onClick={() => setAll((x) => !x)}
        >
          {all ? "Ver menos" : `Ver las ${tests.data.length}`}
        </button>
      )}
    </Panel>
  );
}

/* ───────────── Evaluación a pedido de la versión publicada (D-008) ───────────── */
function PublishedEvaluation({
  published,
  reason,
  loading,
  onEvaluate,
  onOpenHistory,
}: {
  published: AgentVersionInfo | null;
  reason?: string;
  loading: boolean;
  onEvaluate: () => void;
  onOpenHistory: () => void;
}) {
  const s = published?.evalSummary;
  const done =
    published?.evalVerdict &&
    published.evalVerdict !== "RUNNING" &&
    s?.cases !== undefined;
  const pct = done && s ? evalPct(s) : null;
  return (
    <>
      <p className="m-0 text-xs leading-4 text-ink-subtle">
        Corre la suite de conversaciones guionadas contra el modelo real sobre
        la versión publicada. Tarda unos minutos y gasta tokens: guardar y
        publicar ya no evalúan.
      </p>
      <div className="flex flex-col gap-1 rounded-md bg-surface-200 px-3 py-2.5 text-[13px]">
        <span className="font-semibold text-ink">
          {published
            ? `Versión publicada: v${published.version}`
            : "Versión publicada: v1 del código"}
        </span>
        <span className="text-ink-muted">
          {!published?.evalVerdict ? (
            "Sin evaluaciones todavía."
          ) : published.evalVerdict === "RUNNING" ? (
            "Evaluación en curso…"
          ) : (
            <>
              {pct !== null
                ? `${formatPct(pct)} de casos correctos · ${s?.invented ?? 0} datos inventados`
                : "Sin resultado"}
              {published.evaluatedAt
                ? ` · ${fmtWhen(published.evaluatedAt).toLowerCase()}`
                : ""}
            </>
          )}
        </span>
        {done && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="cursor-pointer self-start text-xs font-semibold text-primary-soft-ink hover:underline"
          >
            Ver el reporte en el historial
          </button>
        )}
      </div>
      <ActionButton
        variant="secondary"
        icon={FlaskConical}
        loading={loading}
        reason={reason}
        onClick={onEvaluate}
      >
        Evaluar la versión publicada
      </ActionButton>
    </>
  );
}

/** Detalle de una versión: qué cambió en el guion, su evaluación y sus pruebas guardadas. */
function VersionDetail({
  version,
  previous,
}: {
  version: AgentVersionInfo;
  previous: AgentVersionInfo | null;
}) {
  const cur = useQuery({
    queryKey: ["agent-version", version.id],
    queryFn: () => api.agentVersion(version.id),
  });
  const prev = useQuery({
    queryKey: ["agent-version", previous?.id],
    queryFn: () => api.agentVersion(previous!.id),
    enabled: !!previous,
  });
  const tests = useQuery({
    queryKey: ["agent-tests", version.id],
    queryFn: () => api.agentTests(version.id),
    refetchOnMount: "always",
  });
  return (
    <div className="flex flex-col gap-4">
      <Panel title={`Qué cambió en la v${version.version}`} icon={GitCompare}>
        {cur.isLoading || prev.isLoading ? (
          <SkeletonCard className="h-32" />
        ) : cur.isError || !cur.data ? (
          <ErrorState
            message="No se pudo cargar la versión."
            onRetry={() => void cur.refetch()}
          />
        ) : previous && prev.data ? (
          <VersionChanges before={prev.data} after={cur.data} />
        ) : (
          <p className="m-0 text-[13px] text-ink-muted">
            Es la primera versión guardada: no hay otra con qué compararla.
          </p>
        )}
      </Panel>
      {version.evalSummary?.cases !== undefined && (
        <EvalReport
          version={version.version}
          summary={version.evalSummary}
          published={version.status === "PUBLISHED"}
          verdict={version.evalVerdict}
          badge={
            version.evalVerdict ? (
              <VerdictBadge verdict={version.evalVerdict} />
            ) : undefined
          }
        />
      )}
      <Panel
        title={`Pruebas guardadas de la v${version.version}`}
        icon={MessagesSquare}
      >
        {tests.isLoading ? (
          <SkeletonCard className="h-24" />
        ) : !tests.data?.length ? (
          <p className="m-0 text-[13px] text-ink-muted">
            Sin pruebas guardadas. En «Probar agente» puedes guardar una
            conversación de prueba en esta versión.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {tests.data.map((t) => (
              <SavedTest key={t.id} test={t} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

const CHANGED_FIELDS: [keyof AgentVersion, string][] = [
  ["agentName", "Nombre del agente"],
  ["companyName", "Empresa"],
  ["companyInfo", "Descripción de la empresa"],
  ["welcome", "Mensaje de bienvenida"],
  ["model", "Modelo"],
  ["temperature", "Temperatura"],
  ["templates", "Plantillas"],
  ["reactivation", "Reactivación"],
];

/** D-013: qué plantillas se agregaron, quitaron o editaron entre dos versiones. */
function templateChanges(before: AgentVersion, after: AgentVersion): string {
  const a = new Map(
    (before.templates ?? []).map((t) => [t.id, JSON.stringify(t)]),
  );
  const b = new Map(
    (after.templates ?? []).map((t) => [t.id, JSON.stringify(t)]),
  );
  const added = [...b.keys()].filter((id) => !a.has(id));
  const removed = [...a.keys()].filter((id) => !b.has(id));
  const edited = [...b.keys()].filter(
    (id) => a.has(id) && a.get(id) !== b.get(id),
  );
  return [
    added.length ? `agregadas: ${added.join(", ")}` : "",
    removed.length ? `quitadas: ${removed.join(", ")}` : "",
    edited.length ? `editadas: ${edited.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function VersionChanges({
  before,
  after,
}: {
  before: AgentVersion;
  after: AgentVersion;
}) {
  const changed = CHANGED_FIELDS.filter(
    ([k]) =>
      JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null),
  );
  return (
    <div className="flex flex-col gap-3">
      {changed.length > 0 && (
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[13px] text-ink">
          {changed.map(([k, label]) => (
            <li key={k}>
              <b>{label}</b> cambió
              {(k === "model" ||
                k === "temperature" ||
                k === "agentName" ||
                k === "companyName") && (
                <span className="text-ink-muted">
                  {" "}
                  ({String(before[k] ?? "por defecto")} →{" "}
                  {String(after[k] ?? "por defecto")})
                </span>
              )}
              {k === "templates" && (
                <span className="text-ink-muted">
                  {" "}
                  ({templateChanges(before, after) || "orden"})
                </span>
              )}
              {k === "reactivation" &&
                before.reactivation &&
                after.reactivation && (
                  <span className="ai-num text-ink-muted">
                    {" "}
                    ({before.reactivation.max} cada{" "}
                    {before.reactivation.minutes} min → {after.reactivation.max}{" "}
                    cada {after.reactivation.minutes} min)
                  </span>
                )}
            </li>
          ))}
        </ul>
      )}
      <PromptDiff
        before={before.prompt}
        after={after.prompt}
        beforeLabel={`v${before.version}`}
        afterLabel={`v${after.version}`}
      />
    </div>
  );
}

function SavedTest({
  test,
  versionLabel,
  onOpenVersion,
}: {
  test: AgentTestRecord;
  /** En «Pruebas guardadas»: en qué versión quedó. */
  versionLabel?: string;
  onOpenVersion?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 text-left text-[13px]"
      >
        {versionLabel && (
          <span className="rounded-sm bg-surface-200 px-1.5 py-0.5 text-xs font-semibold text-ink tabular-nums">
            {versionLabel}
          </span>
        )}
        <b className="font-semibold text-ink">
          {test.note ?? "Prueba sin nota"}
        </b>
        <span className="text-xs text-ink-subtle">
          {test.createdBy} · {fmtWhen(test.createdAt)} ·{" "}
          {test.source === "published" ? "versión publicada" : "editor"} ·
          terminó en {test.finalStage}
        </span>
        <ChevronDown
          {...ICON}
          className={cn(
            "ml-auto size-4 text-ink-subtle transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div className="border-t p-3">
          {onOpenVersion && (
            <button
              type="button"
              className="mb-2 cursor-pointer text-[13px] font-semibold text-primary underline"
              onClick={onOpenVersion}
            >
              Ver la {versionLabel ?? "versión"} en el historial
            </button>
          )}
          <WhatsAppPreview
            height={480}
            title={test.note ?? "Prueba guardada"}
            subtitle={`${test.source === "published" ? "Versión publicada" : "Editor"} · conversación de prueba`}
            items={test.transcript.map((m): ChatItem =>
              m.role === "event"
                ? { kind: "event", text: m.text, tone: "info" }
                : {
                    kind: "msg",
                    from: m.role === "bot" ? "bot" : "client",
                    text: m.text,
                    time: "",
                  },
            )}
            lockedReason="Prueba guardada: solo lectura."
          />
        </div>
      )}
    </div>
  );
}

/* ───────────── Evaluaciones ───────────── */
function EvaluationsTab({
  versions,
  loading,
}: {
  versions: AgentVersionInfo[];
  loading: boolean;
}) {
  const evaluated = [...versions]
    .filter((v) => v.evalSummary?.cases !== undefined)
    .sort((a, b) => b.version - a.version);
  const last = evaluated[0];
  if (loading) return <SkeletonCard className="h-60" />;
  if (!last) {
    return (
      <Panel>
        <Empty icon={SquareCheck} title="Aún no hay evaluaciones">
          La suite (69 conversaciones guionadas) corre solo cuando la pides, en
          Configuración → Evaluación, sobre la versión publicada. Es evidencia:
          no frena la publicación. Meta: 0 datos inventados y ≥ 95 % de casos
          correctos.
        </Empty>
      </Panel>
    );
  }
  const s = last.evalSummary!;
  return (
    <>
      <EvalReport
        version={last.version}
        summary={s}
        verdict={last.evalVerdict}
        published={
          last.status === "PUBLISHED" ||
          (last.status === "ARCHIVED" && !s.problems?.length)
        }
        badge={
          last.evalVerdict ? (
            <VerdictBadge verdict={last.evalVerdict} />
          ) : undefined
        }
      />
      <Panel title="Detalle de la última evaluación" icon={CheckCircle2}>
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-6 gap-y-4 text-[13px]">
          {[
            ["Proveedor", s.provider ?? "—"],
            ["Modelo", s.model ?? "por defecto"],
            ["Latencia p50", fmtMs(s.p50)],
            ["Latencia p95", fmtMs(s.p95)],
            ["Regeneración", s.regenRate ?? "—"],
            ["Respuesta segura", s.fallbackRate ?? "—"],
            ["Duración", evalDuration(s)],
            ["Terminó", fmtDateTime(s.finishedAt)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-ink-subtle">{k}</dt>
              <dd className="m-0 mt-0.5 font-semibold text-ink tabular-nums">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel title="Evaluaciones anteriores" icon={History} flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Versión</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Casos · inventados</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Terminó</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluated.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-semibold">v{v.version}</TableCell>
                <TableCell>
                  {v.evalVerdict ? (
                    <VerdictBadge verdict={v.evalVerdict} />
                  ) : (
                    <VersionStatus status={v.status} />
                  )}
                </TableCell>
                <TableCell>{evalLine(v)}</TableCell>
                <TableCell>{v.evalSummary?.provider ?? "—"}</TableCell>
                <TableCell>{fmtDateTime(v.evalSummary?.finishedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </>
  );
}
