import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { useUser } from '@/auth/session';
import { backend } from '@/data/store';
import type { ContentSnapshot, SectionKey } from '@/data/types';
import { useContent } from './use-data';

/* Registro global de editores con cambios sin guardar (punto ámbar en la barra lateral). */
const dirty = new Set<string>();
const subs = new Set<() => void>();
let version = 0;
function setDirty(id: string, on: boolean) {
  const had = dirty.has(id);
  if (on === had) return;
  if (on) dirty.add(id);
  else dirty.delete(id);
  version++;
  subs.forEach((s) => s());
}
export function useDirtyIds(): Set<string> {
  useSyncExternalStore(
    (l) => {
      subs.add(l);
      return () => subs.delete(l);
    },
    () => version,
  );
  return dirty;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Edición local de una sección del borrador. Guardar escribe en el BORRADOR (nunca publica).
 * `navId` es el id del ítem de la barra lateral que se marca con cambios sin guardar.
 */
export function useSectionEditor<K extends SectionKey>(section: K, navId: string) {
  const { draft, pub, changedKeys } = useContent();
  const { actor, can } = useUser();
  const source = draft.snapshot[section];
  const [value, setValue] = useState<ContentSnapshot[K]>(() => structuredClone(source));
  const [saving, setSaving] = useState(false);
  const lastSource = useRef(source);

  const isDirty = !same(value, source);

  // Si el borrador cambia desde fuera (otro editor, reversión) y aquí no hay cambios, se sincroniza.
  useEffect(() => {
    if (lastSource.current !== source) {
      if (same(value, lastSource.current)) setValue(structuredClone(source));
      lastSource.current = source;
    }
  }, [source, value]);

  useEffect(() => {
    setDirty(navId, isDirty);
    return () => setDirty(navId, false);
  }, [navId, isDirty]);

  const save = async (editKeys: string[], label: string, override?: ContentSnapshot[K]) => {
    setSaving(true);
    try {
      if (override) setValue(override);
      await backend.saveDraft(actor, section, override ?? value, editKeys, label);
      toast.success('Borrador guardado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return {
    value,
    setValue,
    update: (fn: (v: ContentSnapshot[K]) => ContentSnapshot[K]) => setValue((v) => fn(structuredClone(v))),
    isDirty,
    saving,
    save,
    discard: () => setValue(structuredClone(source)),
    published: pub.snapshot[section],
    draftValue: source,
    edits: draft.edits,
    changedKeys,
    canEdit: can('editarBorrador'),
  };
}
