# Componentes — qué usar para cada cosa

Todos usan las clases `ai-*` de `templates/styles/components.css` (las mismas de los módulos de Asiste).

## Plantillas (`src/components/rpa/`)

| Componente | Archivo | Uso |
|---|---|---|
| `Button` | ui.tsx | `primary` (una por zona) · `secondary` · `ghost` · `danger` (solo apagado y destructivas) · `danger-ghost` (Deshabilitar, Desactivar) · `navy` · `on-navy` (sobre el TopNav). `size` `sm`/`xl`. `reason` = deshabilitado con tooltip. `loading` evita doble clic |
| `IconButton` | ui.tsx | Acciones de fila (Pausar, Credenciales, Ver detalle, Más) con `label` obligatorio |
| `Badge`, `Count` | ui.tsx | Estados con texto; contador de pestaña (`alert` = cian) |
| `CampaignChip` | ui.tsx | `CLARO MÓVIL` (por defecto) |
| `Kpi` | ui.tsx | Tarjetas de En vivo; `tone="danger"` para "Requieren revisión" > 0; `onClick` para filtrar |
| `Panel` | ui.tsx | Tarjeta con encabezado; `flush` para tablas y listas |
| `PageHead` | ui.tsx | `h1` + subtítulo + acciones |
| `Tabs`, `Segmented` | ui.tsx | Subpestañas del Agente; rangos Hoy / 7 días / 30 días; Vista previa / Markdown |
| `Callout`, `Empty` | ui.tsx | Avisos ("No se puede publicar…") y estados vacíos |
| `VersionStatus`, `RobotState`, `SessionState`, `ActionResult`, `UserStatus` | status.tsx | Estados del dominio. **Ajusta las claves a los valores reales del backend** |
| `TopNav`, `AppLayout`, `EmergencyStop` | layout.tsx | Estructura de todas las pantallas; confirmación en línea del apagado |
| `PromptEditor` | agente/PromptEditor.tsx | Guion completo: textarea real + capa de resaltado, números de línea, marcadores, errores con enlace a la línea, contador. `ref.insert()` y `ref.goToLine()` |
| `ModelSettings` | agente/AgentParts.tsx | Modelo, temperatura (0–0,3) e idioma fijo, como `toolbar` del editor |
| `AgentBar` | agente/AgentParts.tsx | Encabezado del agente con Descartar · Guardar · Publicar con evaluación |
| `Section`, `SectionStack` | agente/AgentParts.tsx | Columna central plegable |
| `CatalogReadOnly` | agente/AgentParts.tsx | Catálogo por proceso con "Insertar" (ADMIN) o "Copiar marcador" (OPERADOR) |
| `StageTrack` | agente/AgentParts.tsx | Etapas del motor en "Estado de la simulación" |
| `EvalReport`, `EvalProgress` | agente/AgentParts.tsx | Evaluación rechazada (tarjeta roja + casos fallidos) y progreso de la suite |
| `OneTimeSecret` | agente/AgentParts.tsx | Contraseña temporal y código de instalación |
| `WhatsAppPreview` | agente/WhatsAppPreview.tsx | Chat de simulación: orígenes por respuesta, eventos centrados, campo bloqueado al terminar |

## Utilidades (`src/lib/`)

| Archivo | Contenido |
|---|---|
| `format.ts` | `formatCOP`, `formatPct`, `formatInt`, `formatDate`, `formatTime`, `formatClock`, `formatDayShort`, `formatDuration`, `formatAgo`, `properName` |
| `guion-lint.ts` | `lintGuion` (precios, gigas, porcentajes), `lintBienvenida` (+ promesas, enlaces, marcadores), `estimateTokens`, `insertAtCursor`, `focusLine`, `GUION_MAX_CHARS`. Si el servidor ya devuelve la revisión, úsala y deja esto como respaldo visual |
| `roles.ts` | `can(role, action)`, `REASON` (textos de tooltip), `userGuard` (salvaguardas de usuarios) |

## Patrones sin plantilla (usa las clases)

| Necesidad | Clases | Referencia |
|---|---|---|
| Tablas | `ai-card` > `ai-toolbar` + `table.ai-table.ai-table--dense` + `ai-table-foot`; `ai-table--compact` si hay muchas columnas | robots, envivo |
| Persona / robot en celda | `ai-person` / `ai-machine` + `ai-person-name` + `ai-person-sub` | usuarios, robots |
| Barra de capacidad | `ai-mini-progress` (chats abiertos / 3) | robots |
| Franja de resumen | `ai-kpi-strip` | robots |
| Semáforo general | `ai-hero-status` (`is-stopped` en rojo) | envivo |
| Lista priorizada | `ai-attn` con `ai-attn-icon danger|warning|info` | envivo |
| Indicador en vivo | `ai-live` | envivo |
| Formularios | `ai-field`, `ai-label`, `ai-input`, `ai-help`, `ai-form-grid` | login |
| Modales | `ai-overlay`, `ai-modal`, `ai-modal-head/body/foot`, `ai-modal-icon--danger`; pasos con `ai-steps` (Agregar robot → Instalar) | — |
| Drawer de detalle de robot | `ai-drawer` (sin el degradado: usa `ai-panel-head`) | — |
| Pares clave-valor | `dl.ai-kv` | probaragente |
| Login | `ai-login`, `ai-login-card` | login |
