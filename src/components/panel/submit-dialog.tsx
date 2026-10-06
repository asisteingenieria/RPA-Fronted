import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useUser } from '@/auth/session';
import { backend } from '@/data/store';
import { useContent } from '@/hooks/use-data';
import { summarize } from '@/lib/content-diff';
import { Callout, ConfirmDialog } from './common';

/** "Enviar a evaluación": congela el borrador como una versión nueva y corre la suite. */
export function SubmitDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { changes, current } = useContent();
  const { actor } = useUser();
  const navigate = useNavigate();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Enviar el borrador a evaluación"
      description="Se crea una versión nueva con el contenido actual del borrador y se corre la suite automática. Los clientes siguen viendo la versión publicada."
      confirmLabel="Enviar a evaluación"
      requireText
      textLabel="Nota de cambio"
      textPlaceholder="Ej.: Saludo de Navidad y precio de M2"
      onConfirm={async (note) => {
        toast.info('Evaluación iniciada');
        void navigate({ to: '/versiones' });
        void backend.submitForEvaluation(actor, note).then((n) => {
          const v = backend.snapshot().versions.find((x) => x.number === n);
          if (v?.status === 'lista') toast.success(`Contenido v${n}: evaluación aprobada`);
          else toast.error(`Contenido v${n}: evaluación fallida`);
        });
      }}
    >
      <Callout tone="primary">{summarize(changes).join(' · ') || 'Sin cambios frente a la versión publicada'}</Callout>
      {current && (
        <Callout tone="warning">
          La v{current.number} está en curso; al enviar esta, la v{current.number} se retira.
        </Callout>
      )}
    </ConfirmDialog>
  );
}
