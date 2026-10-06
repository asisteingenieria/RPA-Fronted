import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { ROLE_LABEL, useSessionCtx } from '@/auth/session';
import { OPS_LIVE } from '@/data/ops-http';
import { useDb } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Callout, Field } from '@/components/panel/common';
import { initials } from '@/layout/app-shell';

/**
 * Bienvenida. En producción el botón redirige al SSO corporativo (OIDC) y el rol viene del
 * directorio; en esta demostración se elige el usuario para recorrer los permisos de cada rol.
 */
export function LoginPage() {
  const { login } = useSessionCtx();
  const db = useDb();
  const [userId, setUserId] = useState(db.users[0]!.id);
  const [token, setToken] = useState('');
  const user = db.users.find((u) => u.id === userId)!;

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-[440px] rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-foreground text-lg font-bold text-background">S</div>
          <div>
            <h1 className="text-[22px] font-semibold leading-7 tracking-tight">Panel Sofía</h1>
            <p className="text-[13px] text-muted-foreground">Administración del robot de ventas · Abaya</p>
          </div>
        </div>

        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            login({ user, adminToken: OPS_LIVE ? token : undefined });
          }}
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-medium">Usuario de demostración</legend>
            <RadioGroup value={userId} onValueChange={setUserId} className="gap-1.5">
              {db.users.map((u) => (
                <Label key={u.id} htmlFor={`u-${u.id}`} className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft">
                  <RadioGroupItem id={`u-${u.id}`} value={u.id} />
                  <span className="grid size-7 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold">{initials(u.name)}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{u.name}</span>
                    <span className="block text-xs text-muted-foreground">{u.roles.map((r) => ROLE_LABEL[r]).join(', ')}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </fieldset>

          {OPS_LIVE && (
            <Field label="Token de administración del robot" htmlFor="token" help="Lo entrega soporte técnico. Se guarda solo en esta pestaña.">
              <Input id="token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} required minLength={24} />
            </Field>
          )}

          <Button type="submit" size="lg">
            <KeyRound />
            Ingresar con cuenta corporativa
          </Button>
          <Callout tone="info">
            {OPS_LIVE
              ? 'Conectado a la API de operación del robot. El contenido (versiones, catálogo, textos) sigue simulado hasta que exista su API.'
              : 'Modo demostración: todos los datos son ficticios y se guardan solo en este navegador.'}
          </Callout>
        </form>
      </div>
    </div>
  );
}
