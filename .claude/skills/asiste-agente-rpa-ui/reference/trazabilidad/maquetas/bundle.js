/* @ds-bundle: {"format":4,"namespace":"AsisteRPA","components":[{"name":"Icon"},{"name":"Button"},{"name":"Badge"},{"name":"CampaignChip"},{"name":"VersionStatus"},{"name":"RobotState"},{"name":"SessionState"},{"name":"Kpi"},{"name":"Panel"},{"name":"Tabs"},{"name":"Segmented"},{"name":"Callout"},{"name":"EmergencyStop"},{"name":"TopNav"},{"name":"Shell"},{"name":"PageHead"},{"name":"AgentBar"},{"name":"PromptEditor"},{"name":"Accordion"},{"name":"WhatsAppPreview"},{"name":"StageTrack"},{"name":"OneTimeSecret"},{"name":"EvalReport"},{"name":"Typification"},{"name":"TypificationBar"},{"name":"StageTrail"},{"name":"DeliveryState"}]} */
(function () {
  var React = window.React, h = React.createElement, Frag = React.Fragment;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }
  var LOGO_WHITE = "../../logos/asiste-mark-white.png";
  var LOGO_MARK = "../../logos/asiste-mark.png";

  /* Íconos al estilo lucide-react (24×24, trazo 1.75). En producción: lucide-react con strokeWidth={1.75}. */
  var P = {
    activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    bot: "M12 8V4H8 M4 8h16v12H4z M2 14h2 M20 14h2 M9 13v2 M15 13v2",
    agent: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M8 8h8 M8 12h5",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    scroll: "M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4 M19 17V5a2 2 0 0 0-2-2H4 M15 8h-5 M15 12h-5",
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
    bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
    power: "M12 2v10 M18.4 6.6a9 9 0 1 1-12.8 0",
    play: "M6 3l14 9-14 9z",
    pause: "M6 4h4v16H6z M14 4h4v16h-4z",
    chevronDown: "m6 9 6 6 6-6", chevronRight: "m9 18 6-6-6-6", chevronLeft: "m15 18-6-6 6-6",
    lock: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4",
    check: "M20 6 9 17l-5-5", x: "M18 6 6 18 M6 6l12 12",
    checkCircle: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01l-3-3",
    xCircle: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M15 9l-6 6 M9 9l6 6",
    alert: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01",
    info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01",
    copy: "M8 8h12v12H8z M4 16V4h12",
    plus: "M12 5v14 M5 12h14",
    refresh: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16 M8 16H3v5",
    download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
    history: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5 M12 7v5l4 2",
    eye: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    code: "m16 18 6-6-6-6 M8 6l-6 6 6 6",
    flask: "M9 3h6 M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3 M7 15h10",
    send: "M22 2 11 13 M22 2l-7 20-4-9-9-4z",
    rotate: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5",
    monitor: "M2 3h20v14H2z M8 21h8 M12 17v4",
    key: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z M16.5 7.5h.01",
    more: "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
    file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8",
    package: "M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8",
    settings: "M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6",
    sparkles: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z M19 3v4 M21 5h-4",
    message: "M7.9 20A9 9 0 1 0 4 16.1L2 22z",
    save: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7 M7 3v4a1 1 0 0 0 1 1h7",
    upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
    wifiOff: "M12 20h.01 M8.5 16.43a5 5 0 0 1 7 0 M2 8.82a15 15 0 0 1 4.17-2.65 M10.66 5c4.01-.36 8.14.9 11.34 3.76 M16.85 11.25a10 10 0 0 1 2.22 1.68 M5 13a10 10 0 0 1 5.24-2.76 M2 2l20 20",
    ccheck: "M18 7 7 18l-4-4 M22 7 11 18",
    globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
    thermo: "M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z",
    cpu: "M4 4h16v16H4z M9 9h6v6H9z M9 1v3 M15 1v3 M9 20v3 M15 20v3 M20 9h3 M20 14h3 M1 9h3 M1 14h3",
    building: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M10 6h4 M10 10h4 M10 14h4 M10 18h4",
    messages: "M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1",
    filter: "M22 3H2l8 9.46V19l4 2v-8.54z",
    link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    chart: "M3 3v18h18 M7 16v-3 M12 16V8 M17 16v-6",
    timer: "M10 2h4 M12 14l3-3 M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
    hand: "M18 11V6a2 2 0 0 0-4 0 M14 10V4a2 2 0 0 0-4 0v2 M10 10.5V6a2 2 0 0 0-4 0v8 M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"
  };
  function Icon(p) {
    var size = p.size || 16, d = P[p.name] || P.info;
    return h("svg", { className: cx("ai-ic", p.className), width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: p.strokeWidth || 1.75, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": p.label ? undefined : true, role: p.label ? "img" : undefined, "aria-label": p.label, style: p.style },
      d.split(" M").map(function (s, i) { return h("path", { key: i, d: (i ? "M" : "") + s }); }));
  }

  function Button(p) {
    var v = p.variant || "secondary", dis = !!p.disabled;
    return h("button", { type: "button", className: cx("ai-btn", "ai-btn--" + v, p.size && "ai-btn--" + p.size, p.className), style: p.style,
      disabled: dis && !p.reason ? true : undefined, "aria-disabled": dis ? "true" : undefined, title: p.reason || p.title, onClick: dis ? undefined : p.onClick },
      p.icon && h(Icon, { name: p.icon, size: p.size === "xl" ? 18 : 16 }), p.children, p.iconRight && h(Icon, { name: p.iconRight, size: 14 }));
  }
  function IconButton(p) {
    return h("button", { type: "button", className: cx("ai-icon-btn", p.outline && "ai-icon-btn--outline", p.danger && "ai-icon-btn--danger", p.className), title: p.label, "aria-label": p.label, disabled: p.disabled }, h(Icon, { name: p.icon, size: 16 }));
  }

  function Badge(p) {
    return h("span", { className: cx("ai-badge", "ai-badge--" + (p.tone || "neutral"), p.className), title: p.title },
      p.dot !== false && !p.icon && h("span", { className: cx("ai-dot", p.pulse && "ai-dot--pulse") }), p.icon && h(Icon, { name: p.icon, size: 13 }), p.children);
  }
  function Count(p) { return h("span", { className: cx("ai-count", p.alert && "is-alert") }, p.children); }
  function CampaignChip(p) { var c = (p.kind || "claro"); return h("span", { className: "ai-chip ai-chip--" + c }, (p.children || "CLARO MÓVIL").toUpperCase()); }

  var VS = { borrador: ["neutral", "Borrador"], evaluando: ["warning", "Evaluando…"], publicado: ["success", "Publicado"], rechazado: ["danger", "Rechazado"], archivado: ["outline", "Archivado"] };
  function VersionStatus(p) { var s = VS[p.status] || VS.borrador; return h(Badge, { tone: s[0], pulse: p.status === "evaluando", dot: p.status !== "archivado" }, s[1]); }

  var RS = { "en-linea": ["success", "En línea", "Conectado y atendiendo chats"], reconectando: ["warning", "Reconectando", "Volviendo a iniciar sesión en Abaya"], caido: ["danger", "Caído", "La sesión falló; requiere habilitar reintento"],
    "sin-senal": ["neutral", "Sin señal", "No llega heartbeat del equipo"], apagado: ["neutral", "Apagado", "El equipo está apagado"], deshabilitado: ["outline", "Deshabilitado", "Deshabilitado por un administrador"] };
  function RobotState(p) { var s = RS[p.status] || RS["en-linea"]; return h(Badge, { tone: s[0], title: s[2], dot: p.status !== "deshabilitado" }, s[1]); }
  var SS = { ACTIVE: ["success", "Activa"], RELOGGING: ["warning", "Reingresando"], PAUSED: ["info", "Pausada"], DOWN: ["danger", "Caída"] };
  function SessionState(p) { var s = SS[p.status] || SS.ACTIVE; return h(Badge, { tone: s[0], title: p.status }, s[1], h("span", { style: { opacity: .7, fontWeight: 500 } }, " · " + p.status)); }

  function Kpi(p) {
    return h("div", { className: cx("ai-kpi", p.tone && "is-" + p.tone), onClick: p.onClick, role: p.onClick ? "button" : undefined },
      h("div", { className: "ai-kpi-head" }, h("span", { className: "ai-kpi-label" }, p.label), p.icon && h("span", { className: "ai-kpi-icon" }, h(Icon, { name: p.icon, size: 18 }))),
      h("div", { className: "ai-kpi-value" }, p.value),
      p.bar != null && h("div", { className: "ai-kpi-bar" }, h("span", { style: { width: p.bar + "%", background: p.barColor } })),
      p.foot && h("div", { className: "ai-kpi-foot" }, p.foot));
  }

  function Panel(p) {
    return h("section", { className: cx("ai-panel", p.className), style: p.style },
      (p.title || p.actions) && h("div", { className: "ai-panel-head" }, h("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, p.icon && h(Icon, { name: p.icon, size: 18, style: { color: "var(--primary-soft-ink)" } }), h("h3", { className: "ai-panel-title" }, p.title), p.badge), p.actions && h("div", { className: "ai-row" }, p.actions)),
      p.flush ? p.children : h("div", { className: "ai-panel-body", style: p.bodyStyle }, p.children));
  }

  function Tabs(p) {
    return h("div", { className: cx(p.sub ? "ai-subtabs" : "ai-tabs"), role: "tablist" }, (p.items || []).map(function (t) {
      return h("a", { key: t.id, role: "tab", className: cx("ai-tab", t.id === p.active && "is-active"), "aria-selected": t.id === p.active ? "true" : "false" },
        t.icon && h(Icon, { name: t.icon, size: 15 }), t.label, t.count != null && h(Count, null, t.count), t.lock && h(Icon, { name: "lock", size: 12, style: { color: "var(--ink-subtle)" } }));
    }));
  }
  function Segmented(p) {
    return h("div", { className: "ai-seg", role: "radiogroup" }, (p.items || []).map(function (t) {
      return h("span", { key: t.id || t, role: "radio", "aria-checked": (t.id || t) === p.active ? "true" : "false", className: (t.id || t) === p.active ? "is-active" : "" }, t.icon && h(Icon, { name: t.icon, size: 14 }), t.label || t);
    }));
  }

  function Callout(p) {
    var tone = p.tone || "info", ic = { warning: "alert", danger: "alert", info: "info", success: "checkCircle" }[tone];
    return h("div", { className: "ai-callout ai-callout--" + tone, role: tone === "danger" ? "alert" : "note" }, h(Icon, { name: p.icon || ic, size: 16 }), h("div", null, p.children));
  }

  /* Apagado de emergencia: ambos roles pueden detener; reanudar solo ADMIN. Confirmación en línea. */
  function EmergencyStop(p) {
    if (p.confirming) return h("span", { className: "ai-confirm-inline", role: "alertdialog" }, "¿Detener TODAS las acciones del robot?", h(Button, { variant: "danger", size: "sm" }, "Confirmar"), h(Button, { variant: "secondary", size: "sm" }, "Cancelar"));
    if (p.stopped) return h(Button, { variant: p.onNavy ? "on-navy" : "secondary", size: "sm", icon: "play", disabled: p.role !== "ADMIN", reason: p.role !== "ADMIN" ? "Solo un ADMIN puede reanudar el robot" : undefined }, "Reanudar robot");
    return h(Button, { variant: "danger", size: p.size || "sm", icon: "power" }, "Apagado de emergencia");
  }

  var NAV = [
    { id: "envivo", label: "En vivo", icon: "activity" },
    { id: "robots", label: "Robots", icon: "bot" },
    { id: "agente", label: "Agente", icon: "agent" },
    { id: "trazabilidad", label: "Trazabilidad", icon: "messages", trace: true },
    { sep: true, admin: true },
    { id: "usuarios", label: "Usuarios", icon: "users", admin: true },
    { id: "auditoria", label: "Auditoría", icon: "scroll", admin: true }
  ];
  function TopNav(p) {
    var role = p.role || "ADMIN", stopped = p.robot === "detenido";
    return h("header", { className: cx("ai-topnav", stopped && "is-stopped") },
      h("div", { className: "ai-brand" }, h("img", { src: LOGO_WHITE, alt: "" }), h("div", null, h("div", { className: "ai-brand-name" }, "ASISTE ING"), h("div", { className: "ai-brand-sub" }, "Agente RPA · Ventas"))),
      h(IconButton, { icon: "grid", label: "Cambiar de módulo" }),
      h("nav", { className: "ai-topnav-links", "aria-label": "Principal" }, NAV.filter(function (n) { return !n.admin || role === "ADMIN"; }).map(function (n, i) {
        if (n.sep) return h("span", { key: "s" + i, className: "ai-topnav-sep", "aria-hidden": true });
        var locked = n.trace && p.traceLocked;
        return h("a", { key: n.id, className: cx("ai-topnav-link", p.active === n.id && "is-active", locked && "is-locked"), "aria-current": p.active === n.id ? "page" : undefined, "aria-disabled": locked ? "true" : undefined, title: locked ? p.traceLocked : undefined },
          h(Icon, { name: n.icon, size: 16 }), n.label, locked ? h(Icon, { name: "lock", size: 12 }) : null, n.id === "envivo" && p.attention ? h(Count, { alert: true }, p.attention) : null);
      })),
      h("div", { className: "ai-topnav-right" },
        h("span", { className: cx("ai-robot-pill", stopped && "is-stopped"), role: "status", title: "Actualizado " + (p.updated || "hace 4 s") }, h("span", { className: "ai-dot" }), stopped ? "ROBOT DETENIDO" : "Robot operando"),
        h(EmergencyStop, { stopped: stopped, role: role, onNavy: true }),
        h("span", { className: "ai-clock-chip" }, h(Icon, { name: "clock", size: 15 }), p.time || "3:42 p. m."),
        h("span", { className: "ai-bell" }, h(IconButton, { icon: "bell", label: "Alertas" })),
        h("span", { className: "ai-avatar", title: (p.user || "Kevin Bermúdez") + " · " + role }, p.initials || "KB")));
  }

  function Shell(p) {
    return h("div", { className: "ai-scope", style: { minHeight: "100vh" } },
      h(TopNav, { active: p.active, traceLocked: p.traceLocked, role: p.role, robot: p.robot, attention: p.attention, user: p.user, initials: p.initials }),
      p.robot === "detenido" && h("div", { className: "ai-stop-band", role: "alert" }, h(Icon, { name: "power", size: 16 }), "Robot detenido por " + (p.stoppedBy || "J. Pérez") + " a las " + (p.stoppedAt || "15:04") + ". No se envía nada a los clientes; la lectura continúa.", h(EmergencyStop, { stopped: true, role: p.role })),
      h("main", { className: "ai-content" }, p.children));
  }

  function PageHead(p) {
    return h("div", { className: "ai-page-head" }, h("div", null, h("h1", { className: "ai-page-title" }, p.title), p.sub && h("p", { className: "ai-page-sub" }, p.sub)), p.actions && h("div", { className: "ai-row" }, p.actions));
  }

  /* Encabezado del agente (equivalente al de Retell): nombre, campaña, versión, estado y acciones. */
  function AgentBar(p) {
    var admin = (p.role || "ADMIN") === "ADMIN";
    var why = "Requiere rol ADMIN";
    return h("div", { className: "ai-agentbar" },
      h("div", { style: { display: "flex", flexDirection: "column", gap: 2 } },
        h("div", { className: "ai-row", style: { gap: 10 } }, h("span", { className: "ai-agentbar-name" }, p.name || "Sofía · Claro Móvil WhatsApp"), h(CampaignChip, null), h(VersionStatus, { status: p.status || "borrador" })),
        h("span", { className: "ai-agentbar-meta" }, p.meta || "Borrador v15 · basado en v14 publicada 06/10/2026 14:32 por J. Pérez")),
      h("div", { className: "ai-agentbar-actions" },
        p.unsaved && h("span", { className: "ai-unsaved" }, "Cambios sin guardar"),
        h(Button, { variant: "ghost", disabled: !admin, reason: !admin ? why : undefined }, "Descartar"),
        h(Button, { variant: "secondary", icon: "save", disabled: !admin || p.hasErrors, reason: !admin ? why : p.hasErrors ? "Corrige los errores del guion para guardar" : undefined }, "Guardar"),
        h(Button, { variant: "primary", icon: "flask", disabled: !admin || p.cannotPublish, reason: !admin ? why : p.cannotPublish }, "Publicar con evaluación")));
  }

  /* Editor del guion: Markdown, números de línea, resaltado de ## ETAPAS, marcadores {{OFERTA:…}} y errores. */
  var FIG = /(\$\s?\d{1,3}(?:\.\d{3})+|\b\d+\s?GB\b|\b\d+(?:[.,]\d+)?\s?%)/;
  function codeLine(text) {
    if (/^#\s/.test(text)) return h("div", { className: "h1" }, text);
    if (/^##\s/.test(text)) return h("div", { className: "h2" }, text);
    var parts = text.split(/(\{\{OFERTA:[A-Z0-9]+\}\}|\$\s?\d{1,3}(?:\.\d{3})+|\b\d+\s?GB\b|\b\d+(?:[.,]\d+)?\s?%)/);
    var bad = FIG.test(text);
    return h("div", null, parts.map(function (s, i) {
      if (/^\{\{OFERTA:/.test(s)) return h("span", { key: i, className: "mk" }, s);
      if (FIG.test(s) && s.match(FIG)[0] === s) return h("span", { key: i, className: "err", title: "Los precios, GB y porcentajes salen del catálogo" }, s);
      return s;
    }));
  }
  function PromptEditor(p) {
    var lines = (p.value || "").split("\n"), errs = [];
    lines.forEach(function (l, i) { var m = l.match(FIG); if (m) errs.push({ line: i + 1, what: m[0] }); });
    var chars = (p.value || "").length, max = p.max || 30000;
    return h("div", { className: "ai-panel ai-editor" },
      h("div", { className: "ai-editor-head" }, h(Icon, { name: "file", size: 18, style: { color: "var(--primary-soft-ink)" } }), h("span", { className: "ai-editor-title" }, p.title || "Guion del agente"),
        h("span", { className: "ai-badge ai-badge--neutral" }, "Markdown"),
        h("div", { className: "ai-editor-tools" }, h(Segmented, { active: p.mode || "md", items: [{ id: "preview", label: "Vista previa", icon: "eye" }, { id: "md", label: "Markdown", icon: "code" }] }), h(IconButton, { icon: "copy", label: "Copiar guion" }))),
      p.toolbar,
      h("div", { className: "ai-code", style: { height: p.height || 520 }, role: "textbox", "aria-multiline": "true", "aria-label": "Guion del agente", tabIndex: 0 },
        lines.map(function (l, i) { var bad = FIG.test(l); return h("div", { key: i, className: cx("ai-code-row", bad && "is-errline") }, h("span", { className: cx("ai-code-n", bad && "is-err"), "aria-hidden": true }, i + 1), codeLine(l)); })),
      errs.length ? h("div", { className: "ai-issues", role: "alert" }, h("b", null, errs.length === 1 ? "1 error impide guardar" : errs.length + " errores impiden guardar"),
        errs.map(function (e) { return h("div", { key: e.line }, h("a", null, "Línea " + e.line), " · “" + e.what + "”: los precios, gigas y porcentajes los inserta el sistema desde el catálogo. Usa un marcador {{OFERTA:CÓDIGO}}."); })) : null,
      h("div", { className: "ai-editor-foot" }, h("span", null, (p.tokens || "4.812") + " tokens"), h("span", null, chars.toLocaleString("es-CO") + " / " + max.toLocaleString("es-CO") + " caracteres"),
        h("span", { style: { marginLeft: "auto" } }, "Revisión en vivo activa")));
  }

  function Accordion(p) {
    return h("div", { className: "ai-acc" }, (p.items || []).map(function (it, i) {
      return h("div", { key: i, className: cx("ai-acc-item", it.open && "is-open") },
        h("button", { className: "ai-acc-head", "aria-expanded": it.open ? "true" : "false" }, h(Icon, { name: it.icon || "settings", size: 17 }), it.title, it.badge, h(Icon, { name: "chevronDown", size: 16, className: "ai-acc-chev" })),
        it.open && h("div", { className: "ai-acc-body" }, it.body));
    }));
  }

  /* Formato WhatsApp: *negrita* (un asterisco), _cursiva_, ~tachado~, saltos de línea, viñetas y emojis. */
  function wa(text, k) {
    var out = [], re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g, last = 0, m, i = 0;
    while ((m = re.exec(text))) { if (m.index > last) out.push(text.slice(last, m.index)); var t = m[0], c = t[0];
      out.push(h(c === "*" ? "b" : c === "_" ? "i" : "s", { key: k + i++ }, t.slice(1, -1))); last = m.index + t.length; }
    if (last < text.length) out.push(text.slice(last)); return out;
  }
  var ORIGIN = { plantilla: "plantilla del sistema", modelo: "modelo · validado", regenerado: "modelo · regenerado 1 vez", segura: "respuesta segura", error: "proveedor con error" };
  function WhatsAppPreview(p) {
    var prev = null;
    return h("div", { className: "ai-wa", style: { height: p.height } },
      h("div", { className: "ai-wa-head" }, h("div", { className: "ai-wa-avatar" }, h("img", { src: LOGO_MARK, alt: "" })),
        h("div", null, h("div", { className: "ai-wa-name" }, p.title || "Sofía · Claro Móvil"), h("div", { className: "ai-wa-sub" }, p.typing ? "escribiendo…" : (p.subtitle || "Simulación · no toca Abaya"))), p.badge && h("div", { style: { marginLeft: "auto" } }, p.badge)),
      h("div", { className: "ai-wa-body", "aria-live": "polite" }, (p.messages || []).map(function (m, i) {
        if (m.event) { prev = null; return h("div", { key: i, className: "ai-wa-event " + (m.tone || "info") }, h(Icon, { name: m.icon || "info", size: 13 }), m.event); }
        var first = m.from !== prev; prev = m.from;
        return h(Frag, { key: i },
          h("div", { className: cx("ai-wa-msg", m.from || "bot", first && i > 0 && "first") }, wa(m.text, "m" + i), h("span", { className: "ai-wa-time" }, m.time || "15:20", m.from === "client" && h(Icon, { name: "ccheck", size: 14 }))),
          (m.origin || m.delivery) && h("div", { className: cx("ai-wa-origin", m.from === "client" && "is-client") }, m.origin && h("span", { className: "tag " + m.origin }, ORIGIN[m.origin]), m.delivery && h(DeliveryState, m.delivery), m.meta && h("span", null, m.meta)));
      }), p.typing && h("div", { className: "ai-wa-msg bot first" }, h("span", { className: "ai-typing" }, h("i"), h("i"), h("i")))),
      p.locked ? h("div", { className: "ai-wa-locked" }, h(Callout, { tone: "info", icon: "lock" }, p.locked)) :
        p.input !== false && h("div", { className: "ai-wa-input" }, h("div", { className: "ai-wa-field" }, "Escribe como cliente…"), h("div", { className: "ai-wa-send" }, h(Icon, { name: "send", size: 16 }))));
  }

  var STAGES = ["MENU", "PERFIL", "OFERTA", "OBJECIONES", "AUTORIZACION", "TRANSFERENCIA"];
  function StageTrack(p) {
    var cur = STAGES.indexOf(p.current || "OFERTA");
    return h("ol", { className: "ai-stages", "aria-label": "Etapas del motor" }, STAGES.map(function (s, i) {
      return h("li", { key: s, className: i < cur ? "done" : i === cur ? "now" : "", "aria-current": i === cur ? "step" : undefined }, h("span", null, s));
    }));
  }

  function OneTimeSecret(p) {
    return h("div", { className: "ai-secret", role: "status" },
      h("span", { className: "ai-modal-icon" }, h(Icon, { name: "key", size: 20 })),
      h("div", { style: { flex: 1, minWidth: 0 } }, h("div", { style: { fontWeight: 700 } }, p.title || "Contraseña temporal"), h("div", { className: "ai-help", style: { color: "var(--primary-soft-ink)" } }, p.help || "Se muestra una sola vez. Cópiala ahora y entrégala por un canal seguro.")),
      h("span", { className: "ai-secret-value" }, p.value || "Tq7-#mRv-29Lp"),
      h(Button, { variant: "primary", icon: "copy" }, "Copiar"));
  }

  function EvalReport(p) {
    var pct = p.pct || 93;
    return h("div", { className: "ai-eval-fail" },
      h("div", { className: "ai-eval-fail-head" }, h(Icon, { name: "xCircle", size: 20 }), h("b", { style: { font: "600 16px/22px var(--font-display)" } }, p.title || "La v15 no se publicó: la evaluación la rechazó"), h("span", { style: { marginLeft: "auto" } }, h(VersionStatus, { status: "rechazado" }))),
      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, padding: 20 } },
        h("div", { className: "ai-meter" }, h("span", { className: "ai-kpi-label" }, "Casos correctos (meta ≥ 95 %)"), h("span", { className: "ai-kpi-value", style: { color: "var(--danger)" } }, pct + " %"), h("div", { className: "ai-meter-bar" }, h("span", { style: { width: pct + "%" } }), h("i", { style: { left: "95%" } }))),
        h("div", { className: "ai-meter" }, h("span", { className: "ai-kpi-label" }, "Datos inventados (debe ser 0)"), h("span", { className: "ai-kpi-value", style: { color: "var(--danger)" } }, p.invented != null ? p.invented : 1), h("span", { className: "ai-help" }, "Bloquea la publicación")),
        h("div", { className: "ai-meter" }, h("span", { className: "ai-kpi-label" }, "Suite"), h("span", { className: "ai-kpi-value" }, "56 / 60"), h("span", { className: "ai-help" }, "Duración 4 min 12 s · latencia p95 2,1 s"))),
      p.children);
  }

  /* ===== Trazabilidad ===== */
  /* Tipificación = Conversation.status. Siempre texto + código; el color nunca va solo. */
  var TIP = {
    TRANSFERRED_BACKOFFICE: ["success", "Venta transferida al backoffice", "Venta transferida", "var(--success)"],
    CLOSED_NO_SALE: ["neutral", "Cerrada sin venta", "Sin venta", "var(--border-strong)"],
    CLOSED_SUPPORT: ["tyt", "Derivada a soporte (*611)", "Soporte *611", "var(--cat-tyt)"],
    CLOSED_INACTIVE: ["outline", "Cerrada por inactividad (120 min)", "Inactividad", "var(--cat-tecnologia)"],
    NEEDS_REVIEW: ["danger", "Requiere revisión humana", "Revisión", "var(--danger)"],
    ACTIVE: ["info", "En curso", "En curso", "var(--primary)"],
    WAITING_CONSENT: ["warning", "Esperando autorización", "Esperando autorización", "var(--cat-operacion)"],
    TRANSFERRING: ["info", "Transfiriendo", "Transfiriendo", "var(--brand-azure)"]
  };
  function Typification(p) {
    var t = TIP[p.code] || TIP.ACTIVE;
    return h(Badge, { tone: t[0], title: p.code, pulse: p.code === "ACTIVE", className: p.className }, p.short ? t[2] : t[1], p.showCode && h("span", { className: "ai-tip-code" }, p.code));
  }
  function TypificationBar(p) {
    var items = p.items || [], total = items.reduce(function (a, b) { return a + b.count; }, 0) || 1;
    return h("div", { className: "ai-tipbar-wrap" },
      h("div", { className: cx("ai-tipbar", p.thin && "is-thin"), role: "img", "aria-label": items.map(function (i) { return (TIP[i.code] || [])[2] + " " + i.count; }).join(", ") },
        items.filter(function (i) { return i.count > 0; }).map(function (i) { return h("span", { key: i.code, title: (TIP[i.code] || [])[1] + " · " + i.count, style: { flexGrow: i.count, background: (TIP[i.code] || [])[3] } }); })),
      p.legend !== false && h("div", { className: "ai-tipbar-legend" }, items.map(function (i) {
        var t = TIP[i.code] || TIP.ACTIVE;
        return h("span", { key: i.code, className: i.count ? "" : "is-zero" }, h("i", { style: { background: t[3] } }), t[2], h("b", { className: "ai-num" }, i.count), h("small", { className: "ai-num" }, (Math.round(i.count / total * 1000) / 10).toString().replace(".", ",") + " %"));
      })));
  }
  /* Recorrido REAL de la conversación (puede volver atrás: OFERTA ⇄ OBJECIONES) y su salida. */
  function StageTrail(p) {
    var path = p.path || ["MENU", "PERFIL", "OFERTA"], exit = p.exit;
    return h("ol", { className: "ai-trail", "aria-label": "Recorrido de etapas" },
      path.map(function (s, i) {
        var back = i > 0 && path.indexOf(s) < i;
        return h("li", { key: i, className: cx(back && "is-back", !exit && i === path.length - 1 && "is-now") }, i > 0 && h(Icon, { name: back ? "rotate" : "chevronRight", size: 13, className: "ai-trail-sep" }), h("span", null, s));
      }),
      exit && h("li", { className: "is-exit is-" + (TIP[exit.code] || TIP.ACTIVE)[0] }, h(Icon, { name: "chevronRight", size: 13, className: "ai-trail-sep" }), h("span", null, exit.label || (TIP[exit.code] || TIP.ACTIVE)[2])));
  }
  var DS = { verificado: ["ok", "checkCircle", "Verificado"], incierto: ["warn", "alert", "Incierto"], fallido: ["err", "xCircle", "Fallido"] };
  function DeliveryState(p) {
    var d = DS[p.state] || DS.verificado;
    return h("span", { className: "ai-delivery " + d[0], title: "Estado del envío en Abaya" }, h(Icon, { name: d[1], size: 12 }), d[2], p.tries > 1 && h("span", { className: "ai-num" }, " · " + p.tries + " intentos"), p.rt && h("span", { className: "ai-num ai-delivery-rt" }, h(Icon, { name: "timer", size: 12 }), p.rt));
  }

  window.AsisteRPA = Object.assign(window.AsisteRPA || {}, {
    Icon: Icon, Button: Button, IconButton: IconButton, Badge: Badge, Count: Count, CampaignChip: CampaignChip, VersionStatus: VersionStatus, RobotState: RobotState, SessionState: SessionState,
    Kpi: Kpi, Panel: Panel, Tabs: Tabs, Segmented: Segmented, Callout: Callout, EmergencyStop: EmergencyStop, TopNav: TopNav, Shell: Shell, PageHead: PageHead,
    AgentBar: AgentBar, PromptEditor: PromptEditor, Accordion: Accordion, WhatsAppPreview: WhatsAppPreview, StageTrack: StageTrack, OneTimeSecret: OneTimeSecret, EvalReport: EvalReport,
    Typification: Typification, TypificationBar: TypificationBar, StageTrail: StageTrail, DeliveryState: DeliveryState, TIPIFICACIONES: TIP,
    LOGO_WHITE: LOGO_WHITE, LOGO_MARK: LOGO_MARK
  });
})();
