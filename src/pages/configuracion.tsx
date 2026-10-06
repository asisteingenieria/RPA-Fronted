import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Bell, Save, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/format';
import { ROLE_LABEL, useUser } from '@/auth/session';
import { backend } from '@/data/store';
import { useContent } from '@/hooks/use-data';
import type { Role } from '@/components/panel/navigation';
import type { Settings, User } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Callout, ConfirmDialog, Field, NoPermission, NumberInput, PageHeader, Panel } from '@/components/panel/common';
import { PermissionButton } from '@/components/panel/workflow';

const ROLES: Role[] = ['operador', 'editor', 'aprobador', 'legal', 'administrador'];

export function ConfiguracionPage() {
  const { db } = useContent();
  const { actor, can, reason } = useUser();
  const allowed = can('configurar');
  const [s, setS] = useState<Settings>(() => structuredClone(db.settings));
  const [invite, setInvite] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'operador' as Role });
  useEffect(() => setS(structuredClone(db.settings)), [db.settings]);
  const dirty = JSON.stringify(s) !== JSON.stringify(db.settings);
  const urlOk = !s.alertWebhook || /^https:\/\/[^\s]+$/.test(s.alertWebhook);

  if (!allowed)
    return (
      <>
        <PageHeader title="Configuración" />
        <NoPermission reason={reason('configurar')} />
      </>
    );

  return (
    <>
      <PageHeader
        title="Configuración"
        actions={
          <PermissionButton allowed={allowed} reason={reason('configurar')} disabled={!dirty || !urlOk} onClick={() => backend.saveSettings(actor, s).then(() => toast.success('Configuración guardada'))}>
            <Save />
            Guardar configuración
          </PermissionButton>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Modelo de IA">
          <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-muted-foreground">Proveedor</span>
              <span>{s.llmProvider}</span>
              <span className="text-muted-foreground">Modelo</span>
              <span className="font-mono text-[12.5px]">{s.llmModel}</span>
            </div>
            <Callout tone="info">
              Se cambia solo con una evaluación aprobada.{' '}
              <Link to="/evaluaciones" className="font-medium underline underline-offset-2">
                Ir a Evaluaciones
              </Link>
            </Callout>
          </div>
        </Panel>
        <Panel title="Tiempos">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Espera antes de responder una ráfaga" htmlFor="s-burst" help="Segundos sin mensajes nuevos del cliente.">
              <NumberInput id="s-burst" min={2} max={60} value={s.burstWaitSec} onChange={(n) => setS({ ...s, burstWaitSec: n })} />
            </Field>
            <Field label="Inactividad para cerrar el chat" htmlFor="s-inact" help="Minutos.">
              <NumberInput id="s-inact" min={5} max={240} value={s.inactivityMin} onChange={(n) => setS({ ...s, inactivityMin: n })} />
            </Field>
            <p className="text-[13px] text-muted-foreground sm:col-span-2">
              El mensaje de inactividad y el de fuera de horario se editan en{' '}
              <Link to="/conversacion/textos-fijos" className="text-primary underline-offset-2 hover:underline">
                Textos fijos
              </Link>
              .
            </p>
          </div>
        </Panel>
        <Panel title="Horario de atención">
          <div className="flex flex-col gap-2">
            {s.schedule.map((d, i) => (
              <div key={d.day} className="grid grid-cols-[100px_auto_1fr_1fr] items-center gap-3">
                <span className="text-sm">{d.day}</span>
                <Switch checked={d.open} aria-label={`Atender el ${d.day}`} onCheckedChange={(v) => setS({ ...s, schedule: s.schedule.map((x, j) => (j === i ? { ...x, open: v } : x)) })} />
                <Input type="time" value={d.from} disabled={!d.open} aria-label={`${d.day} desde`} onChange={(e) => setS({ ...s, schedule: s.schedule.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)) })} />
                <Input type="time" value={d.to} disabled={!d.open} aria-label={`${d.day} hasta`} onChange={(e) => setS({ ...s, schedule: s.schedule.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)) })} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Alertas">
          <div className="flex flex-col gap-3">
            <Field label="Webhook de Teams o Slack" htmlFor="s-hook" help="Las alertas nunca incluyen datos personales." error={urlOk ? undefined : 'Debe ser una URL https://'}>
              <Input id="s-hook" type="url" value={s.alertWebhook} placeholder="https://…" onChange={(e) => setS({ ...s, alertWebhook: e.target.value })} />
            </Field>
            <div>
              <Button variant="outline" size="sm" disabled={!s.alertWebhook || !urlOk} onClick={() => toast.info('Prueba de alerta enviada (simulada)')}>
                <Bell />
                Enviar alerta de prueba
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="Usuarios y roles"
        description="En producción los usuarios vienen del SSO corporativo; aquí se asigna su rol."
        bodyClassName="p-0 pt-2"
        actions={
          <Button variant="outline" size="sm" onClick={() => setInvite(true)}>
            <UserPlus />
            Invitar usuario
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Último acceso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {db.users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Select value={u.roles[0]} onValueChange={(v) => void backend.upsertUser(actor, { ...u, roles: [v as Role] }).then(() => toast.success(`Rol de ${u.name} actualizado`))}>
                    <SelectTrigger size="sm" className="w-48" aria-label={`Rol de ${u.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="tabular">{formatDateTime(u.lastAccess)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <ConfirmDialog
        open={invite}
        onOpenChange={setInvite}
        title="Invitar usuario"
        confirmLabel="Invitar"
        onConfirm={async () => {
          if (!newUser.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newUser.email)) {
            toast.error('Escribe nombre y un correo válido');
            throw new Error('incompleto');
          }
          const u: User = { id: `u-${Date.now()}`, name: newUser.name.trim(), email: newUser.email.trim(), roles: [newUser.role], title: ROLE_LABEL[newUser.role], lastAccess: new Date().toISOString() };
          await backend.upsertUser(actor, u);
          setNewUser({ name: '', email: '', role: 'operador' });
          toast.success('Invitación enviada');
        }}
      >
        <div className="grid gap-3">
          <Field label="Nombre" htmlFor="i-name">
            <Input id="i-name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
          </Field>
          <Field label="Correo corporativo" htmlFor="i-mail">
            <Input id="i-mail" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
          </Field>
          <Field label="Rol">
            <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as Role })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}
