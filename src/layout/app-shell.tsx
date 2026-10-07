/**
 * Layout del panel (kit asiste-agente-rpa-ui): TopNav navy de 60 px + banda roja si el robot está
 * detenido + contenido. Navegación: En vivo · Robots · Agente | Usuarios · Auditoría (solo ADMIN).
 * Debajo de 1280 px las pestañas quedan con ícono y tooltip; debajo de 768 px, menú hamburguesa.
 */
import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Activity,
  Bell,
  Bot,
  Clock,
  KeyRound,
  LogOut,
  Menu,
  MessageSquareText,
  Monitor,
  Moon,
  Power,
  ScrollText,
  Sun,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock, fmtTime, initials } from '@/lib/format';
import { useTheme, type ThemePref } from '@/lib/theme';
import { useSessionActions, useUser } from '@/auth/session';
import { useOverview, useReview } from '@/hooks/queries';
import { Count, ICON } from '@/components/rpa/common';
import { EmergencyStop } from '@/components/rpa/emergency';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import markWhite from '@/assets/asiste-mark-white.png';

interface NavItem {
  to: '/en-vivo' | '/robots' | '/agente' | '/usuarios' | '/auditoria';
  label: string;
  icon: LucideIcon;
  admin?: boolean;
}
const NAV: NavItem[] = [
  { to: '/en-vivo', label: 'En vivo', icon: Activity },
  { to: '/robots', label: 'Robots', icon: Bot },
  { to: '/agente', label: 'Agente', icon: MessageSquareText },
  { to: '/usuarios', label: 'Usuarios', icon: Users, admin: true },
  { to: '/auditoria', label: 'Auditoría', icon: ScrollText, admin: true },
];

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full bg-on-navy-soft px-3 text-[13px] leading-4 font-semibold whitespace-nowrap text-on-navy tabular-nums max-xl:hidden">
      <Clock {...ICON} className="size-[15px]" aria-hidden />
      {formatClock(now)}
      <span className="sr-only">hora de Bogotá</span>
    </span>
  );
}

const THEME_ITEMS: { id: ThemePref; label: string; icon: LucideIcon }[] = [
  { id: 'sistema', label: 'Automático (sistema)', icon: Monitor },
  { id: 'claro', label: 'Claro', icon: Sun },
  { id: 'oscuro', label: 'Oscuro', icon: Moon },
];

