import { useState, type FormEvent, type ReactNode } from 'react';
import { Check, Eye, EyeOff, KeyRound, LogIn, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { passwordIssues } from '@/lib/password';
import { ROLE_LABEL, useSessionCtx } from '@/auth/session';
import { backend } from '@/data/store';
import { OPS_LIVE } from '@/data/ops-http';
import { useDb } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Callout, Field } from '@/components/panel/common';

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-[420px] rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-foreground text-lg font-bold text-background">S</div>
          <div>
            <h1 className="text-[22px] font-semibold leading-7 tracking-tight">{title}</h1>
            <p className="text-[13px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete, autoFocus }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; autoFocus?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} autoFocus={autoFocus} required className="pr-10" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/** Lista de requisitos de la contraseña con ✓ / ✗ en vivo. */
export function PasswordRules({ value, confirm }: { value: string; confirm?: string }) {
  const issues = passwordIssues(value);
  const rules = ['Mínimo 10 caracteres', 'Debe tener letras', 'Debe tener números'];
  const items = rules.map((r) => ({ label: r.replace('Debe tener', 'Con'), ok: value.length > 0 && !issues.includes(r) }));
  if (confirm !== undefined) items.push({ label: 'Las dos contraseñas coinciden', ok: confirm.length > 0 && confirm === value });
  return (
    <ul className="flex flex-col gap-1 text-[12.5px]">
      {items.map((i) => (
        <li key={i.label} className={cn('flex items-center gap-1.5', i.ok ? 'text-success' : 'text-muted-foreground')}>
          {i.ok ? <Check className="size-3.5" aria-label="Cumple" /> : <X className="size-3.5" aria-label="No cumple" />}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function SetupForm() {
  const db = useDb();
  const admins = db.users.filter((u) => u.roles.includes('administrador'));
  const [adminId, setAdminId] = useState(admins[0]?.id ?? '');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = passwordIssues(pw).length === 0 && pw === pw2;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await backend.setupAdmin(adminId, pw);
      toast.success('Contraseña del administrador creada. Ya puedes ingresar.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Configuración inicial" subtitle="Panel Sofía · primer ingreso">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Callout tone="primary" icon={<ShieldCheck />}>
          Aún no hay contraseñas. Crea la del administrador; luego él asigna contraseñas temporales al resto del equipo desde Configuración.
        </Callout>
        <Field label="Administrador">
          <Select value={adminId} onValueChange={setAdminId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {admins.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} · {u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Contraseña" htmlFor="s-pw">
          <PasswordInput id="s-pw" value={pw} onChange={setPw} autoComplete="new-password" autoFocus />
        </Field>
        <Field label="Confirmar contraseña" htmlFor="s-pw2">
          <PasswordInput id="s-pw2" value={pw2} onChange={setPw2} autoComplete="new-password" />
        </Field>
        <PasswordRules value={pw} confirm={pw2} />
        <Button type="submit" size="lg" disabled={!valid || busy || !adminId}>
          <KeyRound />
          Crear contraseña
        </Button>
      </form>
    </Card>
  );
}

export function LoginPage() {
  const { login } = useSessionCtx();
  const db = useDb();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (backend.needsSetup()) return <SetupForm />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await backend.login(email, pw);
      login({ userId: r.user.id, mustChange: r.mustChange, adminToken: OPS_LIVE ? token : undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ingresar');
      setPw('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Panel Sofía" subtitle="Administración del robot de ventas · Abaya">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field label="Correo corporativo" htmlFor="l-email">
          <Input id="l-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Contraseña" htmlFor="l-pw">
          <PasswordInput id="l-pw" value={pw} onChange={setPw} autoComplete="current-password" />
        </Field>
        {OPS_LIVE && (
          <Field label="Token de administración del robot" htmlFor="token" help="Lo entrega soporte técnico. Se guarda solo en esta pestaña.">
            <Input id="token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} required minLength={24} />
          </Field>
        )}
        {error && <Callout tone="danger">{error}</Callout>}
        <Button type="submit" size="lg" disabled={busy || !email || !pw}>
          <LogIn />
          {busy ? 'Verificando…' : 'Ingresar'}
        </Button>
        <p className="text-center text-[12.5px] text-muted-foreground">¿Olvidaste tu contraseña? Pide a un administrador que te asigne una temporal.</p>
        <details className="rounded-md bg-surface-2 px-3 py-2 text-[12.5px] text-muted-foreground">
          <summary className="cursor-pointer select-none">Usuarios de demostración</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {db.users.map((u) => (
              <li key={u.id} className="flex justify-between gap-2">
                <button type="button" className="font-mono text-foreground hover:underline" onClick={() => setEmail(u.email)}>
                  {u.email}
                </button>
                <span>{u.roles.map((r) => ROLE_LABEL[r]).join(', ')}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2">Cada usuario entra con la contraseña temporal que le asigne el administrador.</p>
        </details>
      </form>
    </Card>
  );
}

/** Cambio obligatorio tras una contraseña temporal. */
export function ForcedChangePage() {
  const { session, passwordChanged, logout } = useSessionCtx();
  const db = useDb();
  const user = db.users.find((u) => u.id === session?.userId);
  return (
    <Card title="Cambia tu contraseña" subtitle={user ? `${user.name} · ${user.email}` : ''}>
      <Callout tone="warning" className="mb-4">
        Ingresaste con una contraseña temporal. Crea una nueva para continuar.
      </Callout>
      <ChangePasswordForm userId={session?.userId ?? ''} currentLabel="Contraseña temporal" onDone={passwordChanged} />
      <Button variant="ghost" className="mt-2 w-full" onClick={logout}>
        Salir
      </Button>
    </Card>
  );
}

export function ChangePasswordForm({ userId, onDone, currentLabel = 'Contraseña actual' }: { userId: string; onDone: () => void; currentLabel?: string }) {
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = cur.length > 0 && passwordIssues(pw).length === 0 && pw === pw2;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await backend.changePassword(userId, cur, pw);
          toast.success('Contraseña actualizada');
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'No se pudo cambiar');
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label={currentLabel} htmlFor="c-cur">
        <PasswordInput id="c-cur" value={cur} onChange={setCur} autoComplete="current-password" autoFocus />
      </Field>
      <Field label="Nueva contraseña" htmlFor="c-new">
        <PasswordInput id="c-new" value={pw} onChange={setPw} autoComplete="new-password" />
      </Field>
      <Field label="Confirmar nueva contraseña" htmlFor="c-new2">
        <PasswordInput id="c-new2" value={pw2} onChange={setPw2} autoComplete="new-password" />
      </Field>
      <PasswordRules value={pw} confirm={pw2} />
      {error && <Callout tone="danger">{error}</Callout>}
      <Button type="submit" disabled={!valid || busy}>
        <KeyRound />
        Guardar contraseña
      </Button>
    </form>
  );
}
