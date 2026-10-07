import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { FileText, GitBranch, KeyRound, LogOut, Monitor, Moon, PanelLeftClose, PanelLeftOpen, RotateCcw, Search, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime, formatTime } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { ROLE_LABEL, useSessionCtx, useUser } from '@/auth/session';
import { backend } from '@/data/store';
import { OPS_LIVE } from '@/data/ops-http';
import { useContent, useDb, useRobot } from '@/hooks/use-data';
import { useDirtyIds } from '@/hooks/use-editor';
import { NAV, ORIGIN_DOT } from '@/components/panel/navigation';
import { Pill, RobotStatus } from '@/components/panel/badges';
import { DraftBanner, EmergencyStop, StopBanner } from '@/components/panel/workflow';
import { ConfirmDialog } from '@/components/panel/common';
import { SubmitDialog } from '@/components/panel/submit-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChangePasswordForm } from '@/pages/login';
import { CommandMenu } from './command-menu';

const EDITING = ['/conversacion', '/catalogo', '/campanas'];
const COLLAPSE_KEY = 'panel-sofia:menu-contraido';

export const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const db = useDb();
  const dirty = useDirtyIds();
  const isActive = (to: string) => (to === '/' ? path === '/' : path === to || path.startsWith(to + '/'));

  return (
    <aside className={cn('sticky top-0 flex h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] duration-150', collapsed ? 'w-[60px]' : 'w-[236px]')} aria-label="Navegación principal">
      <div className={cn('flex h-[72px] items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
        <div className="grid size-[30px] shrink-0 place-items-center rounded-md bg-foreground text-sm font-bold text-background">S</div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-5 text-foreground">Panel Sofía</div>
            <div className="truncate text-xs text-muted-foreground">Robot de ventas · Abaya</div>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const Icon = item.icon!;
            const active = isActive(item.to);
            const count = item.id === 'inicio' ? db.alerts.length : 0;
            const link = (
              <Link
                to={item.children ? item.children[0]!.to : item.to}
                className={cn(
                  'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-sidebar-foreground hover:bg-surface-2 hover:text-foreground',
                  active && !item.children && 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  active && item.children && 'text-foreground',
                  collapsed && 'justify-center px-0',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && count > 0 && <Pill tone="warning">{count}</Pill>}
              </Link>
            );
            return (
              <li key={item.id}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
                {item.children && !collapsed && (
                  <ul className="mt-0.5 flex flex-col gap-0.5">
                    {item.children.map((c) => {
                      const a = isActive(c.to);
                      return (
                        <li key={c.id}>
                          <Link
                            to={c.to}
                            className={cn(
                              'flex h-8 items-center gap-2 rounded-md pl-[34px] pr-2.5 text-[13.5px] text-sidebar-foreground hover:bg-surface-2 hover:text-foreground',
                              a && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                            )}
                          >
                            <span className="flex-1 truncate">{c.label}</span>
                            {[...dirty].some((d) => d === c.id || d.startsWith(c.id + ':')) && <span className="size-1.5 rounded-full bg-warning" title="Cambios sin guardar" aria-label="Cambios sin guardar" />}
                            {c.origin && <span className={cn('size-1.5 rounded-full', ORIGIN_DOT[c.origin])} aria-hidden />}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t p-2">
        <button type="button" onClick={onToggle} className={cn('flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-sidebar-foreground hover:bg-surface-2', collapsed && 'justify-center px-0')} aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}>
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && 'Contraer menú'}
        </button>
      </div>
    </aside>
  );
}

function TopBar({ onSearch }: { onSearch: () => void }) {
  const { user } = useUser();
  const { logout } = useSessionCtx();
  const { pub, changes } = useContent();
  const { robot, setStopped } = useRobot();
  const { pref, setPref } = useTheme();
  const [changePw, setChangePw] = useState(false);
  const status = robot.stopped ? 'detenido' : robot.session;
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-6 backdrop-blur">
      <RobotStatus status={status} lastHeartbeat={robot.lastHeartbeat ? formatDateTime(robot.lastHeartbeat) : 'sin datos'} />
      <Link to="/versiones" className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
        <GitBranch className="size-4 shrink-0" aria-hidden />
        <span className="truncate">
          Contenido <strong className="font-semibold text-foreground">v{pub.number}</strong> · publicada {formatDateTime(pub.publishedAt ?? pub.createdAt)} por {pub.publishedBy ?? pub.author}
        </span>
      </Link>
      {changes.length > 0 && (
        <Link to="/versiones" className="shrink-0">
          <Pill tone="primary">
            <FileText aria-hidden />
            Borrador con {changes.length} {changes.length === 1 ? 'cambio' : 'cambios'} sin publicar
          </Pill>
        </Link>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <button type="button" onClick={onSearch} className="flex h-8 w-44 items-center gap-2 rounded-md border bg-card px-2.5 text-[13px] text-ink-faint hover:border-border-strong">
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="rounded-sm border bg-surface-2 px-1 font-mono text-[11px]">Ctrl K</kbd>
        </button>
        <EmergencyStop stopped={robot.stopped} onStop={() => setStopped.mutate(true)} onResume={() => setStopped.mutate(false)} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-surface-2">
              <Avatar className="size-8">
                <AvatarFallback className="bg-surface-2 text-xs font-semibold">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <span className="hidden leading-4 xl:block">
                <span className="block text-[13px] font-medium">{user.name}</span>
                <span className="block text-xs text-muted-foreground">{user.title}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.roles.map((r) => ROLE_LABEL[r]).join(', ')}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Tema</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={pref} onValueChange={(v) => setPref(v as typeof pref)}>
              <DropdownMenuRadioItem value="claro">
                <Sun /> Claro
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="oscuro">
                <Moon /> Oscuro
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="sistema">
                <Monitor /> Sistema
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            {!OPS_LIVE && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    backend.resetDemo();
                    logout();
                  }}
                >
                  <RotateCcw /> Restablecer datos de demostración
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setChangePw(true)}>
              <KeyRound /> Cambiar contraseña
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={logout}>
              <LogOut /> Salir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={logout} aria-label="Salir">
              <LogOut />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Salir</TooltipContent>
        </Tooltip>
      </div>
      <Dialog open={changePw} onOpenChange={setChangePw}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
          </DialogHeader>
          <ChangePasswordForm userId={user.id} onDone={() => setChangePw(false)} />
        </DialogContent>
      </Dialog>
    </header>
  );
}

export function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { pub, changes } = useContent();
  const { robot, setStopped } = useRobot();
  const { can, reason } = useUser();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [search, setSearch] = useState(false);
  const [submit, setSubmit] = useState(false);
  const [resume, setResume] = useState(false);
  const editing = EDITING.some((p) => path.startsWith(p));

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        // preferencia solo en memoria
      }
      return !c;
    });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onSearch={() => setSearch(true)} />
        {robot.stopped && <StopBanner by={robot.stoppedBy ?? 'un operador'} at={robot.stoppedAt ? formatTime(robot.stoppedAt) : '—'} onResume={() => setResume(true)} />}
        {editing && (
          <DraftBanner
            publishedVersion={`v${pub.number}`}
            changes={changes.length}
            onTest={() => void navigate({ to: '/simulador', search: { contenido: 'borrador' } })}
            onSubmit={() => setSubmit(true)}
            submitBlockedReason={!can('editarBorrador') ? reason('editarBorrador') : changes.length === 0 ? 'No hay cambios frente a la versión publicada' : undefined}
          />
        )}
        <main className="flex-1 p-6">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandMenu open={search} onOpenChange={setSearch} />
      <SubmitDialog open={submit} onOpenChange={setSubmit} />
      <ConfirmDialog open={resume} onOpenChange={setResume} title="¿Reanudar el robot?" description="Sofía vuelve a responder a los clientes con la versión publicada." confirmLabel="Sí, reanudar" onConfirm={() => setStopped.mutateAsync(false)} />
    </div>
  );
}
