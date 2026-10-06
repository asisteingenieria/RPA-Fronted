# Reglas de diseño — Panel Sofía

> Copia del brand book del sistema de diseño. Los nombres de componente (`OriginBadge`, `WhatsAppPreview`…) se refieren a las plantillas de `templates/components/panel/` o, para los genéricos, a shadcn/ui (ver components.md).

Sistema de diseño del panel con el que el equipo de Claro administra a **Sofía**, el robot que vende planes pospago por WhatsApp dentro de Abaya. Herramienta corporativa sobria, densa pero legible, en la línea de Linear, Vercel o Stripe Dashboard. Se implementa con **shadcn/ui** (Radix + Tailwind) e íconos **Lucide**; estos componentes son la referencia visual y de comportamiento.

## Principio rector: quién escribe el texto que ve el cliente

Toda pantalla de edición declara su origen con `OriginBadge`, y la barra lateral lo repite con un punto de color en cada subítem de Conversación.

| Origen | Insignia | Tokens | Se edita con |
|---|---|---|---|
| Lo redacta la IA | `OriginBadge kind="ia"` (destellos) | `ai` sobre `ai-soft` | Texto libre, formulario |
| Texto exacto | `OriginBadge kind="exacto"` (candado) | `exact` sobre `exact-soft` | `TemplateEditor` + `WhatsAppPreview` |
| Legal | `OriginBadge kind="legal"` (balanza) | `legal` sobre `legal-soft` | Editor restringido, aprobación Legal |

- Personalidad, Instrucciones por paso y Objeciones son `ia`. Textos fijos, Catálogo y Parámetros de la oferta son `exacto`. Texto legal es `legal`.
- Nunca pongas precios, GB ni porcentajes en un texto `ia`: inserta `{{PLANES}}` o `{{PLAN_ELEGIDO}}` y muestra el `Callout tone="warning"` cuando el editor detecte una cifra.

## El ciclo de publicación siempre está a la vista

Guardar nunca publica. Borrador → Evaluación → Aprobación → Publicada (→ Reversión).

- Encabezado (`TopBar`): versión publicada ("Contenido v12 · publicada 05/10/2026 14:32 por J. Pérez") y, si existe, la insignia `primary` "Borrador con N cambios sin publicar".
- Toda pantalla de edición lleva `DraftBanner` bajo el encabezado.
- Versiones muestra `Stepper` y cada versión su `VersionStatus`. Solo una versión es `publicada` (verde) a la vez.
- **Aprobar** queda deshabilitado, con motivo visible, si la evaluación falló o si quien mira es el autor (control de cuatro ojos).

## Contenido y voz

- Español de Colombia, trato de **tú** en la interfaz: "Guarda el borrador", "Tu rol no permite esta acción".
- Botones en infinitivo: "Guardar borrador", "Enviar a evaluación", "Marcar como resuelta".
- Fechas `05/10/2026`, horas en 24 h (`14:32`), moneda `$ 99.900`, porcentajes `1,4 %`, coma decimal.
- Usa los nombres de negocio, no los internos: "Cambiarme de operador (A)", no "Portabilidad".
- Los emojis solo aparecen dentro del contenido de Sofía (vista previa y editores), nunca en la interfaz del panel.
- Permisos: lo que un rol no puede hacer se muestra deshabilitado con tooltip ("Requiere rol Aprobador"); nunca se oculta.

## Fundamentos visuales

**Color.** Neutros como base (`bg`, `surface`, `surface-2`, `border`, `ink`, `ink-muted`, `ink-faint`). Un solo color de acción, `primary` (azul). `danger` (rojo) significa peligro: solo apagado de emergencia, errores, validador ✗ y alertas críticas; nunca se usa como color de marca aunque Claro lo use. `warning`/`legal` (ámbar) para advertencias y lo legal; `success` (verde) para activo, aprobado y publicado. Cada estado lleva además palabra o ícono, nunca solo color.

**Temas.** Claro y Oscuro comparten nombres de token. En oscuro `primary` y `danger` se aclaran, por eso el texto sobre ellos es `on-primary` / `on-danger`, nunca blanco literal. Todos los pares de texto cumplen AA (≥ 4,5:1) en ambos temas; `border-strong` cumple 3:1 para bordes de controles.

