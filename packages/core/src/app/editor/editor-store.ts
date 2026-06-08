import type { Deck } from '../../doc/model.ts';
import type { EditOp } from '../../doc/ops.ts';
import { createOpFlusher, type FlushState } from '../lib/editor/op-flusher.ts';
import { getBlockById } from './block-ops.ts';
import type { DeckHost } from './deck-host.ts';
import { canRedo, canUndo, initHistory, pushOp, redo, undo } from './history.ts';
import { buildTextUpdateOp } from './text-path.ts';

export type EditorState = {
  deck: Deck;
  selectedBlockId: string | null;
  editing: { blockId: string; path: string } | null;
  saveState: FlushState;
  error: string | null;
  canUndo: boolean;
  canRedo: boolean;
};

export type EditorStore = {
  getState: () => EditorState;
  subscribe: (listener: () => void) => () => void;
  apply: (ops: EditOp | EditOp[]) => void;
  select: (blockId: string | null) => void;
  startEdit: (blockId: string, path: string) => void;
  commitEdit: (value: string) => void;
  cancelEdit: () => void;
  undo: () => void;
  redo: () => void;
  flushNow: () => void;
  dispose: () => void;
};

export type CreateEditorStoreOptions = {
  host: DeckHost;
  deckId: string;
  deck: Deck;
  flusherDelayMs?: number;
};

export function createEditorStore(opts: CreateEditorStoreOptions): EditorStore {
  let history = initHistory(opts.deck);
  let selectedBlockId: string | null = null;
  let editing: { blockId: string; path: string } | null = null;
  let saveState: FlushState = 'idle';
  let error: string | null = null;
  let disposed = false;
  const listeners = new Set<() => void>();

  const snapshot = (): EditorState => ({
    deck: history.deck,
    selectedBlockId,
    editing,
    saveState,
    error,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
  });

  let current = snapshot();

  const emit = () => {
    if (disposed) return;
    current = snapshot();
    for (const l of listeners) l();
  };

  const flusher = createOpFlusher({
    flush: (ops) => opts.host.applyOps(opts.deckId, ops).then(() => undefined),
    onState: (s, e) => {
      saveState = s;
      error = s === 'error' ? (e ?? 'save failed') : null;
      emit();
    },
    delayMs: opts.flusherDelayMs,
  });

  const applyEditOps = (ops: EditOp | EditOp[]) => {
    const list = Array.isArray(ops) ? ops : [ops];
    if (list.length === 0) return;
    let next = history;
    try {
      for (const op of list) next = pushOp(next, op);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      emit();
      return;
    }
    history = next;
    flusher.enqueue(list);
    emit();
  };

  const unsubscribeHost = opts.host.subscribe(opts.deckId, (deck) => {
    // v1 last-writer-wins: the external writer wins, so adopt its deck and drop
    // our un-persisted local ops + history (else they would flush on top of the
    // external deck and diverge). Re-applying local edits (op-replay) + flash is M1d.
    flusher.clearPending();
    history = initHistory(deck);
    selectedBlockId = null;
    editing = null;
    emit();
  });

  return {
    getState: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    apply: applyEditOps,
    select(blockId) {
      if (blockId === selectedBlockId) return;
      selectedBlockId = blockId;
      emit();
    },
    startEdit(blockId, path) {
      selectedBlockId = blockId;
      editing = { blockId, path };
      emit();
    },
    commitEdit(value) {
      const e = editing;
      editing = null;
      if (!e) {
        emit();
        return;
      }
      const block = getBlockById(history.deck, e.blockId);
      if (!block) {
        emit();
        return;
      }
      let op: EditOp;
      try {
        op = buildTextUpdateOp(block, e.path, value);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        emit();
        return;
      }
      applyEditOps(op);
    },
    cancelEdit() {
      editing = null;
      emit();
    },
    undo() {
      const entry = history.past[history.past.length - 1];
      if (!entry) return;
      history = undo(history);
      flusher.enqueue([entry.inverse]);
      emit();
    },
    redo() {
      const entry = history.future[history.future.length - 1];
      if (!entry) return;
      history = redo(history);
      flusher.enqueue([entry.forward]);
      emit();
    },
    flushNow: () => flusher.flushNow(),
    dispose() {
      disposed = true;
      unsubscribeHost();
      flusher.dispose();
      listeners.clear();
    },
  };
}