function UserMenu() {
  const me = useUser();
  const { logout } = useSessionActions();
  const { pref, setPref } = useTheme();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="grid size-[34px] shrink-0 cursor-pointer place-items-center rounded-full bg-navy-active text-xs font-semibold text-on-navy"
          aria-label={`Menú de ${me.username} (${me.role})`}
        >
          {initials(me.username)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 shadow-pop">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-semibold text-ink">{me.username}</div>
          <div className="text-xs text-ink-muted">Rol {me.role}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-ink-subtle">Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={pref} onValueChange={(v) => setPref(v as ThemePref)}>
          {THEME_ITEMS.map((t) => (
            <DropdownMenuRadioItem key={t.id} value={t.id}>
              <t.icon {...ICON} aria-hidden /> {t.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate({ to: '/cuenta/contrasena' })}>
          <KeyRound {...ICON} aria-hidden /> Cambiar contraseña
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut {...ICON} aria-hidden /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopNav({ stopped, unknown, attention }: { stopped: boolean; unknown: boolean; attention: number }) {
  const me = useUser();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => setOpen(false), [path]);
  const items = NAV.filter((n) => !n.admin || me.role === 'ADMIN');

  return (
    <header
      className={cn(
        'relative flex h-[60px] items-center gap-3.5 bg-navy px-6 text-navy-ink max-md:gap-2 max-md:px-3',
        stopped && 'shadow-[inset_0_-3px_0_var(--danger-solid)]',
      )}
    >
      <Link to="/en-vivo" className="flex shrink-0 items-center gap-2.5" aria-label="Asiste ING · Agente RPA · inicio">
        <img src={markWhite} alt="" className="block h-auto w-[30px]" />
        <div className="leading-none whitespace-nowrap max-md:hidden">
          <div className="font-display text-base leading-[18px] font-bold tracking-[.02em] text-on-navy">ASISTE ING</div>
          <div className="text-[11px] leading-[14px] font-medium tracking-[.04em] text-on-navy-muted max-xl:hidden">
            Agente RPA · Ventas
          </div>
        </div>
      </Link>

      <button
        type="button"
        className="grid size-9 cursor-pointer place-items-center rounded-sm text-navy-ink hover:bg-on-navy-soft hover:text-on-navy md:hidden"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X {...ICON} className="size-5" /> : <Menu {...ICON} className="size-5" />}
      </button>

      <nav
        aria-label="Principal"
        className={cn(
          'flex h-full gap-1 max-md:hidden',
          open &&
            'max-md:absolute max-md:inset-x-0 max-md:top-[60px] max-md:z-40 max-md:flex max-md:h-auto max-md:flex-col max-md:bg-navy max-md:p-2 max-md:shadow-pop',
        )}
      >
        {items.map((n, i) => {
          const sep = n.admin && items[i - 1] && !items[i - 1]!.admin;
          const link = (
            <Link
              to={n.to}
              className="ai-topnav-link flex h-full items-center gap-2 px-2.5 text-[13.5px] leading-5 font-medium whitespace-nowrap text-navy-ink hover:text-on-navy aria-[current=page]:font-semibold aria-[current=page]:text-on-navy max-md:h-11"
            >
              <n.icon {...ICON} className="size-4 shrink-0" aria-hidden />
              <span className="max-xl:sr-only max-md:not-sr-only">{n.label}</span>
              {n.to === '/en-vivo' && attention > 0 && (
                <Count alert>
                  {attention}
                  <span className="sr-only"> pendientes de atención</span>
                </Count>
              )}
            </Link>
          );
          return (
            <span key={n.to} className="contents">
              {sep && <span className="mx-1.5 h-6 w-px self-center bg-on-navy-line max-md:my-1.5 max-md:h-px max-md:w-auto" aria-hidden />}
              <Tooltip>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent className="xl:hidden max-md:hidden">{n.label}</TooltipContent>
              </Tooltip>
            </span>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2.5 max-md:gap-1.5">
        <span
          role="status"
          className={cn(
            'inline-flex h-8 items-center gap-2 rounded-full bg-on-navy-soft px-3 text-[12.5px] leading-4 font-semibold whitespace-nowrap text-on-navy',
            stopped && 'bg-danger-solid',
          )}
        >
          {stopped ? (
            <Power {...ICON} className="size-3.5" aria-hidden />
          ) : unknown ? (
            <span className="ai-dot bg-warning-soft" aria-hidden />
          ) : (
            <span className="ai-live-dot" aria-hidden />
          )}
          <span className="max-lg:sr-only">{stopped ? 'ROBOT DETENIDO' : unknown ? 'Estado desconocido' : 'Robot operando'}</span>
        </span>
        <EmergencyStop stopped={stopped} role={me.role} onNavy />
        <LiveClock />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Alertas"
              aria-disabled
              className="grid size-8 cursor-not-allowed place-items-center rounded-sm text-navy-ink opacity-60 max-md:hidden"
            >
              <Bell {...ICON} className="size-4" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent>Alertas: el servidor todavía no las expone al panel (llegan por Slack/Teams)</TooltipContent>
        </Tooltip>
        <UserMenu />
      </div>
    </header>
  );
}

export function AppShell() {
  const me = useUser();
  const overview = useOverview();
  const review = useReview();
  const stopped = overview.data?.killSwitch ?? false;
  const attention =
    (review.data ? review.data.conversations.length + review.data.uncertainMessages.length : 0) +
    (overview.data?.sessions.filter((s) => s.status === 'DOWN').length ?? 0);

  return (
    <div className="min-h-screen bg-surface-0">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface-100 focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>
      <TopNav stopped={stopped} unknown={!overview.data} attention={attention} />
      {stopped && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 border-b border-danger bg-danger-soft px-8 py-2.5 text-[13px] leading-[18px] font-semibold text-danger max-md:px-4"
        >
          <Power {...ICON} className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            Robot detenido. No se envía nada a los clientes; la lectura continúa.
            {overview.data && <span className="font-medium"> Estado confirmado {fmtTime(overview.data.generatedAt, true)}.</span>}
          </span>
          <EmergencyStop stopped role={me.role} />
        </div>
      )}
      <main id="contenido" className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-8 py-6 max-md:px-4 max-md:py-4">
        <Outlet />
      </main>
    </div>
  );
}
