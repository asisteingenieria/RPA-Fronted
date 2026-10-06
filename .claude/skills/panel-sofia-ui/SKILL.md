---
name: panel-sofia-ui
description: Sistema de diseño e interfaz del Panel Sofía (admin del robot RPA de ventas Claro/Abaya). Úsalo SIEMPRE que crees o modifiques cualquier pantalla, componente, estilo, tema, texto de interfaz o layout del panel de administración (React + shadcn/ui + Tailwind).
---

# Panel Sofía — cómo construir la interfaz

Eres el implementador del panel de administración del robot "Sofía". El diseño ya está definido:
tu trabajo es implementarlo fielmente con el stack del proyecto, no reinventarlo.

## Stack (no lo cambies)

React 19 + Vite + TypeScript · shadcn/ui (Radix + Tailwind CSS v4) · TanStack Router y Query ·
React Hook Form + zod · CodeMirror 6 para editores con variables · Recharts · lucide-react.
**Sin CDN, fuentes externas ni scripts de terceros** (CSP estricta): todo empaquetado localmente.

## Antes de escribir código

1. Lee `reference/design-rules.md` (reglas visuales y de contenido). Es corto; léelo entero.
2. Para la pantalla que vas a construir, lee su sección en `reference/spec-panelRPA.md` (sección 5.x)
   y mira la captura en `reference/screens/` si existe (`<pantalla>.claro.png` / `.oscuro.png`).
3. Revisa `reference/components.md` para saber qué componente usar para cada cosa.

## Arranque (una sola vez por proyecto)

Si el proyecto aún no tiene el tema, cópialo desde `templates/` (ver `reference/components.md` § Instalación):
- `templates/styles/globals.css` → hoja global (reemplaza el tema por defecto de shadcn).
- `templates/lib/*` → `src/lib/`; `templates/components/panel/*` → `src/components/panel/`.
- Componentes shadcn necesarios: `button badge card table tabs dialog alert-dialog sheet switch select tooltip sonner command breadcrumb sidebar input textarea label checkbox skeleton accordion dropdown-menu avatar separator scroll-area`.
Antes de copiar, comprueba que no existan ya; si existen, fusiona en vez de sobrescribir.

## Reglas que NO se negocian

1. **Origen del texto siempre visible.** Toda pantalla o sección que edite contenido muestra `<OriginBadge>`:
   `ia` (Personalidad, Instrucciones por paso, Objeciones) · `exacto` (Textos fijos, Catálogo, Parámetros de oferta, Campañas) · `legal` (Texto legal).
   La barra lateral repite el origen con un punto de color en cada subítem de Conversación (`ORIGIN_DOT`).
2. **Guardar nunca publica.** Pantallas de edición: `<DraftBanner>` bajo el encabezado y botón primario "Guardar borrador".
   El ciclo Borrador → Evaluación → Aprobación → Publicada se ve con `<PublishStepper>` y `<VersionStatus>`.
3. **Rojo = peligro.** `destructive`/`danger` solo para apagado de emergencia, errores, validador ✗ y alertas críticas.
   Nunca como color de marca ni para "Descartar cambios" (eso es `variant="outline"`). Ámbar (`warning`/`legal`) para advertencias y lo legal; verde (`success`) para activo/publicado.
4. **Permisos: deshabilitar con motivo, nunca ocultar.** Usa `<PermissionButton allowed={can(roles,'aprobar')} reason="Requiere rol Aprobador">`.
   El autor no puede aprobar su propio cambio (cuatro ojos): deshabilitado con explicación.
5. **Nada de cifras en textos de IA.** Los editores `ia` usan `hasHardcodedFigures()` y muestran el aviso ámbar
   "Los precios, GB y descuentos los inserta el sistema desde el Catálogo. Usa `{{PLANES}}`." Variables desconocidas → `findUnknownVariables()` → subrayado rojo.
6. **Precios, planes y reglas de oferta son formularios estructurados** (React Hook Form + zod), jamás texto libre.
7. **Confirmación obligatoria (AlertDialog)** en: publicar, revertir, apagar/reanudar robot, eliminar objeción, desactivar plan, cambiar texto legal.
8. **Vista previa de WhatsApp** junto a todo editor de contenido que ve el cliente: editor a la izquierda, `<WhatsAppPreview>` fija a la derecha (~400 px, `sticky`).
9. **Datos personales:** en Monitoreo el contenido de mensajes va oculto por defecto; "Mostrar contenido" pide motivo (se audita).
10. **Estados obligatorios** en cada vista con datos: carga (`Skeleton`), vacío (mensaje con consecuencia), error (con "Reintentar") y sin permiso ("Tu rol no permite esta acción").

