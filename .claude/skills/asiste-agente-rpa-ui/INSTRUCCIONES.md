# Rediseño UI — Panel del Agente RPA de ventas (Asiste ING · campaña Claro Móvil)

> **Prompt para pegar en Claude Code**
>
> Usa el skill `asiste-agente-rpa-ui`. Lee su `SKILL.md`, `reference/design-rules.md` y
> `reference/spec-reestructuracion.md`, y mira todas las imágenes de `reference/screens/`. Rediseña el panel
> (`/panel/`) para que se vea como esas referencias, usando `templates/styles/tokens.css` y `components.css`
> como base de estilos y los componentes de `templates/` como punto de partida. Antes de escribir código,
> revisa las pantallas actuales del panel, sus hooks y llamadas a `/admin/*`, y dime tu plan: qué archivos
> vas a crear o modificar y qué endpoint alimenta cada bloque. No cambies lógica de negocio, endpoints,
> máquina de estados ni permisos del servidor; solo presentación, layout y componentes de UI. Si una
> pantalla necesita un dato que el backend no entrega hoy, no lo inventes: muestra un placeholder y anótalo
> en una lista de "datos faltantes" para revisarla conmigo. Trabaja por fases (abajo) y muéstrame el
> resultado de cada una.

## Fases

1. **Base visual.** Instala `tokens.css` y `components.css`, fuentes locales (`@fontsource/outfit`, `@fontsource/plus-jakarta-sans`), `lucide-react` y logos. Tema claro/oscuro (atributo `data-theme`, automático por defecto). Elimina la paleta y estilos anteriores.
2. **Layout.** `AppLayout` + `TopNav` con grupos por rol, píldora de estado, apagado de emergencia con confirmación en línea (reanudar solo ADMIN), banda de robot detenido, reloj, menú del avatar (Tema, Cambiar contraseña, Cerrar sesión). Quita las pestañas y el "Salir" actuales.
3. **Agente → Configuración** (prioridad): `AgentBar`, `PromptEditor` con revisión en vivo y enlace a la línea, `ModelSettings`, secciones plegables (ajustes, bienvenida con su revisión, catálogo con "Insertar" en el cursor, reglas del sistema), panel de prueba a la derecha. Guardar bloqueado con errores; Publicar siempre con evaluación; avisos de proveedor simulado / sin API key.
4. **Agente → Probar agente e Historial.** Chat con orígenes y eventos, "Estado de la simulación", bloqueo al terminar; historial con `VersionStatus`, `EvalReport` rechazada, progreso cada 5 s mientras evalúa, "Restaurar como borrador".
5. **En vivo.** Semáforo, KPIs, "Requiere atención" priorizado (revisiones, envíos inciertos, robots caídos, alertas), sesiones con "Habilitar reintento" (ADMIN), errores recientes. Refresco cada 10 s, pausado con la pestaña oculta.
6. **Robots.** Rango Hoy/7/30 días, resumen, paquete y firma, tabla con acciones; modales Agregar robot → código de instalación (`OneTimeSecret`), Credenciales, Deshabilitar (confirmación), Actualizar todos (confirmación); detalle del robot (drawer o ruta) con rendimiento por acción, trazas (descarga ADMIN) e historial de acciones.
7. **Usuarios, Auditoría, Acceso.** Crear usuario con contraseña temporal una sola vez, tabla con salvaguardas; auditoría con filtros; login con error genérico y bloqueo; cambio obligatorio de contraseña con la política visible.
8. **Revisión final.** Teclado, foco, contraste, modo oscuro, 1366 px sin scroll horizontal, menos de 1280 px (solo íconos) y menos de 768 px (hamburguesa).

## Criterios de aceptación

- [ ] Cada pantalla coincide visualmente con su referencia a 1440 px, en claro y oscuro.
- [ ] La pantalla Agente permite pegar y editar el guion completo (hasta 30 000 caracteres) con números de línea, revisión en vivo y enlace a cada error; no se puede guardar con errores.
- [ ] Los marcadores `{{OFERTA:…}}` se insertan en la posición del cursor desde el catálogo.
- [ ] No existe ninguna forma de publicar sin evaluación.
- [ ] El apagado de emergencia está visible en todas las pantallas para ambos roles; reanudar solo ADMIN.
- [ ] Lo que un rol no puede hacer se ve deshabilitado con su motivo (salvo pestañas Usuarios y Auditoría).
- [ ] Ninguna vista (salvo la simulación) muestra contenido de mensajes ni datos personales.
- [ ] Ningún estado se comunica solo con color.
- [ ] No hay hexadecimales fuera de `tokens.css`; no se carga nada de CDN.
- [ ] Cifras y horas con `tabular-nums` y formatos colombianos.
- [ ] Lista de "datos faltantes" entregada al final.
