import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Activity, Check, ChevronRight } from 'lucide-react';
import { formatPct, formatTime } from '@/lib/format';
import { useUser } from '@/auth/session';
import { backend } from '@/data/store';
import { OPS_LIVE } from '@/data/ops-http';
import { useAction, useContent, useReview, useRobot } from '@/hooks/use-data';
import type { Alert } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pill } from '@/components/panel/badges';
import { StatCard } from '@/components/panel/workflow';
import { Callout, ConfirmDialog, EmptyState, ErrorState, LoadingRows, PageHeader, Panel } from '@/components/panel/common';
import { Funnel, VersionTimeline } from '@/components/panel/visuals';

export function InicioPage() {
  const { db } = useContent();
  const { actor } = useUser();
  const { live } = useRobot();
  const review = useReview();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const resolve = useAction((id: string, c: string) => backend.resolveReview(actor, id, c), 'Marcado como resuelto');

  const today = db.conversations.filter((c) => c.startedAt.startsWith('2026-10-06'));
  const sales = live.data?.sales.transferredToday ?? today.filter((c) => c.result === 'venta').length * 5 + 3;
  const chats = live.data?.conversations.active ?? today.length * 21 + 1;
  const funnel = [
    { label: 'Menú', value: chats },
    { label: 'Perfil', value: Math.round(chats * 0.65) },
    { label: 'Oferta', value: Math.round(chats * 0.48) },
    { label: 'Autorización', value: Math.round(chats * 0.22) },
    { label: 'Transferida', value: sales },
  ];
  const published = db.versions.filter((v) => v.publishedAt).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')).slice(0, 3);
  const now = new Date();

  return (
    <>
      <PageHeader
        meta={`${now.toLocaleDateString('es-CO', { weekday: 'long', timeZone: 'America/Bogota' }).replace(/^./, (c) => c.toUpperCase())} ${now.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota' })} · actualizado ${formatTime(now)}`}
        title="Inicio"
        actions={
          <Button variant="outline" asChild>
            <Link to="/monitoreo">
              <Activity />
              Ir a Monitoreo
            </Link>
          </Button>
        }
      />
      {OPS_LIVE && live.error && <ErrorState message={`No se pudo leer el estado del robot: ${live.error.message}`} onRetry={() => void live.refetch()} />}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Chats atendidos" value={chats} delta="+12 %" />
        <StatCard label="Ventas transferidas" value={sales} delta="+3" />
        <StatCard label="Tasa de autorización" value={formatPct(71, 0)} delta="-2 pts" />
        <StatCard label="En revisión humana" value={review.items.length} delta="+1" good={false} />
        <StatCard label="Envíos inciertos" value={review.items.filter((r) => r.reason.toLowerCase().includes('incierto')).length} delta="0" good={false} />
        <StatCard label="Respuestas seguras" value={formatPct(1.4)} delta="-0,3 pts" good={false} hint="meta < 5 %" alert={1.4 > 5} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Alertas activas" badges={db.alerts.length > 0 && <Pill tone="danger">{db.alerts.length}</Pill>} bodyClassName="pt-2">
          {db.alerts.length === 0 ? (
            <Callout tone="success">Todo en orden ✓</Callout>
          ) : (
            <ul className="divide-y">
              {db.alerts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <Pill tone={a.severity === 'critica' ? 'danger' : 'warning'}>{a.severity === 'critica' ? 'Crítica' : 'Alta'}</Pill>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Desde {formatTime(a.since)} · {a.detail}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setAlert(a)}>
                    Qué hacer <ChevronRight />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Embudo de hoy">
          <Funnel steps={funnel} />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Requieren revisión humana" description="Marca como resuelta cuando un asesor haya tomado el chat." bodyClassName="px-0 pb-0">
          {review.isLoading ? (
            <div className="px-4 pb-4">
              <LoadingRows />
            </div>
          ) : review.error ? (
            <div className="px-4 pb-4">
              <ErrorState message="No se pudo cargar la cola de revisión" onRetry={review.refetch} />
            </div>
          ) : review.items.length === 0 ? (
            <div className="px-4 pb-4">
              <EmptyState title="Nada pendiente">Ninguna conversación necesita revisión humana.</EmptyState>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chat</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Paso</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {review.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-[12.5px]">{r.chatId}</TableCell>
                    <TableCell className="whitespace-normal">{r.reason}</TableCell>
                    <TableCell>{r.step}</TableCell>
                    <TableCell className="tabular">{formatTime(r.since)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setResolving(r.id)}>
                        <Check />
                        Marcar como resuelta
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
        <Panel
          title="Últimos cambios publicados"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/versiones">Ver todas</Link>
            </Button>
          }
        >
          <VersionTimeline versions={published} compact />
        </Panel>
      </div>

      <Sheet open={!!alert} onOpenChange={(o) => !o && setAlert(null)}>
        <SheetContent className="w-[520px] sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle>{alert?.title}</SheetTitle>
            <SheetDescription>
              {alert && (
                <>
                  Severidad {alert.severity === 'critica' ? 'crítica' : 'alta'} · desde {formatTime(alert.since)}
                </>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <h3 className="mb-2 text-sm font-semibold">Qué hacer</h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {alert?.procedure.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!resolving}
        onOpenChange={(o) => !o && setResolving(null)}
        title="Marcar como resuelta"
        description="Confirma que un asesor ya tomó el chat. El comentario queda en la auditoría."
        confirmLabel="Marcar como resuelta"
        requireText
        textLabel="Comentario"
        textPlaceholder="Ej.: Lo tomó el asesor de backoffice"
        onConfirm={async (c) => {
          if (resolving) await resolve.run(resolving, c);
        }}
      />
    </>
  );
}
