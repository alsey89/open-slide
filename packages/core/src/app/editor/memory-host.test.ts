import { describe, expect, it } from 'vitest';
import { defaultDesign } from '../../doc/design.ts';
import type { Deck } from '../../doc/model.ts';
import { createMemoryHost } from './memory-host.ts';

function makeDeck(): Deck {
  return {
    schemaVersion: 1,
    meta: { title: 'Original', createdAt: '2026-01-01T00:00:00.000Z' },
    design: defaultDesign,
    slides: [{ id: 's1', layout: 'blank', slots: { content: [] } }],
  };
}

describe('memory host implements the DeckHost contract', () => {
  it('loads the deck', async () => {
    const host = createMemoryHost('s1', makeDeck());
    expect((await host.loadDeck('s1')).meta.title).toBe('Original');
  });

  it('applyOps persists and returns the canonical deck', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const { deck } = await host.applyOps('s1', [{ kind: 'set-deck-title', title: 'X' }]);
    expect(deck.meta.title).toBe('X');
    expect((await host.loadDeck('s1')).meta.title).toBe('X');
  });

  it('applyOps does not echo to subscribers; emitExternalOps does', async () => {
    const host = createMemoryHost('s1', makeDeck());
    let received: Deck | null = null;
    const off = host.subscribe('s1', (d) => {
      received = d;
    });
    await host.applyOps('s1', [{ kind: 'set-deck-title', title: 'Self' }]);
    expect(received).toBeNull();
    host.emitExternalOps([{ kind: 'set-deck-title', title: 'Ext' }]);
    expect((received as Deck | null)?.meta.title).toBe('Ext');
    off();
  });

  it('rejects an unknown deck id', async () => {
    const host = createMemoryHost('s1', makeDeck());
    await expect(host.loadDeck('nope')).rejects.toThrow();
  });
});
