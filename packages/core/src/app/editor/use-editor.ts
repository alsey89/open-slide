import { useEffect, useState, useSyncExternalStore } from 'react';
import type { DeckHost } from './deck-host.ts';
import { createEditorStore, type EditorState, type EditorStore } from './editor-store.ts';

const NOOP_SUBSCRIBE = (_listener: () => void) => () => {};
const NULL_SNAPSHOT = (): EditorState | null => null;

export function useEditor(
  host: DeckHost,
  deckId: string,
): { store: EditorStore | null; state: EditorState | null; loadError: string | null } {
  const [store, setStore] = useState<EditorStore | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: EditorStore | null = null;
    setStore(null);
    setLoadError(null);
    host
      .loadDeck(deckId)
      .then((deck) => {
        if (cancelled) return;
        created = createEditorStore({ host, deckId, deck });
        setStore(created);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, [host, deckId]);

  useEffect(() => {
    if (!store) return;
    const onBeforeUnload = () => store.flushNow();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [store]);

  const state = useSyncExternalStore<EditorState | null>(
    store ? store.subscribe : NOOP_SUBSCRIBE,
    store ? store.getState : NULL_SNAPSHOT,
  );

  return { store, state, loadError };
}
