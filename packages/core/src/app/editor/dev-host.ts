import type { Deck } from '../../doc/model.ts';
import type { EditOp } from '../../doc/ops.ts';
import { loadDeckRaw } from '../lib/slides.ts';
import type { DeckHost } from './deck-host.ts';

async function persistOps(id: string, ops: EditOp[]): Promise<Deck> {
  const res = await fetch(`/__deck/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ops }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(detail.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { deck: Deck };
  return data.deck;
}

export function createDevHost(): DeckHost {
  return {
    loadDeck: (id) => loadDeckRaw(id),
    async applyOps(id, ops) {
      return { deck: await persistOps(id, ops) };
    },
    // The dev server fires one HMR event for every deck.json write — including
    // the editor's own saves — so live external-change wiring needs self-echo
    // suppression. Deferred to M1d (with flash); a no-op keeps M1a loop-free.
    subscribe() {
      return () => {};
    },
    async resolveAsset(ref) {
      return ref;
    },
  };
}
