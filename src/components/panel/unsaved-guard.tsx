import { useBlocker } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/** Al salir con cambios sin guardar: "Guardar borrador / Descartar / Seguir editando". */
export function UnsavedGuard({ when, onSave }: { when: boolean; onSave: () => Promise<void> }) {
  const b = useBlocker({ shouldBlockFn: () => when, enableBeforeUnload: () => when, withResolver: true });
  if (b.status !== 'blocked') return null;
  return (
    <AlertDialog open onOpenChange={(o) => !o && b.reset()}>
      <AlertDialogContent className="shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Tienes cambios sin guardar</AlertDialogTitle>
          <AlertDialogDescription>Si sales ahora se pierden. Guardar los deja en el borrador; no llegan a los clientes hasta publicar.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => b.reset()}>
            Seguir editando
          </Button>
          <Button variant="outline" onClick={() => b.proceed()}>
            Descartar
          </Button>
          <Button
            onClick={async () => {
              await onSave();
              b.proceed();
            }}
          >
            Guardar borrador
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
