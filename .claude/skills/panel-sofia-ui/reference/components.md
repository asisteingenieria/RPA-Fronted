# Componentes — qué usar para cada cosa

## Instalación (una vez)

```bash
# 1. Dependencias
npm i lucide-react tw-animate-css
npx shadcn@latest init          # si el proyecto aún no tiene shadcn
npx shadcn@latest add button badge card table tabs dialog alert-dialog sheet switch select tooltip \
  sonner command breadcrumb sidebar input textarea label checkbox skeleton accordion dropdown-menu \
  avatar separator scroll-area radio-group popover calendar

# 2. Tema y plantillas (rutas desde la raíz del repo)
cp .claude/skills/panel-sofia-ui/templates/styles/globals.css   src/styles/globals.css   # o la ruta de tu CSS global
mkdir -p src/components/panel
cp .claude/skills/panel-sofia-ui/templates/components/panel/*   src/components/panel/
cp .claude/skills/panel-sofia-ui/templates/lib/*                src/lib/
```

- Envuelve la app en `<TooltipProvider>` (lo requieren `OriginBadge`, `RobotStatus` y `PermissionButton`) y monta `<Toaster />` de sonner.
- Modo oscuro: clase `.dark` en `<html>`; guarda la preferencia (claro / oscuro / sistema).
- Si `components.json` usa otro alias que `@/`, ajusta los imports de las plantillas.
- Si el proyecto usa Tailwind v3: traslada el bloque `@theme inline` a `theme.extend.colors` de `tailwind.config` con los mismos nombres (`ai: "var(--ps-ai)"`, etc.) y conserva los bloques `:root`/`.dark`.

## Plantillas propias (`src/components/panel/`)

| Componente | Archivo | Úsalo para |
|---|---|---|
| `OriginBadge` | badges.tsx | Junto al título de toda pantalla/sección de edición. `kind`: `ia` · `exacto` · `legal` |
| `VersionStatus` | badges.tsx | Estado de versión: borrador, evaluacion, fallida, lista, aprobada, publicada, retirada |
| `RobotStatus` | badges.tsx | Píldora del encabezado: activo, detenido, sin-sesion, sin-senal |
| `VariableChip` | badges.tsx | Chips `[Nombre]`, `{{PLANES}}`, bloqueada (`{{FECHA}}`), desconocida |
| `Pill` | badges.tsx | Insignia genérica con los tonos del sistema (incluye success/warning/ai/exact/legal, que el Badge de shadcn no trae) |
| `WhatsAppPreview` | whatsapp-preview.tsx | Vista exacta de WhatsApp (Personalidad, Textos fijos, Campañas, Catálogo, Simulador) |
| `PublishStepper` | workflow.tsx | Ciclo Borrador → Evaluación → Aprobación → Publicada (Versiones, modal de publicar) |
| `DraftBanner` / `StopBanner` | workflow.tsx | Bandas superiores de borrador y de robot detenido |
| `EmergencyStop` | workflow.tsx | Botón rojo + AlertDialog de confirmación, siempre en el encabezado |
| `PermissionButton` | workflow.tsx | Botón que se deshabilita con tooltip de motivo cuando el rol no alcanza |
| `StatCard` | workflow.tsx | Indicadores de Inicio y Evaluaciones (`good={false}` cuando subir es malo) |
| `NAV`, `ORIGIN_DOT`, `can()` | navigation.ts | Barra lateral, punto de origen y permisos que refleja la UI |
| `renderWhatsApp`, `hasHardcodedFigures`, `findUnknownVariables`, `toggleBold` | lib/whatsapp-format.tsx | Formato WhatsApp y validaciones de editores |
| `formatCOP`, `formatPct`, `formatDate`, `formatTime`, `formatLegalDate` | lib/format.ts | Formatos colombianos |

## Pendientes de construir (con estas pautas)

