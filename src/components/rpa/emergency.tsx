import { useState } from 'react';
import { Play, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { reasonFor, type Role } from '@/lib/roles';
import { useKillSwitch } from '@/hooks/queries';
import { ActionButton, ICON } from './common';
import { Button } from '@/components/ui/button';

/**
 * Apagado de emergencia: siempre visible, a un clic con confirmación en línea, para ambos roles.
 * Reanudar solo ADMIN (los demás lo ven deshabilitado con el motivo).
 */
export function EmergencyStop({
  stopped,
  role,
  onNavy,
  size = 'sm',
  className,
}: {
  stopped: boolean;
  role: Role;
  onNavy?: boolean;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const kill = useKillSwitch();

  if (stopped) {
    return (
      <ActionButton
        variant={onNavy ? 'on-navy' : 'secondary'}
        size={size === 'lg' ? 'default' : 'sm'}
        icon={Play}
        loading={kill.isPending}
        reason={reasonFor(role, 'reanudar')}
        onClick={() => kill.mutate(false)}
        className={className}
      >
        Reanudar robot
      </ActionButton>
    );
  }
  if (confirming) {
    return (
      <span
        role="alertdialog"
        aria-label="Confirmar apagado"
        className={cn(
          'inline-flex h-[38px] items-center gap-2 rounded-md bg-surface-100 py-0 pr-1.5 pl-3 text-[13px] leading-4 font-semibold whitespace-nowrap text-ink shadow-pop',
          className,
        )}
      >
        <span className="max-sm:sr-only">¿Detener TODAS las acciones del robot?</span>
        <ActionButton
          variant="destructive"
          size="sm"
          loading={kill.isPending}
          autoFocus
          onClick={() => kill.mutate(true, { onSettled: () => setConfirming(false) })}
        >
          Confirmar
        </ActionButton>
        <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
      </span>
    );
  }
  return (
    <Button
      variant="destructive"
      size={size === 'lg' ? 'default' : 'sm'}
      onClick={() => setConfirming(true)}
      className={cn(size === 'lg' && 'h-[52px] px-6 text-[15px]', className)}
      aria-label="Apagado de emergencia"
    >
      <Power {...ICON} className={size === 'lg' ? 'size-[18px]' : undefined} aria-hidden />
      <span className={cn(onNavy && 'max-sm:sr-only')}>Apagado de emergencia</span>
    </Button>
  );
}
