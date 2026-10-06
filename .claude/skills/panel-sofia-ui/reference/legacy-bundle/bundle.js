/* @ds-bundle: {"format":4,"namespace":"PanelSofia","components":[{"name":"Icon"},{"name":"Button"},{"name":"Badge"},{"name":"OriginBadge"},{"name":"VersionStatus"},{"name":"RobotStatus"},{"name":"VariableChip"},{"name":"Switch"},{"name":"Tabs"},{"name":"Card"},{"name":"StatCard"},{"name":"Stepper"},{"name":"DraftBanner"},{"name":"StopBanner"},{"name":"Callout"},{"name":"TemplateEditor"},{"name":"WhatsAppPreview"},{"name":"Funnel"},{"name":"EmergencyStop"},{"name":"AppShell"}]} */
(function () {
  var React = window.React, h = React.createElement, Frag = React.Fragment;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }

  /* Íconos de trazo, 24×24, grosor 2 (al estilo Lucide). En producción: lucide-react. */
  var P = {
    home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    package: "M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8",
    megaphone: "M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z M17 8a5 5 0 0 1 0 8",
    flask: "M9 3h6 M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3 M7 15h10",
    branch: "M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9a9 9 0 0 1-9 9",
    checklist: "M9 11l3 3 8-8 M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    sliders: "M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3",
    power: "M12 2v10 M18.4 6.6a9 9 0 1 1-12.8 0",
    play: "M7 4l13 8-13 8z",
    lock: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4",
    sparkles: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z M19 3v4 M21 5h-4",
    scale: "M12 3v18 M7 21h10 M4 7h16 M7 7l-3 7a3 3 0 0 0 6 0z M17 7l-3 7a3 3 0 0 0 6 0z",
    check: "M20 6 9 17l-5-5",
    x: "M18 6 6 18 M6 6l12 12",
    alert: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01",
    info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01",
    chevronDown: "m6 9 6 6 6-6",
    chevronRight: "m9 6 6 6-6 6",
    arrowUp: "M12 19V5 M5 12l7-7 7 7",
    arrowDown: "M12 5v14 M19 12l-7 7-7-7",
    send: "M22 2 11 13 M22 2l-7 20-4-9-9-4z",
    bold: "M6 4h8a4 4 0 0 1 0 8H6z M6 12h9a4 4 0 0 1 0 8H6z",
    list: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
    smile: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M8 14s1.5 2 4 2 4-2 4-2 M9 9h.01 M15 9h.01",
    braces: "M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1 M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1",
    diff: "M12 3v14 M5 10h14 M5 21h14",
    history: "M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5 M12 7v5l4 2",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
    panel: "M3 3h18v18H3z M9 3v18",
    bot: "M12 8V4H8 M4 8h16v12H4z M2 14h2 M20 14h2 M9 13v2 M15 13v2",
    file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8",
    plus: "M12 5v14 M5 12h14",
    copy: "M9 9h11v11H9z M5 15H4V4h11v1",
    eyeOff: "M3 3l18 18 M10.6 10.6a2 2 0 0 0 2.8 2.8 M9.9 5.1A10 10 0 0 1 12 5c7 0 10 7 10 7a17 17 0 0 1-2.2 3.2 M6.6 6.6C3.9 8.4 2 12 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6",
    upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
    rotate: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5",
    image: "M3 3h18v18H3z M9 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M21 15l-5-5L5 21",
    mic: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3",
    sticker: "M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5z M15 3v6h6",
    ccheck: "M18 7 7 18l-4-4 M22 7 11 18"
  };
  function Icon(p) {
    var size = p.size || 16, d = P[p.name] || P.info;
    return h("svg", { className: cx("ps-icon", p.className), width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: p.strokeWidth || 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": p.label ? undefined : true, role: p.label ? "img" : undefined, "aria-label": p.label },
      d.split(" M").map(function (s, i) { return h("path", { key: i, d: (i ? "M" : "") + s }); }));
  }

  function Button(p) {
    var v = p.variant || "secondary";
    var dis = !!p.disabled;
    return h("button", { type: p.type || "button", className: cx("ps-btn", "ps-btn-" + v, p.size === "sm" && "ps-btn-sm", p.className), disabled: dis && !p.reason ? true : undefined, "aria-disabled": dis ? "true" : undefined, title: p.reason || p.title, onClick: dis ? undefined : p.onClick },
      p.icon && h(Icon, { name: p.icon, size: p.size === "sm" ? 14 : 16 }), p.children, p.iconRight && h(Icon, { name: p.iconRight, size: 14 }));
  }

  function Badge(p) {
    return h("span", { className: cx("ps-badge", "ps-badge-" + (p.tone || "neutral"), p.className), title: p.title },
      p.dot && h("span", { className: cx("ps-dot", p.pulse && "ps-dot-pulse") }), p.icon && h(Icon, { name: p.icon, size: 13 }), p.children);
  }

  var ORIGIN = {
    ia: { tone: "ai", icon: "sparkles", label: "Lo redacta la IA", short: "IA", title: "El texto es una guía: el modelo lo adapta a cada cliente." },
    exacto: { tone: "exact", icon: "lock", label: "Texto exacto", short: "Exacto", title: "Se envía al cliente palabra por palabra." },
    legal: { tone: "legal", icon: "scale", label: "Legal", short: "Legal", title: "Restringido: lo edita y aprueba el rol Legal." }
  };
  function OriginBadge(p) {
    var o = ORIGIN[p.kind] || ORIGIN.ia;
    return h(Badge, { tone: o.tone, icon: o.icon, title: o.title }, p.label || (p.compact ? o.short : o.label));
  }

  var VSTATUS = {
    borrador: ["neutral", "Borrador"], evaluacion: ["primary", "En evaluación"], fallida: ["danger", "Evaluación fallida"],
    lista: ["warning", "Lista para aprobar"], aprobada: ["primary", "Aprobada"], publicada: ["success", "Publicada"], retirada: ["outline", "Retirada"]
  };
  var VICON = { borrador: "file", fallida: "x", aprobada: "check", publicada: "ccheck", retirada: "history" };
  function VersionStatus(p) {
    var s = VSTATUS[p.status] || VSTATUS.borrador;
    return h(Badge, { tone: s[0], dot: p.status === "evaluacion", pulse: p.status === "evaluacion", icon: VICON[p.status] }, s[1]);
  }

  var RSTATUS = { activo: "Activo", detenido: "Detenido", "sin-sesion": "Sin sesión en Abaya", "sin-senal": "Sin señal" };
  function RobotStatus(p) {
    var s = p.status || "activo";
    return h("span", { className: cx("ps-robot", "ps-robot-" + s), title: "Último latido: " + (p.heartbeat || "hace 4 s"), role: "status" },
      h("span", { className: "ps-dot" }), "Robot " + RSTATUS[s].toLowerCase(), p.heartbeat && h("span", { className: "ps-robot-meta" }, "· " + p.heartbeat));
  }

  function VariableChip(p) {
    var n = p.name || "Nombre", sys = /^\{\{/.test(n);
    var cls = p.unknown ? "ps-var-unknown" : p.locked ? "ps-var-locked" : sys ? "ps-var-system" : "";
    return h("span", { className: cx("ps-var", cls), title: p.unknown ? "Variable desconocida: no se reemplazará" : p.locked ? "Variable bloqueada: no se puede borrar" : undefined },
      p.locked && h(Icon, { name: "lock", size: 11 }), n);
  }

  function Switch(p) {
    return h("span", { role: "switch", tabIndex: p.disabled ? -1 : 0, "aria-checked": p.checked ? "true" : "false", "aria-disabled": p.disabled ? "true" : undefined, className: "ps-switch", title: p.reason, onClick: p.disabled ? undefined : p.onChange },
      h("span", { className: "ps-switch-track" }), p.label && h("span", null, p.label));
  }

  function Tabs(p) {
    return h("div", { className: "ps-tabs", role: "tablist" }, (p.items || []).map(function (t) {
      return h("button", { key: t.id, role: "tab", className: "ps-tab", "aria-selected": t.id === p.active ? "true" : "false", onClick: p.onChange ? function () { p.onChange(t.id); } : undefined },
        t.label, t.count != null && h("span", { className: "ps-tab-count" }, t.count), t.dirty && h("span", { className: "ps-tab-dirty", title: "Cambios sin guardar" }));
    }));
  }

  function Card(p) {
    return h("section", { className: cx("ps-card", p.className), style: p.style },
      (p.title || p.actions) && h("div", { className: "ps-card-head" },
        h("div", null, p.title && h("h3", { className: "ps-card-title" }, p.title, p.badge), p.description && h("p", { className: "ps-card-desc" }, p.description)),
        p.actions && h("div", { className: "ps-card-actions" }, p.actions)),
      h("div", { className: "ps-card-body", style: p.bodyStyle }, p.children));
  }

  function StatCard(p) {
    var dir = p.trend || (p.delta == null ? "flat" : String(p.delta).charAt(0) === "-" ? "down" : String(p.delta) === "0" ? "flat" : "up");
    var tone = p.good === false ? (dir === "up" ? "down" : dir === "down" ? "up" : "flat") : dir;
    return h("div", { className: cx("ps-card", "ps-stat", p.alert && "ps-stat-alert") },
      h("div", { className: "ps-stat-label" }, p.icon && h(Icon, { name: p.icon, size: 14 }), p.label),
      h("div", { className: "ps-stat-value" }, p.value),
      h("div", { className: cx("ps-stat-delta", "ps-delta-" + tone) },
        dir !== "flat" && h(Icon, { name: dir === "up" ? "arrowUp" : "arrowDown", size: 12 }), p.delta != null ? p.delta : "—", h("span", { className: "ps-stat-hint" }, " " + (p.hint || "vs. ayer"))));
  }

  var CYCLE = ["Borrador", "Evaluación", "Aprobación", "Publicada"];
  function Stepper(p) {
    var steps = p.steps || CYCLE, cur = p.current == null ? 0 : p.current;
    var out = [];
    steps.forEach(function (s, i) {
      var st = p.failedAt === i ? "failed" : i < cur ? "done" : i === cur ? (cur === steps.length - 1 ? "done" : "current") : "todo";
      if (i) out.push(h("li", { key: "l" + i, className: cx("ps-step-line", i <= cur && p.failedAt !== i && "ps-step-line-done"), "aria-hidden": true }));
      out.push(h("li", { key: i, className: cx("ps-step", "ps-step-" + st), "aria-current": st === "current" ? "step" : undefined },
        h("span", { className: "ps-step-n" }, st === "done" ? h(Icon, { name: "check", size: 13, strokeWidth: 3 }) : st === "failed" ? h(Icon, { name: "x", size: 13, strokeWidth: 3 }) : i + 1), s));
    });
    return h("ol", { className: "ps-stepper", "aria-label": "Ciclo de publicación" }, out);
  }

  function DraftBanner(p) {
    return h("div", { className: "ps-band ps-band-draft", role: "note" },
      h(Icon, { name: "file", size: 15 }),
      h("span", null, "Estás editando el ", h("strong", null, "borrador"), " · Los clientes siguen viendo la ", h("strong", null, p.version || "v12")),
      p.changes ? h(Badge, { tone: "primary" }, p.changes + " cambios sin publicar") : null,
      h("div", { className: "ps-band-actions" }, h(Button, { size: "sm", variant: "secondary", icon: "flask" }, "Probar borrador"), h(Button, { size: "sm", variant: "primary", icon: "checklist" }, "Enviar a evaluación")));
  }

  function StopBanner(p) {
    return h("div", { className: "ps-band ps-band-stop", role: "alert" }, h(Icon, { name: "power", size: 15 }),
      h("span", null, "Robot detenido por " + (p.by || "J. Pérez") + " a las " + (p.at || "15:04") + ". Los clientes no reciben respuestas."),
      h("div", { className: "ps-band-actions" }, h(Button, { size: "sm", variant: "danger", icon: "play" }, "Reanudar")));
  }

  function Callout(p) {
    var tone = p.tone || "info", ic = { warning: "alert", danger: "alert", info: "info", success: "check" }[tone];
    return h("div", { className: cx("ps-callout", "ps-callout-" + tone), role: tone === "danger" ? "alert" : "note" }, h(Icon, { name: p.icon || ic, size: 15 }), h("div", null, p.children));
  }

  /* Formato de WhatsApp: *negrita*, _cursiva_, ~tachado~, saltos de línea, viñetas • y emojis. */
  function waInline(text, vars, keyBase) {
    var parts = [], re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|\[[A-Za-zÁÉÍÓÚáéíóúñÑ ]+\]|\{\{[A-Z_]+\}\})/g, last = 0, m, k = 0;
    while ((m = re.exec(text))) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      var t = m[0], c = t.charAt(0);
      if (c === "*") parts.push(h("b", { key: keyBase + k++ }, t.slice(1, -1)));
      else if (c === "_") parts.push(h("i", { key: keyBase + k++ }, t.slice(1, -1)));
      else if (c === "~") parts.push(h("s", { key: keyBase + k++ }, t.slice(1, -1)));
      else if (vars && vars[t] != null) parts.push(vars[t]);
      else if (vars === false) parts.push(t);
      else parts.push(h("span", { key: keyBase + k++, className: "ps-wa-var" }, t));
      last = m.index + t.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }
  function WaText(p) { return h(Frag, null, waInline(p.text || "", p.vars, "w")); }

  function WhatsAppPreview(p) {
    var msgs = p.messages || [], prev = null;
    return h("div", { className: cx("ps-wa", p.className), style: { height: p.height } },
      h("div", { className: "ps-wa-head" }, h("div", { className: "ps-wa-avatar" }, "S"),
        h("div", null, h("div", { className: "ps-wa-name" }, p.title || "Sofía · Claro"), h("div", { className: "ps-wa-sub" }, p.typing ? "escribiendo…" : (p.subtitle || "en línea"))),
        p.badge && h("div", { style: { marginLeft: "auto" } }, p.badge)),
      h("div", { className: "ps-wa-body" }, h("div", { className: "ps-wa-day" }, p.day || "HOY"),
        msgs.map(function (m, i) {
          var first = m.from !== prev; prev = m.from;
          return h("div", { key: i, className: cx("ps-wa-msg", "ps-wa-msg-" + (m.from || "bot"), first && "ps-wa-first") },
            waInline(m.text, p.vars, "m" + i + "-"),
            h("span", { className: "ps-wa-time" }, m.time || "14:32", m.from === "client" && h(Icon, { name: "ccheck", size: 14 })));
        }),
        p.typing && h("div", { className: "ps-wa-msg ps-wa-msg-bot ps-wa-first", "aria-label": "Sofía está escribiendo" }, h("span", { className: "ps-typing" }, h("i"), h("i"), h("i")))),
      p.input !== false && h("div", { className: "ps-wa-input" }, h("div", { className: "ps-wa-field" }, p.placeholder || "Escribe como cliente…"), h("div", { className: "ps-wa-send" }, h(Icon, { name: "send", size: 16 }))));
  }

  function TemplateEditor(p) {
    var vars = p.variables || [];
    var len = (p.value || "").length;
    return h("div", { className: "ps-editor" },
      h("div", { className: "ps-toolbar", role: "toolbar", "aria-label": "Formato" },
        h("button", { className: "ps-tool", title: "Emoji" }, h(Icon, { name: "smile", size: 15 })),
        h("button", { className: "ps-tool", title: "Negrita WhatsApp (envuelve en *…*)" }, h(Icon, { name: "bold", size: 15 })),
        h("button", { className: "ps-tool", title: "Viñeta •" }, "•"),
        h("span", { className: "ps-tool-sep" }),
        vars.map(function (v) { return h("button", { key: v, className: "ps-tool", title: "Insertar " + v }, h(VariableChip, { name: v })); }),
        p.badge && h("span", { style: { marginLeft: "auto", paddingRight: 4 } }, p.badge)),
      h("div", { className: "ps-editor-area", style: { minHeight: p.minHeight } }, waInline(p.value || "", false, "e").map(function (x, i) {
        if (typeof x === "string") return h(Frag, { key: i }, x.split(/(\[[A-Za-zÁÉÍÓÚáéíóúñÑ ]+\]|\{\{[A-Z_]+\}\})/).map(function (s, j) {
          return /^\[|^\{\{/.test(s) ? h(VariableChip, { key: j, name: s, unknown: vars.indexOf(s) < 0 && (p.locked || []).indexOf(s) < 0, locked: (p.locked || []).indexOf(s) >= 0 }) : s;
        }));
        return x;
      })),
      p.warning && h("div", { style: { padding: "0 12px 10px" } }, h(Callout, { tone: "warning" }, p.warning)),
      h("div", { className: "ps-editor-foot" }, h("span", null, p.footLeft || "Respeta saltos de línea y emojis"), h("span", null, len + (p.max ? " / " + p.max : "") + " caracteres")));
  }

  function Funnel(p) {
    var steps = p.steps || [], max = steps.length ? steps[0].value : 1;
    return h("div", { className: "ps-funnel" }, steps.map(function (s) {
      return h("div", { key: s.label, className: "ps-funnel-row" }, h("span", { className: "ps-muted" }, s.label),
        h("div", { className: "ps-funnel-bar" }, h("div", { className: "ps-funnel-fill", style: { width: Math.max(4, s.value / max * 100) + "%" } })),
        h("span", { className: "ps-num" }, s.value));
    }));
  }

  function EmergencyStop(p) {
    return p.stopped ? h(Button, { variant: "danger-outline", icon: "play", size: p.size }, "Reanudar robot") : h(Button, { variant: "danger", icon: "power", size: p.size }, "Apagado de emergencia");
  }

  var NAV = [
    { id: "inicio", label: "Inicio", icon: "home" },
    { id: "conversacion", label: "Conversación", icon: "message", children: [
      { id: "personalidad", label: "Personalidad", origin: "ia" }, { id: "pasos", label: "Instrucciones por paso", origin: "ia" },
      { id: "textos", label: "Textos fijos", origin: "exacto" }, { id: "objeciones", label: "Objeciones", origin: "ia" }, { id: "legal", label: "Texto legal", origin: "legal" }] },
    { id: "catalogo", label: "Catálogo de planes", icon: "package" },
    { id: "campanas", label: "Campañas", icon: "megaphone" },
    { id: "simulador", label: "Probar conversación", icon: "flask" },
    { id: "versiones", label: "Versiones y publicación", icon: "branch" },
    { id: "evaluaciones", label: "Evaluaciones", icon: "checklist" },
    { id: "monitoreo", label: "Monitoreo", icon: "activity" },
    { id: "auditoria", label: "Auditoría", icon: "shield" },
    { id: "configuracion", label: "Configuración", icon: "sliders" }
  ];
  var ODOT = { ia: "var(--ai)", exacto: "var(--exact)", legal: "var(--legal)" };
  function Sidebar(p) {
    var a = p.active || "inicio";
    return h("nav", { className: "ps-side", "aria-label": "Navegación principal" },
      h("div", { className: "ps-side-brand" }, h("div", { className: "ps-side-mark" }, "S"), h("div", null, h("div", { className: "ps-side-name" }, "Panel Sofía"), h("div", { className: "ps-side-sub" }, "Robot de ventas · Abaya"))),
      NAV.map(function (n) {
        var open = n.children && n.children.some(function (c) { return c.id === a; });
        return h(Frag, { key: n.id },
          h("a", { className: "ps-nav", "aria-current": a === n.id ? "page" : undefined }, h(Icon, { name: n.icon, size: 16 }), n.label, n.id === "inicio" && p.reviewCount ? h("span", { className: "ps-nav-tag" }, h(Badge, { tone: "warning" }, p.reviewCount)) : null),
          n.children && (open || p.expandAll !== false) && n.children.map(function (c) {
            return h("a", { key: c.id, className: "ps-nav ps-nav-sub", "aria-current": a === c.id ? "page" : undefined }, c.label,
              h("span", { className: "ps-nav-tag", title: ORIGIN[c.origin].label }, h("span", { className: "ps-dot", style: { background: ODOT[c.origin], width: 6, height: 6 } })),
              p.dirty && p.dirty.indexOf(c.id) >= 0 ? h("span", { className: "ps-tab-dirty", title: "Cambios sin guardar", style: { marginLeft: 6 } }) : null);
          }));
      }),
      h("div", { className: "ps-side-foot" }, h("a", { className: "ps-nav" }, h(Icon, { name: "panel", size: 16 }), "Contraer menú")));
  }

  function TopBar(p) {
    return h("header", { className: "ps-top" },
      h(RobotStatus, { status: p.robot || "activo" }),
      h("a", { className: "ps-top-version", title: "Ir a Versiones" }, h(Icon, { name: "branch", size: 14 }), "Contenido ", h("b", null, p.version || "v12"), " · publicada 05/10/2026 14:32 por J. Pérez"),
      p.draftCount ? h(Badge, { tone: "primary", icon: "file" }, "Borrador con " + p.draftCount + " cambios sin publicar") : null,
      h("div", { className: "ps-search" }, h(Icon, { name: "search", size: 14 }), "Buscar…", h("span", { className: "ps-kbd" }, "Ctrl K")),
      h(EmergencyStop, { stopped: p.robot === "detenido", size: "sm" }),
      h("div", { className: "ps-user" }, h("div", { className: "ps-avatar" }, p.initials || "AR"), h("div", null, h("div", { className: "ps-user-name" }, p.user || "Ana Rojas"), h("div", { className: "ps-user-role" }, p.role || "Editora de contenido"))),
      h("button", { className: "ps-btn ps-btn-ghost ps-btn-sm", title: "Salir", "aria-label": "Salir" }, h(Icon, { name: "logout", size: 15 })));
  }

  function AppShell(p) {
    return h("div", { className: "ps ps-app" },
      h(Sidebar, { active: p.active, reviewCount: p.reviewCount, dirty: p.dirty }),
      h("div", { className: "ps-main" },
        h(TopBar, { robot: p.robot, version: p.version, draftCount: p.draftCount, user: p.user, role: p.role, initials: p.initials }),
        p.robot === "detenido" && h(StopBanner, { by: p.stoppedBy, at: p.stoppedAt }),
        p.draft && h(DraftBanner, { version: p.version, changes: p.draftCount }),
        h("main", { className: "ps-page" },
          (p.title || p.actions) && h("div", { className: "ps-page-head" },
            h("div", null, p.crumbs && h("div", { className: "ps-crumbs" }, p.crumbs), h("h1", { className: "ps-page-title" }, p.title, p.titleBadge)),
            p.actions && h("div", { className: "ps-page-actions" }, p.actions)),
          p.children)));
  }

  window.PanelSofia = Object.assign(window.PanelSofia || {}, {
    Icon: Icon, Button: Button, Badge: Badge, OriginBadge: OriginBadge, VersionStatus: VersionStatus, RobotStatus: RobotStatus,
    VariableChip: VariableChip, Switch: Switch, Tabs: Tabs, Card: Card, StatCard: StatCard, Stepper: Stepper, DraftBanner: DraftBanner,
    StopBanner: StopBanner, Callout: Callout, TemplateEditor: TemplateEditor, WhatsAppPreview: WhatsAppPreview, WaText: WaText, Funnel: Funnel,
    EmergencyStop: EmergencyStop, Sidebar: Sidebar, TopBar: TopBar, AppShell: AppShell
  });
})();
