import { useMemo, useState } from 'react';
import { CircleCheck, Download, ShieldAlert } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { chainHash } from '@/lib/hash';
import { useUser } from '@/auth/session';
import { backend } from '@/data/store';
import { useContent } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pill } from '@/components/panel/badges';
import { EmptyState, PageHeader, Panel } from '@/components/panel/common';

export function AuditoriaPage() {
  const { db } = useContent();
  const { actor } = useUser();
  const [user, setUser] = useState('todos');
  const [action, setAction] = useState('todas');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Verificación de la cadena: cada entrada enlaza con la anterior y su huella cuadra.
  const broken = useMemo(() => {
    let prev = '0'.repeat(16);
    for (const e of db.audit) {
      const { id: _id, prevHash, hash, ...rest } = e;
      if (prevHash !== prev || chainHash(prev, rest) !== hash) return e.id;
      prev = hash;
    }
    return null;
  }, [db.audit]);

  const users = [...new Set(db.audit.map((a) => a.user))];
  const actions = [...new Set(db.audit.map((a) => a.action))];
  const rows = db.audit
    .filter((a) => (user === 'todos' || a.user === user) && (action === 'todas' || a.action === action) && (!from || a.at.slice(0, 10) >= from) && (!to || a.at.slice(0, 10) <= to))
    .slice()
    .reverse();

  const exportCsv = () => {
    const lines = ['fecha,usuario,rol,accion,objeto,detalle,hash', ...rows.map((a) => [a.at, a.user, a.role, a.action, a.target, `"${a.detail.replace(/"/g, '""')}"`, a.hash].join(','))];
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    el.download = 'auditoria.csv';
    el.click();
    URL.revokeObjectURL(el.href);
    void backend.logExport(actor, 'Auditoría (CSV)');
  };

  return (
    <>
      <PageHeader
        title="Auditoría"
        badges={
          broken ? (
            <Pill tone="danger">
              <ShieldAlert aria-hidden />
              Cadena rota en la entrada {broken}
            </Pill>
          ) : (
            <Pill tone="success">
              <CircleCheck aria-hidden />
              Cadena de auditoría íntegra ✓
            </Pill>
          )
        }
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download />
            Exportar
          </Button>
        }
      />
      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-end gap-3 border-b p-4">
          <Select value={user} onValueChange={setUser}>
            <SelectTrigger className="w-48" aria-label="Usuario">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los usuarios</SelectItem>
              {users.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-56" aria-label="Acción">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las acciones</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="Desde" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label="Hasta" />
          <span className="ml-auto text-[13px] text-muted-foreground">{rows.length} registros · solo lectura</span>
        </div>
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Sin registros con estos filtros" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y hora</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Objeto</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead>Huella</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="tabular whitespace-nowrap">{formatDateTime(a.at)}</TableCell>
                  <TableCell>{a.user}</TableCell>
                  <TableCell className="text-muted-foreground">{a.role}</TableCell>
                  <TableCell className="font-medium">{a.action}</TableCell>
                  <TableCell>{a.target}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-muted-foreground" title={a.detail}>
                    {a.detail || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-muted-foreground">{a.hash.slice(0, 10)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
