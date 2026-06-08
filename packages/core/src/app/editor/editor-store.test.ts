import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultDesign } from '../../doc/design.ts';
import type { Deck } from '../../doc/model.ts';
import { createEditorStore } from './editor-store.ts';
import { createMemoryHost } from './memory-host.ts';

function makeDeck(): Deck {
  return {
    schemaVersion: 1,
    meta: { title: 'Original', createdAt: '2026-01-01T00:00:00.000Z' },
    design: defaultDesign,
    slides: [
      {
        id: 's1',
        layout: 'title-body',
        slots: { title: [{ id: 'b1', type: 'heading', props: { text: 'Hi' } }], body: [] },
      },
    ],
  };
}

describe('createEditorStore', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('applies an op optimistically and persists it', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: await host.loadDeck('s1') });
    store.apply({ kind: 'set-deck-title', title: 'Changed' });
    expect(store.getState().deck.meta.title).toBe('Changed');
    expect(store.getState().canUndo).toBe(true);
    await vi.runAllTimersAsync();
    expect((await host.loadDeck('s1')).meta.title).toBe('Changed');
    expect(store.getState().saveState).toBe('idle');
    store.dispose();
  });

  it('undo restores and redo re-applies, persisting each', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: await host.loadDeck('s1') });
    store.apply({ kind: 'remove-block', blockId: 'b1' });
    await vi.runAllTimersAsync();
    expect(store.getState().deck.slides[0].slots.title).toHaveLength(0);
    store.undo();
    expect(store.getState().deck.slides[0].slots.title).toHaveLength(1);
    expect(store.getState().canRedo).toBe(true);
    await vi.runAllTimersAsync();
    expect((await host.loadDeck('s1')).slides[0].slots.title).toHaveLength(1);
    store.redo();
    expect(store.getState().deck.slides[0].slots.title).toHaveLength(0);
    await vi.runAllTimersAsync();
    expect((await host.loadDeck('s1')).slides[0].slots.title).toHaveLength(0);
    store.dispose();
  });

  it('adopts external changes and resets local history', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: await host.loadDeck('s1') });
    store.apply({ kind: 'set-deck-title', title: 'Local' });
    expect(store.getState().canUndo).toBe(true);
    host.emitExternalOps([{ kind: 'set-deck-title', title: 'External' }]);
    expect(store.getState().deck.meta.title).toBe('External');
    expect(store.getState().canUndo).toBe(false);
    store.dispose();
  });

  it('notifies subscribers and tracks selection', () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: makeDeck() });
    let calls = 0;
    const off = store.subscribe(() => {
      calls += 1;
    });
    store.select('b1');
    expect(calls).toBe(1);
    expect(store.getState().selectedBlockId).toBe('b1');
    off();
    store.dispose();
  });

  it('external adoption drops un-persisted local edits (external wins)', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: await host.loadDeck('s1') });
    store.apply({ kind: 'set-deck-title', title: 'Local' });
    host.emitExternalOps([{ kind: 'set-deck-title', title: 'External' }]);
    await vi.runAllTimersAsync();
    expect(store.getState().deck.meta.title).toBe('External');
    expect((await host.loadDeck('s1')).meta.title).toBe('External');
    store.dispose();
  });

  it('returns a stable snapshot reference until state changes', () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: makeDeck() });
    const a = store.getState();
    store.select(null);
    expect(store.getState()).toBe(a);
    store.select('b1');
    expect(store.getState()).not.toBe(a);
    store.dispose();
  });

  it('skips the whole batch and persists nothing when an op throws', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: await host.loadDeck('s1') });
    store.apply([
      { kind: 'set-deck-title', title: 'B' },
      { kind: 'remove-block', blockId: 'nope' },
    ]);
    expect(store.getState().canUndo).toBe(false);
    expect(store.getState().deck.meta.title).toBe('Original');
    expect(store.getState().error).toBeTruthy();
    await vi.runAllTimersAsync();
    expect((await host.loadDeck('s1')).meta.title).toBe('Original');
    store.dispose();
  });

  it('startEdit sets the editing path and selects the block', () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: makeDeck() });
    store.startEdit('b1', 'text');
    expect(store.getState().editing).toEqual({ blockId: 'b1', path: 'text' });
    expect(store.getState().selectedBlockId).toBe('b1');
    store.dispose();
  });

  it('commitEdit writes update-block-props for the edited field and clears editing', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: await host.loadDeck('s1') });
    store.startEdit('b1', 'text');
    store.commitEdit('Edited');
    expect(store.getState().editing).toBeNull();
    expect(store.getState().deck.slides[0].slots.title[0].props.text).toBe('Edited');
    expect(store.getState().canUndo).toBe(true);
    store.dispose();
  });

  it('commitEdit writes a nested array value via update-block-props', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: await host.loadDeck('s1') });
    store.apply({
      kind: 'add-block',
      slideId: 's1',
      slot: 'body',
      index: 0,
      block: { id: 'b2', type: 'bullets', props: { items: ['a', 'b', 'c'] } },
    });
    store.startEdit('b2', 'items.1');
    store.commitEdit('B');
    expect(store.getState().editing).toBeNull();
    expect(store.getState().deck.slides[0].slots.body[0].props.items).toEqual(['a', 'B', 'c']);
    store.dispose();
  });

  it('commitEdit is a no-op when not editing', () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: makeDeck() });
    store.commitEdit('x');
    expect(store.getState().canUndo).toBe(false);
    store.dispose();
  });

  it('cancelEdit clears editing without applying an op', () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: makeDeck() });
    store.startEdit('b1', 'text');
    store.cancelEdit();
    expect(store.getState().editing).toBeNull();
    expect(store.getState().canUndo).toBe(false);
    store.dispose();
  });
});