**Foco.** Anillo sólido de 2 px en `focus` con 2 px de separación en todo control. Navegación completa por teclado en editores, tablas y diálogos.

**Tipografía.** Fuente del sistema (`--font-sans`), sin fuentes externas por la política de seguridad. Estilos: `page-title` una vez por pantalla, `section-title` en Cards, `body` en editores, `body-sm` en tablas compactas, `label` en insignias y encabezados de tabla, `overline` para grupos. `code` (monoespaciada) para variables, códigos de plan (`M1`), intenciones (`ELIGE_OPCION`) y hashes. `wa-body` solo dentro de `WhatsAppPreview`. Números con `tabular-nums`.

**Espaciado y densidad.** Base de 4 px. Editores y formularios holgados (`space-6` de padding de página, `space-4` en Cards); tablas compactas (celdas de 9 × 12 px). Separación entre Cards `space-4`.

**Radios.** `radius-sm` insignias y chips, `radius-md` botones e inputs, `radius-lg` Cards, modales y vista de WhatsApp, `radius-full` píldoras y switches.

**Sombras.** Casi planas: `shadow-sm` en Cards y botones secundarios; `shadow-lg` solo en modales, Sheet y menú Ctrl+K. Los bordes separan, no las sombras.

**Layout.** Escritorio primero (1280–1920 px), usable desde 768 px. `AppShell`: barra lateral de 236 px (60 px contraída), encabezado de 56 px, contenido con padding `space-6`. Editores en dos columnas: editor a la izquierda, `WhatsAppPreview` fija a la derecha (≈ 400 px).

**Movimiento.** Mínimo: transiciones de 120 ms en hover y switches; puntos pulsantes solo para "En evaluación" y "escribiendo…". Respeta `prefers-reduced-motion`.

## Vista previa de WhatsApp

`WhatsAppPreview` reproduce exactamente lo que recibe el cliente: burbuja de Sofía a la izquierda (`wa-in`), cliente a la derecha (`wa-out`), fondo `wa-wallpaper`, texto `wa-ink`, hora `wa-meta`. Interpreta `*negrita*` (un asterisco), `_cursiva_`, `~tachado~`, viñetas `•`, saltos de línea y emojis. Las variables sin valor de ejemplo se ven como chip.

## Patrones transversales

- **Robot detenido:** `StopBanner` en todas las pantallas, encima de `DraftBanner`; el botón del encabezado pasa a "Reanudar robot".
- **Confirmación obligatoria** (modal, botón destructivo a la derecha): publicar, revertir, apagar o reanudar el robot, eliminar una objeción, desactivar un plan, cambiar el texto legal.
- **Cambios sin guardar:** punto ámbar (`ps-tab-dirty`) en la pestaña o el subítem del menú; al salir, modal "Guardar borrador / Descartar / Seguir editando".
- **Vacíos:** `Callout` con la consecuencia ("Sin planes activos: los clientes de esta opción se transfieren directo a un asesor"); sin alertas, `Callout tone="success"` "Todo en orden ✓".
- **Carga:** skeletons en `surface-2` con la forma de la tabla o tarjeta.
- **Datos personales:** el contenido de los mensajes en Monitoreo está oculto por defecto; "Mostrar contenido" pide un motivo y queda en la auditoría.
- **Toasts** breves en pasado: "Borrador guardado", "Evaluación iniciada", "Versión v13 publicada".

## Iconografía

Lucide (`lucide-react`), trazo de 2 px, 16 px en navegación y botones, 14 px en insignias y metadatos. El componente `Icon` de este sistema trae un subconjunto dibujado al estilo Lucide para las vistas previas; en la implementación usa los íconos reales de Lucide con el mismo nombre de concepto (house, message-square, package, megaphone, flask-conical, git-branch, square-check, activity, shield, sliders-horizontal, power, lock, sparkles, scale). No hay logotipo: la marca del panel es el monograma "S" en texto.

## Pantallas de referencia

Las tarjetas del grupo **Pantallas** son maquetas completas construidas con estos componentes: Inicio, Instrucciones por paso, Texto fijo (Saludo y menú), Catálogo de planes, Probar conversación y Versiones. Cambia el tema del sistema para verlas en oscuro. Todos los datos son ficticios.
