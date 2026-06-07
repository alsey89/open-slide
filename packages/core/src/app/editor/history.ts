import { applyOpWithInverse } from '../../doc/inverse.ts';
import type { Deck } from '../../doc/model.ts';
import { applyOp, type EditOp } from '../../doc/ops.ts';

export type HistoryEntry = { forward: EditOp; inverse: EditOp };

export type History = {
  deck: Deck;
  past: HistoryEntry[];
  future: HistoryEntry[];
};

export function initHistory(deck: Deck): History {
  return { deck, past: [], future: [] };
}

export function canUndo(h: History): boolean {
  return h.past.length > 0;
}

export function canRedo(h: History): boolean {
  return h.future.length > 0;
}

/** A new forward edit invalidates the redo stack. */
export function pushOp(h: History, op: EditOp): History {
  const { deck, inverse } = applyOpWithInverse(h.deck, op);
  return { deck, past: [...h.past, { forward: op, inverse }], future: [] };
}

export function undo(h: History): History {
  const entry = h.past[h.past.length - 1];
  if (!entry) return h;
  return {
    deck: applyOp(h.deck, entry.inverse),
    past: h.past.slice(0, -1),
    future: [...h.future, entry],
  };
}

export function redo(h: History): History {
  const entry = h.future[h.future.length - 1];
  if (!entry) return h;
  // Recompute the inverse against the current deck so a later undo is exact.
  const { deck, inverse } = applyOpWithInverse(h.deck, entry.forward);
  return {
    deck,
    past: [...h.past, { forward: entry.forward, inverse }],
    future: h.future.slice(0, -1),
  };
}
