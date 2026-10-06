import { useNavigate } from '@tanstack/react-router';
import { useDb } from '@/hooks/use-data';
import { NAV } from '@/components/panel/navigation';
import { formatCOP } from '@/lib/format';
import { PROCESS_LABEL } from '@/data/types';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const STEPS = [
  ['MENU', 'Menú'],
  ['PERFIL', 'Perfilamiento'],
  ['OFERTA', 'Oferta'],
  ['OBJECIONES', 'Objeciones'],
  ['AUTORIZACION', 'Autorización'],
] as const;

/** Búsqueda global (Ctrl+K): pantallas, pasos, plantillas, planes y conversaciones. */
export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const db = useDb();
  const navigate = useNavigate();
  const go = (to: string, search?: Record<string, string>) => {
    onOpenChange(false);
    void navigate({ to, search: search as never });
  };
  const screens = NAV.flatMap((n) => (n.children ? n.children : [n]));
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Buscar" description="Pasos, plantillas, planes y conversaciones">
      <CommandInput placeholder="Buscar pasos, plantillas, planes o chats…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Pantallas">
          {screens.map((s) => (
            <CommandItem key={s.id} onSelect={() => go(s.to)}>
              {s.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Pasos">
          {STEPS.map(([id, label]) => (
            <CommandItem key={id} value={`paso ${label}`} onSelect={() => go('/conversacion/pasos', { paso: id })}>
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Plantillas">
          {db.draft.snapshot.templates.map((t) => (
            <CommandItem key={t.id} value={`plantilla ${t.name}`} onSelect={() => go(`/conversacion/textos-fijos/${t.id}`)}>
              {t.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Planes">
          {db.draft.snapshot.plans.map((p) => (
            <CommandItem key={p.code} value={`plan ${p.code} ${PROCESS_LABEL[p.process]}`} onSelect={() => go('/catalogo', { plan: p.code })}>
              <span className="font-mono text-[12.5px]">{p.code}</span>
              <span className="text-muted-foreground">
                {PROCESS_LABEL[p.process]} · {formatCOP(p.priceCop)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Conversaciones">
          {db.conversations.slice(0, 15).map((c) => (
            <CommandItem key={c.id} value={`chat ${c.chatId}`} onSelect={() => go('/monitoreo', { chat: c.id })}>
              <span className="font-mono text-[12.5px]">{c.chatId}</span>
              <span className="text-muted-foreground">{c.step}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
