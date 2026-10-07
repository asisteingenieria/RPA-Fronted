/**
 * Layout del panel: TopNav navy de Asiste (Opción C) + banda de robot detenido + contenido.
 * Sin menú lateral. Conecta `onNavigate` / `href` con el router que ya use el proyecto.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, Bell, Bot, Clock, LayoutGrid, MessageSquareText, Play, Power, ScrollText, Users, type LucideIcon } from "lucide-react";
import { Button, Count, IconButton, cx, ICON } from "./ui";
import { can, REASON, type Role } from "../../lib/roles";
import { formatClock } from "../../lib/format";

export type Section = "en-vivo" | "robots" | "agente" | "usuarios" | "auditoria";
const NAV: { id: Section; label: string; icon: LucideIcon; admin?: boolean }[] = [
  { id: "en-vivo", label: "En vivo", icon: Activity },
  { id: "robots", label: "Robots", icon: Bot },
  { id: "agente", label: "Agente", icon: MessageSquareText },
  { id: "usuarios", label: "Usuarios", icon: Users, admin: true },
  { id: "auditoria", label: "Auditoría", icon: ScrollText, admin: true },
];

/* ───── Apagado de emergencia: ambos roles detienen; reanudar solo ADMIN ───── */
export function EmergencyStop({ stopped, role, onStop, onResume, onNavy, size = "sm" }: {
  stopped: boolean; role: Role; onStop: () => Promise<void> | void; onResume: () => Promise<void> | void; onNavy?: boolean; size?: "sm" | "xl";
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void> | void) => { setBusy(true); try { await fn(); } finally { setBusy(false); setConfirming(false); } };

  if (stopped)
    return (
      <Button variant={onNavy ? "on-navy" : "secondary"} size="sm" icon={Play} loading={busy}
        reason={can(role, "reanudar") ? undefined : REASON.reanudar} onClick={() => run(onResume)}>
        Reanudar robot
      </Button>
    );
  if (confirming)
    return (
      <span className="ai-confirm-inline" role="alertdialog" aria-label="Confirmar apagado">
        ¿Detener TODAS las acciones del robot?
        <Button variant="danger" size="sm" loading={busy} onClick={() => run(onStop)} autoFocus>Confirmar</Button>
        <Button size="sm" onClick={() => setConfirming(false)}>Cancelar</Button>
      </span>
    );
  return (
    <Button variant="danger" size={size} icon={Power} onClick={() => setConfirming(true)} style={size === "xl" ? { width: "auto", padding: "0 24px" } : undefined}>
      Apagado de emergencia
    </Button>
  );
}

/* ───── Reloj en vivo (actualiza cada 30 s) ───── */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  return <span className="ai-clock-chip"><Clock {...ICON} size={15} />{formatClock(now)}</span>;
}

/* ───── TopNav ───── */
export interface TopNavProps {
  active: Section;
  role: Role;
  user: { name: string; initials: string };
  robotStopped: boolean;
  lastUpdate?: string;
  /** Contador cian en "En vivo": revisiones + envíos inciertos + robots caídos. */
  attention?: number;
  logoSrc: string; // asiste-mark-white.png empaquetado en el proyecto
  onNavigate: (s: Section) => void;
  onStop: () => Promise<void> | void;
  onResume: () => Promise<void> | void;
  userMenu?: ReactNode; // menú del avatar: nombre, rol, Tema, Cambiar contraseña, Cerrar sesión
}
export function TopNav(p: TopNavProps) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);
  const items = NAV.filter((n) => !n.admin || p.role === "ADMIN");
  return (
    <header className={cx("ai-topnav", p.robotStopped && "is-stopped")}>
      <div className="ai-brand">
        <img src={p.logoSrc} alt="" />
        <div><div className="ai-brand-name">ASISTE ING</div><div className="ai-brand-sub">Agente RPA · Ventas</div></div>
      </div>
      <IconButton icon={LayoutGrid} label="Cambiar de módulo" />
      <nav className="ai-topnav-links" aria-label="Principal">
        {items.map((n, i) => (
          <span key={n.id} style={{ display: "contents" }}>
            {n.admin && items[i - 1] && !items[i - 1].admin && <span className="ai-topnav-sep" aria-hidden />}
            <a href={`#/${n.id}`} className={cx("ai-topnav-link", p.active === n.id && "is-active")} aria-current={p.active === n.id ? "page" : undefined}
              onClick={(e) => { e.preventDefault(); p.onNavigate(n.id); }}>
              <n.icon {...ICON} />
              {n.label}
              {n.id === "en-vivo" && !!p.attention && <Count alert>{p.attention}</Count>}
            </a>
          </span>
        ))}
      </nav>
      <div className="ai-topnav-right">
        <span className={cx("ai-robot-pill", p.robotStopped && "is-stopped")} role="status" title={p.lastUpdate ? `Actualizado ${p.lastUpdate}` : undefined}>
          <span className="ai-dot" />{p.robotStopped ? "ROBOT DETENIDO" : "Robot operando"}
        </span>
        <EmergencyStop stopped={p.robotStopped} role={p.role} onStop={p.onStop} onResume={p.onResume} onNavy />
        <LiveClock />
        <span className="ai-bell"><IconButton icon={Bell} label="Alertas" /></span>
        <div ref={ref} style={{ position: "relative" }}>
          <button type="button" className="ai-avatar" style={{ border: 0, cursor: "pointer" }} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} title={`${p.user.name} · ${p.role}`}>
            {p.user.initials}
          </button>
          {menu && p.userMenu && (
            <div role="menu" style={{ position: "absolute", right: 0, top: 44, minWidth: 240, background: "var(--surface-100)", color: "var(--ink)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-pop)", padding: 8, zIndex: 20 }}>
              {p.userMenu}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ───── Layout ───── */
export function AppLayout({ nav, stoppedBy, stoppedAt, children }: { nav: TopNavProps; stoppedBy?: string; stoppedAt?: string; children: ReactNode }) {
  return (
    <div className="ai-scope" style={{ minHeight: "100vh" }}>
      <TopNav {...nav} />
      {nav.robotStopped && (
        <div className="ai-stop-band" role="alert">
          <Power {...ICON} />
          Robot detenido{stoppedBy ? ` por ${stoppedBy}` : ""}{stoppedAt ? ` a las ${stoppedAt}` : ""}. No se envía nada a los clientes; la lectura continúa.
          <EmergencyStop stopped role={nav.role} onStop={nav.onStop} onResume={nav.onResume} />
        </div>
      )}
      <main className="ai-content">{children}</main>
    </div>
  );
}
