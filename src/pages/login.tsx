/**
 * Acceso (kit: reference/screens/login.*.png): ingreso con error genérico y cambio obligatorio de la
 * contraseña temporal con la política visible. La política la aplica el servidor
 * (packages/crypto passwordIssues); aquí solo se refleja para ayudar mientras se escribe.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ApiError, api, errorMessage, type Me } from '@/lib/api';
import { useSessionActions, useUser } from '@/auth/session';
import { ActionButton, Callout, ICON, PageHead } from '@/components/rpa/common';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import mark from '@/assets/asiste-mark.png';

const MIN = 12;
const MAX = 128;
const COMMON = ['contraseña', 'password', '123456', 'qwerty', 'claro', 'abaya', 'admin'];

function policy(pw: string, repeat: string, username: string) {
  const lower = pw.toLowerCase();
  return [
    { ok: pw.length >= MIN && pw.length <= MAX, label: `Mínimo ${MIN} caracteres` },
    { ok: pw.length > 0 && new Set(pw).size >= 5 && !COMMON.some((w) => lower.includes(w)), label: 'Sin palabras ni secuencias comunes' },
    { ok: pw.length > 0 && !(username.length >= 3 && lower.includes(username.toLowerCase())), label: 'No contiene tu usuario' },
    { ok: pw.length > 0 && pw === repeat, label: 'Las dos coinciden' },
  ];
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px] leading-4 font-medium text-ink">
        {label}
      </Label>
      {children}
      {error && (
        <span id={`${id}-error`} className="text-xs leading-4 text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

function Card({ children, onSubmit, className }: { children: ReactNode; onSubmit: (e: FormEvent) => void; className?: string }) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn('flex w-[400px] max-w-full flex-col gap-[18px] rounded-lg border bg-surface-100 p-8 shadow-pop', className)}
    >
      {children}
    </form>
  );
}

export function LoginPage() {
  const { setMe } = useSessionActions();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setMe(await api.login(username.trim(), password));
    } catch (err) {
      setPassword('');
      // Mensaje genérico del servidor: no revela si el usuario existe o está bloqueado.
      setError(
        err instanceof ApiError && err.status === 429
          ? 'Demasiados intentos fallidos desde este equipo. Espera unos minutos.'
          : err instanceof ApiError && err.status === 401
            ? `${err.message}. Tras 5 intentos fallidos la cuenta se bloquea 15 min.`
            : errorMessage(err, 'No se pudo conectar con el servidor del robot.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-surface-0 p-10 max-md:p-4">
      <Card onSubmit={(e) => void submit(e)}>
        <img src={mark} alt="Asiste ING" className="w-16 self-center" />
        <div className="text-center">
          <h1 className="m-0 font-display text-[22px] leading-7 font-semibold text-ink">Agente RPA · Ventas</h1>
          <p className="mt-1 text-ink-muted">Ingresa con tu usuario del panel</p>
        </div>
        <Field id="usuario" label="Usuario">
          <Input id="usuario" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </Field>
        <Field id="clave" label="Contraseña" error={error ?? undefined}>
          <Input
            id="clave"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'clave-error' : undefined}
          />
        </Field>
        <ActionButton type="submit" size="xl" loading={busy} disabled={!username.trim() || !password}>
          Ingresar
        </ActionButton>
        <p className="text-center text-xs leading-4 text-ink-subtle">Sesión máxima 8 h · se cierra tras 30 min sin actividad</p>
      </Card>
    </main>
  );
}

/** Formulario de cambio de contraseña (primer ingreso y desde el menú del avatar). */
function ChangePasswordForm({ me, forced, onDone, onCancel }: { me: Me; forced?: boolean; onDone: () => void; onCancel?: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rules = policy(next, repeat, me.username);
  const ok = rules.every((r) => r.ok) && current.length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(current, next);
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo cambiar la contraseña.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card onSubmit={(e) => void submit(e)} className={cn(!forced && 'w-[440px] shadow-card')}>
      <div>
        <h1 className="m-0 font-display text-[20px] leading-7 font-semibold text-ink">{forced ? 'Crea tu contraseña' : 'Cambiar contraseña'}</h1>
        <p className="mt-0.5 text-[13px] leading-[18px] text-ink-muted">
          {forced
            ? `Hola, ${me.username}. Es tu primer ingreso: reemplaza la contraseña temporal.`
            : 'Al cambiarla se cierran tus otras sesiones abiertas.'}
        </p>
      </div>
      {error && <Callout tone="danger">{error}</Callout>}
      <Field id="actual" label={forced ? 'Contraseña temporal' : 'Contraseña actual'}>
        <Input id="actual" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required autoFocus />
      </Field>
      <Field id="nueva" label="Nueva contraseña">
        <Input
          id="nueva"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          maxLength={MAX}
          required
          aria-describedby="politica"
        />
      </Field>
      <Field id="repetir" label="Confirmar contraseña">
        <Input id="repetir" type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" required />
      </Field>
      <ul id="politica" className="m-0 flex list-none flex-col gap-2 p-0 text-[13px]" aria-label="Requisitos de la contraseña">
        {rules.map((r) => (
          <li key={r.label} className={cn('flex items-center gap-2', r.ok ? 'text-success' : 'text-ink-subtle')}>
            {r.ok ? <CheckCircle2 {...ICON} className="size-4" aria-hidden /> : <Circle {...ICON} className="size-4" aria-hidden />}
            {r.label}
            <span className="sr-only">{r.ok ? ' (cumple)' : ' (pendiente)'}</span>
          </li>
        ))}
      </ul>
      <ActionButton type="submit" size="xl" loading={busy} reason={ok ? undefined : 'Completa los requisitos de la contraseña'}>
        Guardar y continuar
      </ActionButton>
      {onCancel && (
        <button type="button" onClick={onCancel} className="cursor-pointer self-center text-[13px] font-semibold text-primary-soft-ink hover:underline">
          {forced ? 'Salir' : 'Cancelar'}
        </button>
      )}
    </Card>
  );
}

export function ForcedChangePage({ me }: { me: Me }) {
  const { setMe, logout } = useSessionActions();
  return (
    <main className="grid min-h-screen place-items-center bg-surface-0 p-10 max-md:p-4">
      <ChangePasswordForm
        me={me}
        forced
        onDone={() => {
          setMe({ ...me, mustChangePassword: false });
          toast.success('Contraseña creada');
        }}
        onCancel={() => void logout()}
      />
    </main>
  );
}

export function ChangePasswordPage() {
  const me = useUser();
  const navigate = useNavigate();
  return (
    <>
      <PageHead title="Cambiar contraseña" sub="Mínimo 12 caracteres; una frase funciona bien." />
      <ChangePasswordForm
        me={me}
        onDone={() => {
          toast.success('Contraseña actualizada. Se cerraron tus otras sesiones abiertas.');
          void navigate({ to: '/en-vivo' });
        }}
        onCancel={() => void navigate({ to: '/en-vivo' })}
      />
    </>
  );
}
