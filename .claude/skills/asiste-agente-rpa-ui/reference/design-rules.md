Sistema de diseño del **panel del Agente RPA de ventas de Asiste ING**. El robot es de Asiste: opera la aplicación Abaya como un asesor humano y atiende la **campaña Claro Móvil por WhatsApp** (Claro es el cliente, no la marca del panel). El panel es la consola interna para vigilar, controlar y configurar el robot; nunca lo ven los clientes.

La interfaz sigue el estilo de Asiste ING (Opción C de Recursos Humanos y Asistencia): barra superior navy, Outfit para títulos y cifras, Plus Jakarta Sans para el resto, tarjetas blancas de 14 px de radio sobre `surface-0`. Las clases de referencia conservan el prefijo `ai-` de Asiste para reutilizar los componentes que ya existen (TopNav, Kpi, Badge, Chip, Table, Modal).

## Dos experiencias, una sola navegación

| Rol | Ve | Hace |
|---|---|---|
| **OPERADOR** | En vivo · Robots · Agente (solo lectura y Probar con la versión publicada) | Apagado de emergencia, cambiar su contraseña |
| **ADMIN** | Todo lo anterior + Usuarios · Auditoría | Reanudar robot, habilitar reintento, gestionar robots, guardar/publicar/restaurar el agente, probar el borrador, gestionar usuarios |

- `TopNav`: En vivo · Robots · Agente | Usuarios · Auditoría. El grupo tras el separador solo se renderiza para ADMIN.
- Dentro de Agente, subpestañas `Tabs sub`: Configuración · Probar agente · Historial · Evaluaciones.
- Lo que un rol no puede hacer se ve **deshabilitado con motivo** ("Requiere rol ADMIN"), no se oculta. Excepción: las pestañas de administración, que no se renderizan para OPERADOR.

## Configuración del agente (estilo Retell)

La pantalla del agente sigue la estructura de Retell/Dapta para **editar el prompt completo**:

1. `AgentBar` arriba: nombre, chip `CLARO MÓVIL`, `VersionStatus`, contexto ("Borrador v15 · basado en v14…"), indicador "Cambios sin guardar" y **Descartar · Guardar · Publicar con evaluación**.
2. **Columna 1 (ancha):** fila de ajustes (Modelo de la lista permitida, Temperatura 0–0,3 con aviso si el modelo no la usa, Idioma fijo con candado) y el `PromptEditor`: el guion en Markdown con etapas `## MENU`, `## PERFIL`, `## OFERTA`, `## OBJECIONES`, `## AUTORIZACION`, hasta 30 000 caracteres.
3. **Columna 2:** `Accordion` con Ajustes del agente, Mensaje de bienvenida (saludo editable + menú A–D fijo), **Catálogo en solo lectura** por proceso (Portabilidad, Migración, Línea nueva) con "Insertar" `{{OFERTA:CÓDIGO}}` en el cursor, Reglas del sistema (no editables) y Funciones del motor (en código).
4. **Columna 3:** Probar agente en vivo (`WhatsAppPreview`) con el selector "Lo que hay en el editor / Versión publicada".

## Reglas no negociables

- **Sin datos personales ni contenido de mensajes reales.** Solo estados, conteos, ids (`AB-77120`) y tiempos. La única excepción es el chat de simulación.
- **Precios, planes y textos legales no van en el guion.** El `PromptEditor` subraya en rojo cualquier precio (`$ 99.900`), gigas (`55 GB`) o porcentaje (`20 %`), marca la línea y lista el error con enlace; no se puede guardar con errores. En la bienvenida además se bloquean promesas ("gratis", "te regalo"), enlaces y marcadores.
- **El flujo no se configura visualmente.** No hay editor de nodos; las etapas se muestran (`StageTrack`) pero las decide la máquina de estados.
- **Publicar siempre pasa por la evaluación** (60 conversaciones guionadas): 0 datos inventados y ≥ 95 % de casos correctos. Si falla, la versión queda Rechazada con `EvalReport`. No existe "publicar sin probar". Mientras evalúa, la pantalla se refresca cada 5 s.
- **Apagado de emergencia siempre visible** en el TopNav y a un clic con confirmación en línea, para ambos roles. Reanudar solo ADMIN. Con el robot detenido, la píldora pasa a "ROBOT DETENIDO", el TopNav se marca en rojo y aparece la banda de detenido en todas las pantallas.
- **Confirmación** en: apagado, deshabilitar robot, desactivar usuario, restablecer contraseña, actualizar todos.
- **Secretos de un solo uso** (contraseña temporal, código de instalación) con `OneTimeSecret`: destacados, monoespaciados, con Copiar; nunca se vuelven a mostrar.
- Salvaguardas de usuarios: nadie se desactiva ni se quita el rol a sí mismo; siempre queda al menos un ADMIN activo.