## Tokens: usa clases, nunca valores sueltos

No escribas hex, rgb ni px de color en componentes. Usa las utilidades del tema:
`bg-background bg-card bg-surface-2 border-border border-border-strong text-foreground text-muted-foreground text-ink-faint`
`bg-primary text-primary-foreground bg-primary-soft text-primary` ·
`bg-ai-soft text-ai` · `bg-exact-soft text-exact` · `bg-legal-soft text-legal` · `bg-warning-soft text-warning` · `bg-success-soft text-success` · `bg-danger-soft text-destructive` ·
`bg-added-soft bg-removed-soft` (diff) · `bg-wa-*`, `text-wa-*`, `font-wa` (solo WhatsApp). Radios `rounded-sm|md|lg|full`. Sombras `shadow-sm` (cards) y `shadow-lg` (modales, Sheet, Command).
Valores exactos en `reference/tokens.json`. Si necesitas un color que no existe, **pregunta** antes de inventarlo.

Tipografía (fuente del sistema, sin descargas): título de pantalla `text-[22px] font-semibold leading-7 tracking-tight` (una vez) ·
título de Card `text-[15px] font-semibold` · cuerpo `text-sm` · tablas y metadatos `text-[13px]` · insignias y encabezados de tabla `text-xs font-medium` ·
KPI `text-[28px] font-semibold tabular` · `font-mono text-[12.5px]` para variables, códigos de plan (`M1`), intenciones (`ELIGE_OPCION`) y hashes.

## Layout

- `AppShell` = `SidebarProvider` de shadcn + `Sidebar` colapsable (236 px / 60 px) con `NAV` de `navigation.ts` + encabezado fijo de 56 px.
- Encabezado, de izquierda a derecha: `<RobotStatus>` (tooltip con último latido) · "Contenido v12 · publicada 05/10/2026 14:32 por J. Pérez" (enlace a Versiones; se recorta con ellipsis primero) · insignia "Borrador con N cambios sin publicar" (si hay) · búsqueda Ctrl+K (`Command`) · `<EmergencyStop>` · avatar con nombre y rol · Salir. Nada se parte en dos líneas.
- Robot detenido → `<StopBanner>` en TODAS las pantallas, encima de `<DraftBanner>`.
- Contenido: padding `p-6`, separación entre bloques `gap-6`, entre Cards `gap-4`. Encabezado de página: breadcrumb pequeño + título + `OriginBadge` a la izquierda, acciones a la derecha (una sola `primary`).
- Escritorio primero (1280–1920 px), usable desde 768 px. No se diseña para móvil.

## Textos de interfaz

Español de Colombia, trato de **tú** ("Guarda el borrador", "Tu rol no permite esta acción").
Botones en infinitivo ("Guardar borrador", "Enviar a evaluación"). Toasts cortos en pasado ("Borrador guardado", "Versión v13 publicada").
Fechas `05/10/2026`, horas 24 h, moneda `$ 99.900`, porcentaje `1,4 %` → usa `src/lib/format.ts`. Nombres de negocio ("Cambiarme de operador (A)"), no internos ("Portabilidad").
Sin emojis en la interfaz del panel; solo dentro del contenido de Sofía.

## Accesibilidad

Contraste AA ya garantizado por los tokens (no los alteres). Foco visible (`ring`) en todo control; navegación por teclado completa en editores, tablas y diálogos.
Cada estado lleva palabra o ícono además del color. Respeta `prefers-reduced-motion`.

## Al terminar una pantalla

- Compárala con su captura en `reference/screens/` en tema claro y oscuro (`.dark` en `<html>`).
- Verifica: OriginBadge presente · DraftBanner en edición · acciones sin permiso deshabilitadas con tooltip · confirmaciones · estados de carga/vacío/error · formatos colombianos · cero colores hardcodeados.

## Referencias de este skill

| Archivo | Para qué |
|---|---|
| `reference/design-rules.md` | Reglas visuales, de contenido y patrones transversales |
| `reference/spec-panelRPA.md` | Especificación funcional completa de cada pantalla (fuente de verdad del contenido) |
| `reference/components.md` | Qué componente usar (shadcn vs. plantilla propia) y cómo instalar |
| `reference/tokens.json` | Valores exactos de color (claro/oscuro), tipografía, espaciado, radios, sombras |
| `reference/screens/*.png` | Maquetas de Inicio, Instrucciones por paso, Texto fijo, Catálogo, Simulador y Versiones |
| `reference/legacy-bundle/` | Implementación de referencia de las maquetas (React sin JSX + CSS). Solo consulta: NO la copies al proyecto |
| `templates/` | Código listo para copiar: tema, utilidades y componentes propios |