| Pieza | Cómo |
|---|---|
| `TemplateEditor` (textos fijos) | CodeMirror 6. Barra: emoji (popover), **Negrita WhatsApp** (`toggleBold`), viñeta `•`, chips de variables permitidas que insertan al cursor. Decoraciones: variables como chip (`VariableChip`), desconocidas con subrayado ondulado rojo. Pie: "Última edición: usuario · fecha" a la izquierda, contador "448 / 1024 caracteres" a la derecha. Respeta saltos de línea y emojis. Ver `screens/textofijo.*.png` |
| `InstructionEditor` (pasos, IA) | Igual, + aviso ámbar en línea cuando `hasHardcodedFigures(text)`. Ver `screens/pasos.*.png` |
| `LegalEditor` | Igual, con `{{FECHA}}` como widget atómico no borrable (`VariableChip locked`); vista previa con `formatLegalDate`. Solo lectura sin rol Legal, con candado visible |
| `FlowDiagram` (pasos) | Nodos solo lectura en una fila con bifurcaciones (A/B/C → Perfilamiento → Oferta ⇄ Objeciones → Autorización → Transferencia / No autoriza). Nodo activo `border-primary bg-primary-soft text-primary`. Clic = abrir editor del paso. Puede ser HTML/CSS (no hace falta librería de grafos) |
| `Funnel` | Barras horizontales `bg-primary`, la última `bg-success`; etiqueta a la izquierda, valor tabular a la derecha. Ver `screens/inicio.*.png` |
| `VersionTimeline` | Lista vertical con línea de 1.5 px; punto publicado `bg-success` con anillo, borrador con borde punteado `border-primary` |
| `DiffView` | Línea añadida `bg-added-soft` con "+" verde, quitada `bg-removed-soft` con "−" rojo; vista unificada / lado a lado (Tabs). Cambios de precio y de texto legal resaltados con `Pill tone="warning"` |
| Debug del simulador | `Accordion` por turno: paso actual → siguiente, intención en `font-mono`, datos recogidos (`dl` de 2 columnas), validadores ✓ (`text-success`) / ✗ (`text-destructive`), respuesta segura con `Pill tone="warning"`, tiempo y proveedor |
| Gráficos (Monitoreo, Evaluaciones) | Recharts con `--chart-1…5`. Ejes y grilla en `border`/`muted-foreground`. Meta (≥ 95 %) como línea de referencia punteada |

## shadcn/ui para lo genérico

| Necesidad | Componente shadcn | Nota de estilo |
|---|---|---|
| Acciones | `Button` | `default` (primary, una por zona) · `outline` (secundaria) · `ghost` (barras, "Ver diferencias") · `destructive` (solo peligro). Tamaño `sm` en tablas y bandas |
| Contenedores | `Card` | `rounded-lg border shadow-sm`, padding 16 px, título 15 px semibold con `OriginBadge` al lado |
| Tablas | `Table` | Compactas: celdas `py-[9px] px-3 text-[13px]`, encabezado `bg-surface-2 text-xs font-medium text-muted-foreground`. Números a la derecha con `tabular` |
| Formularios | `Input`, `Textarea`, `Select`, `Switch`, `Checkbox`, `RadioGroup` + React Hook Form + zod | Etiqueta arriba (13 px medium), ayuda debajo (12.5 px muted). Switch con etiqueta a la derecha |
| Chips editables (competidores, frases, apps) | `Badge variant="secondary"` + `Input` | Enter añade, × quita |
| Panel lateral (formulario de plan, "Qué hacer") | `Sheet side="right"` | 480–560 px de ancho |
| Confirmaciones | `AlertDialog` | Botón destructivo a la derecha; publicar exige nota de cambio |
| Búsqueda global | `Command` en `CommandDialog`, atajo Ctrl+K | Grupos: Pasos, Plantillas, Planes, Conversaciones |
| Avisos en línea | `Alert` o un div con `bg-warning-soft text-warning` + ícono | Vacío con riesgo, precio en instrucción, aprobar bloqueado |
| Notificaciones | `sonner` | Textos cortos en pasado |
| Pestañas | `Tabs` | Subrayado `primary` de 2 px; contador en `Pill`; punto ámbar `size-1.5 rounded-full bg-warning` para cambios sin guardar |
| Carga | `Skeleton` | Con la forma real de tablas y tarjetas |