## Contenido y formatos

- Español de Colombia, trato de **tú**. Botones en infinitivo ("Habilitar reintento", "Restaurar como borrador").
- Horas `07:58` o `3:42 p. m.`; duraciones `6 h 42 m`, `1,8 s`; fechas `06/10/2026` o `Jue 24 sep 2026`; dinero `$ 99.900` (`Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`); porcentajes `15,5 %`. Hora de Bogotá.
- Toda cifra, hora o duración con `tabular-nums`.
- Códigos del sistema (ACTIVE, DOWN, UNCERTAIN, MENU…) en mayúsculas junto a su nombre en español. Campañas en MAYÚSCULAS dentro de su chip.
- Personas en Nombre Propio con tildes.

## Fundamentos visuales

**Color.** Solo `var(--token)`. Marca: `primary` (azul del wordmark) para acciones y selección, `sidebar-bg` para el TopNav, `brand-cyan` solo como acento (subrayado de pestaña activa, foco, barras, contador de alerta), nunca como fondo de botón ni texto. Estados siempre con texto: `success` (operando, en línea, publicado), `warning` (reconectando, evaluando, envío incierto), `danger` (detenido, caído, rechazado, error del guion), `primary-soft` / `primary-soft-ink` (info, pausado). `danger-solid` solo para el botón de apagado y confirmaciones destructivas. Origen de respuestas en la prueba: `cat-tyt` = plantilla del sistema, `cat-tecnologia` = modelo, `warning` = regenerado o respuesta segura, `danger` = proveedor con error.

**Tipografía.** `--font-display` (Outfit) en `page-title` 26/32, `kpi`, `panel-title` y `modal-title`. `--font-sans` (Plus Jakarta Sans) en `body`, `label`, `meta`, `overline` (encabezados de tabla en mayúsculas). `--font-mono` solo en el editor del guion, marcadores, ids y secretos. `wa-body` solo dentro de la vista de WhatsApp. En producción, empaqueta las fuentes localmente (p. ej. `@fontsource`): el panel no carga recursos externos.

**Espacio, radios y sombras.** Contenido con padding `space-6` / `space-8` y gap `space-5`. Tarjetas `radius-lg` (14 px) con `shadow-card`; botones y campos `radius-md`; insignias `radius-pill`; chips `radius-sm`. `shadow-pop` en menús, `shadow-modal` en modales.

**Foco y accesibilidad.** Anillo de 2 px en `focus-ring` en todo control. Contraste AA en ambos temas. Sin scroll horizontal de la página (las tablas anchas se desplazan dentro de su tarjeta). Debajo de 1280 px el TopNav deja solo íconos con tooltip; debajo de 768 px, menú hamburguesa.

**Movimiento.** Solo el punto pulsante de "Evaluando…" y "escribiendo…"; respeta `prefers-reduced-motion`.

## Iconografía

lucide-react con `strokeWidth={1.75}`. Equivalencias: En vivo `Activity`, Robots `Bot`, Agente `MessageSquareText`, Usuarios `Users`, Auditoría `ScrollText`, módulos `LayoutGrid`, apagado `Power`, reanudar `Play`, pausar `Pause`, credenciales `KeyRound`, equipo `Monitor`, sin señal `WifiOff`, catálogo `Package`, probar `FlaskConical`, historial `History`, guardar `Save`, reglas `Shield`. El componente `Icon` de este sistema es un subconjunto dibujado al estilo Lucide para las vistas previas.

## Logos

Grupo **Logos**: `asiste-mark-white.png` (isotipo blanco, en el TopNav sobre `sidebar-bg`), `asiste-mark.png` (isotipo a color, en login y avatar del chat de prueba), `asiste-logo.png` (logotipo completo con "ASISTE ING S.A.S"). No se usa el logo de Claro: Claro aparece solo como nombre de la campaña en el chip `CLARO MÓVIL` y en el contenido del agente.

## Pantallas de referencia

El grupo **Pantallas** tiene maquetas completas: Agente (configuración estilo Retell), Probar agente, Historial y evaluación, Operación en vivo, Robots, Usuarios y Acceso. Cambia el tema para verlas en oscuro. Todos los datos son ficticios.
