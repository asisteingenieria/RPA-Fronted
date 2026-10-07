/**
 * Usuarios del panel (solo ADMIN; kit: reference/screens/usuarios.*.png). Datos: /admin/users*.
 * Salvaguardas: nadie se desactiva ni se quita el rol a sí mismo; siempre queda un ADMIN activo;
 * desactivar o restablecer cierra las sesiones del usuario (lo hace el servidor).
 */
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Lock, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage, type PanelUser, type Role, type TemporaryPassword } from '@/lib/api';
import { fmtWhen, initials } from '@/lib/format';
import { ROLE_HELP } from '@/lib/labels';
import { userGuard } from '@/lib/roles';
import { useUser } from '@/auth/session';
import { keys } from '@/hooks/queries';
import { ActionButton, ConfirmDialog, Empty, ErrorState, ICON, OneTimeSecret, PageHead, SkeletonRows } from '@/components/rpa/common';
import { Status, UserStatus } from '@/components/rpa/status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

type Pending = { kind: 'deactivate' | 'reset'; user: PanelUser } | null;

export function UsuariosPage() {
  const me = useUser();
  const qc = useQueryClient();
  const users = useQuery({ queryKey: keys.users, queryFn: api.users });
  const [issued, setIssued] = useState<TemporaryPassword | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { role?: Role; active?: boolean; knowledgePublisher?: boolean } }) =>
      api.updateUser(id, patch),
    onSuccess: (u, v) => {
      if (v.patch.knowledgePublisher !== undefined) {
        toast.success(
          u.knowledgePublisher ? `${u.username} puede publicar conocimiento` : `${u.username} ya no puede publicar conocimiento`,
        );
        return;
      }
      toast.success(v.patch.role ? `${u.username} ahora es ${u.role}` : u.active ? `${u.username} activado` : `${u.username} desactivado`);
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo actualizar el usuario.')),
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.users }),
  });
  const reset = useMutation({
    mutationFn: (id: string) => api.resetPassword(id),
    onSuccess: (r) => {
      setIssued(r);
      toast.success(`Contraseña de ${r.user.username} restablecida`);
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo restablecer la contraseña.')),
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.users }),
  });

  const list = users.data ?? [];
  const activeAdmins = list.filter((u) => u.role === 'ADMIN' && u.active);
  const admins = list.filter((u) => u.role === 'ADMIN').length;

  return (
    <>
      <PageHead
        title="Usuarios del panel"
        sub={users.data ? `${list.length} usuarios · ${admins} ADMIN · ${list.length - admins} OPERADOR` : 'Cargando usuarios…'}
        actions={
          <ActionButton icon={Plus} onClick={() => setCreating(true)}>
            Crear usuario
          </ActionButton>
        }
      />

      {issued && (
        <OneTimeSecret
          title={`Contraseña temporal de ${issued.user.username}`}
          value={issued.temporaryPassword}
          help="Se muestra una sola vez. Deberá cambiarla en su primer ingreso."
          onDismiss={() => setIssued(null)}
        />
      )}

      <section className="min-w-0 rounded-lg border bg-surface-100 shadow-card">
        {users.isLoading ? (
          <SkeletonRows rows={4} cols={6} />
        ) : users.isError ? (
          <ErrorState message="No se pudo cargar la lista de usuarios." onRetry={() => void users.refetch()} retrying={users.isFetching} />
        ) : list.length === 0 ? (
          <Empty icon={Users} title="Sin usuarios" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Publicar conocimiento</TableHead>
                <TableHead>Cambio de contraseña</TableHead>
                <TableHead>Último ingreso</TableHead>
                <TableHead>Creado por</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => {
                const self = u.username === me.username;
                const guard = userGuard({
                  isSelf: self,
                  isLastActiveAdmin: u.role === 'ADMIN' && u.active && activeAdmins.length <= 1,
                });
                const busy = (update.isPending && update.variables?.id === u.id) || (reset.isPending && reset.variables === u.id);
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary-soft-ink">
                          {initials(u.username)}
                        </span>
                        <span className="font-semibold">
                          {u.username}
                          {self && <span className="font-normal text-ink-muted"> (tú)</span>}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {guard.canChangeRole ? (
                        <Select value={u.role} disabled={busy} onValueChange={(v) => update.mutate({ id: u.id, patch: { role: v as Role } })}>
                          <SelectTrigger size="sm" className="w-[132px]" aria-label={`Rol de ${u.username}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                            <SelectItem value="OPERADOR">OPERADOR</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              tabIndex={0}
                              className="inline-flex h-8 items-center gap-2 rounded-md border bg-surface-200 px-3 text-[13px] font-medium text-ink-muted"
                            >
                              {u.role}
                              <Lock {...ICON} className="size-3.5" aria-label="bloqueado" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{guard.reason}</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <UserStatus active={u.active} lockedUntil={u.lockedUntil} />
                    </TableCell>
                    <TableCell>
                      <PublisherSwitch
                        user={u}
                        reason={
                          self
                            ? 'No puedes cambiar tus propios permisos'
                            : u.role !== 'ADMIN'
                              ? 'Solo un ADMIN puede tener este permiso'
                              : undefined
                        }
                        busy={busy}
                        onChange={(v) => update.mutate({ id: u.id, patch: { knowledgePublisher: v } })}
                      />
                    </TableCell>
                    <TableCell>{u.mustChangePassword ? <Status tone="info" label="Pendiente" /> : '—'}</TableCell>
                    <TableCell>{u.lastLoginAt ? fmtWhen(u.lastLoginAt) : 'Nunca'}</TableCell>
                    <TableCell>{u.createdBy ?? 'sistema'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ActionButton
                          variant="ghost"
                          size="sm"
                          icon={KeyRound}
                          reason={self ? 'Para tu propia cuenta usa «Cambiar contraseña» en tu menú' : undefined}
                          loading={reset.isPending && reset.variables === u.id}
                          onClick={() => setPending({ kind: 'reset', user: u })}
                        >
                          Restablecer
                        </ActionButton>
                        {u.active ? (
                          <ActionButton
                            variant="danger-ghost"
                            size="sm"
                            reason={guard.canDeactivate ? undefined : guard.reason}
                            loading={update.isPending && update.variables?.id === u.id && update.variables.patch.active === false}
                            onClick={() => setPending({ kind: 'deactivate', user: u })}
                          >
                            Desactivar
                          </ActionButton>
                        ) : (
                          <ActionButton variant="secondary" size="sm" loading={busy} onClick={() => update.mutate({ id: u.id, patch: { active: true } })}>
                            Activar
                          </ActionButton>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-[13px] text-ink-muted">
          <span>Desactivar o restablecer cierra las sesiones abiertas del usuario.</span>
          <span>Siempre debe quedar al menos un ADMIN activo.</span>
        </div>
      </section>

      <CreateUserDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(r) => {
          setCreating(false);
          setIssued(r);
        }}
      />
      <ConfirmDialog
        open={pending?.kind === 'deactivate'}
        onOpenChange={(o) => !o && setPending(null)}
        danger
        title={`¿Desactivar a ${pending?.user.username ?? ''}?`}
        description="No podrá ingresar al panel y se cierran sus sesiones abiertas. Puedes activarlo de nuevo cuando quieras."
        confirmLabel="Sí, desactivar"
        onConfirm={() => update.mutateAsync({ id: pending!.user.id, patch: { active: false } })}
      />
      <ConfirmDialog
        open={pending?.kind === 'reset'}
        onOpenChange={(o) => !o && setPending(null)}
        title={`¿Restablecer la contraseña de ${pending?.user.username ?? ''}?`}
        description="Se genera una contraseña temporal que verás una sola vez; se cierran sus sesiones y deberá cambiarla al ingresar."
        confirmLabel="Sí, restablecer"
        onConfirm={() => reset.mutateAsync(pending!.user.id)}
      />
    </>
  );
}

function CreateUserDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (r: TemporaryPassword) => void }) {
  const qc = useQueryClient();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role>('OPERADOR');
  const create = useMutation({
    mutationFn: () => api.createUser(username.trim(), role),
    onSuccess: (r) => {
      toast.success(`Usuario ${r.user.username} creado`);
      setUsername('');
      setRole('OPERADOR');
      onCreated(r);
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo crear el usuario.')),
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.users }),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!create.isPending && username.trim()) create.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="gap-0 p-0 sm:max-w-[480px]">
        <form onSubmit={submit}>
          <DialogHeader className="px-6 pt-6 pb-4 text-left">
            <DialogTitle className="font-display text-lg font-semibold">Crear usuario</DialogTitle>
            <DialogDescription className="text-[13px] text-ink-muted">
              El sistema genera una contraseña temporal que verás una sola vez. Entrégala por un canal seguro.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 pb-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-user" className="text-[13px] font-medium">
                Usuario
              </Label>
              <Input id="new-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="nombre.apellido" autoComplete="off" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-role" className="text-[13px] font-medium">
                Rol
              </Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="new-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERADOR">OPERADOR</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-ink-subtle">{ROLE_HELP[role]}</span>
            </div>
          </div>
          <DialogFooter className="border-t bg-surface-0 px-6 py-4">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancelar
            </Button>
            <ActionButton type="submit" loading={create.isPending} disabled={!username.trim()}>
              Crear y generar contraseña
            </ActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Permiso «Publicar conocimiento» (v1.9): publicar, revertir y conectar Brains. Solo para ADMIN;
 * nadie se lo cambia a sí mismo. Lo que no se puede se ve deshabilitado con su motivo.
 */
function PublisherSwitch({
  user,
  reason,
  busy,
  onChange,
}: {
  user: PanelUser;
  reason?: string;
  busy: boolean;
  onChange: (v: boolean) => void;
}) {
  const on = !!user.knowledgePublisher;
  const control = (
    <span className="inline-flex items-center gap-2">
      <Switch
        checked={on}
        disabled={!!reason || busy}
        onCheckedChange={onChange}
        aria-label={`Publicar conocimiento: ${user.username}`}
      />
      <span className="text-[13px] text-ink-muted">{on ? 'Sí' : 'No'}</span>
    </span>
  );
  if (!reason) return control;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{control}</span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
