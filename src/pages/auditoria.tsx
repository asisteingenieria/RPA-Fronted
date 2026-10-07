/**
 * Auditoría del panel (solo ADMIN). Datos: /admin/audit (las últimas 50 acciones; el servidor no
 * pagina ni filtra todavía, así que los filtros son sobre lo recibido).
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ScrollText, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { keys } from '@/hooks/queries';
import { ActionButton, Empty, ErrorState, ICON, PageHead, SkeletonRows } from '@/components/rpa/common';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ALL = '__todos__';

export function AuditoriaPage() {
  const audit = useQuery({ queryKey: keys.audit, queryFn: api.audit, refetchInterval: 30_000 });
  const [q, setQ] = useState('');
  const [actor, setActor] = useState(ALL);
  const [action, setAction] = useState(ALL);

  const rows = useMemo(() => audit.data ?? [], [audit.data]);
  const actors = useMemo(() => [...new Set(rows.map((r) => r.actor))].sort(), [rows]);
  const actions = useMemo(() => [...new Set(rows.map((r) => r.action))].sort(), [rows]);
  const shown = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    return (
      (actor === ALL || r.actor === actor) &&
      (action === ALL || r.action === action) &&
      (!needle || [r.actor, r.action, r.target ?? ''].some((v) => v.toLowerCase().includes(needle)))
    );
  });
  const filtered = actor !== ALL || action !== ALL || q.trim() !== '';

  return (
    <>
      <PageHead
        title="Auditoría"
        sub="Quién hizo qué y cuándo en el panel. Registro inmutable en el servidor."
        actions={
          <ActionButton variant="secondary" icon={RefreshCw} loading={audit.isFetching && !audit.isLoading} onClick={() => void audit.refetch()}>
            Actualizar
          </ActionButton>
        }
      />
      <section className="min-w-0 rounded-lg border bg-surface-100 shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <label className="flex h-[38px] min-w-[240px] flex-1 items-center gap-2 rounded-md border bg-surface-100 px-3 text-[13px] text-ink-subtle focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary-soft">
            <Search {...ICON} className="size-4" aria-hidden />
            <span className="sr-only">Buscar en la auditoría</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar usuario, acción u objetivo…"
              className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-subtle"
            />
          </label>
          <Select value={actor} onValueChange={setActor}>
            <SelectTrigger className="h-[38px] w-[180px]" aria-label="Filtrar por usuario">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los usuarios</SelectItem>
              {actors.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-[38px] w-[220px]" aria-label="Filtrar por acción">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las acciones</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtered && (
            <ActionButton
              variant="ghost"
              icon={X}
              onClick={() => {
                setQ('');
                setActor(ALL);
                setAction(ALL);
              }}
            >
              Quitar filtros
            </ActionButton>
          )}
        </div>
        {audit.isLoading ? (
          <SkeletonRows rows={6} cols={4} />
        ) : audit.isError ? (
          <ErrorState message="No se pudo cargar la auditoría." onRetry={() => void audit.refetch()} retrying={audit.isFetching} />
        ) : rows.length === 0 ? (
          <Empty icon={ScrollText} title="Sin acciones registradas" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y hora</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Objetivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-ink-muted">
                    Ninguna acción coincide con los filtros.
                  </TableCell>
                </TableRow>
              ) : (
                shown.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{fmtDateTime(a.createdAt)}</TableCell>
                    <TableCell className="font-semibold">{a.actor}</TableCell>
                    <TableCell className="font-mono text-xs">{a.action}</TableCell>
                    <TableCell className="whitespace-normal">{a.target ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-[13px] text-ink-muted">
          <span>
            {shown.length} de {rows.length} acciones
          </span>
          <span>El servidor entrega las 50 más recientes</span>
        </div>
      </section>
    </>
  );
}
