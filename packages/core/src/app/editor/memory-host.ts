import type { Deck } from '../../doc/model.ts';
import { applyOps, type EditOp } from '../../doc/ops.ts';
import type { DeckHost } from './deck-host.ts';

export type MemoryHost = DeckHost & { emitExternalOps: (ops: EditOp[]) => void };

export function createMemoryHost(deckId: string, initial: Deck): MemoryHost {
  let deck = initial;
  const subscribers = new Set<(deck: Deck, ops?: EditOp[]) => void>();

  return {
    async loadDeck(id) {
      if (id !== deckId) throw new Error(`unknown deck: ${id}`);
      return deck;
    },
    async applyOps(id, ops) {
      if (id !== deckId) throw new Error(`unknown deck: ${id}`);
      deck = applyOps(deck, ops);
      return { deck };
    },
    subscribe(id, onExternalChange) {
      if (id !== deckId) return () => {};
      subscribers.add(onExternalChange);
      return () => subscribers.delete(onExternalChange);
    },
    async resolveAsset(ref) {
      return ref;
    },
    emitExternalOps(ops) {
      deck = applyOps(deck, ops);
      for (const fn of subscribers) fn(deck, ops);
    },
  };
}
