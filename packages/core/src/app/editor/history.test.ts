import { describe, expect, it } from 'vitest';
import { defaultDesign } from '../../doc/design.ts';
import type { Deck } from '../../doc/model.ts';
import type { EditOp } from '../../doc/ops.ts';
import { canRedo, canUndo, initHistory, pushOp, redo, undo } from './history.ts';

function makeDeck(): Deck {
  return {
    schemaVersion: 1,
    meta: { title: 'A', createdAt: '2026-01-01T00:00:00.000Z' },
    design: defaultDesign,
    slides: [
      {
        id: 's1',
        layout: 'blank',
        slots: { content: [{ id: 'b1', type: 'text', props: { text: 'x' } }] },
      },
    ],
  };
}

describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const h = initHistory(makeDeck());
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });

  it('pushOp applies forward and enables undo', () => {
    const h = pushOp(initHistory(makeDeck()), { kind: 'set-deck-title', title: 'B' });
    expect(h.deck.meta.title).toBe('B');
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);
  });

  it('undo restores and redo re-applies', () => {
    const h1 = pushOp(initHistory(makeDeck()), { kind: 'set-deck-title', title: 'B' });
    const h2 = undo(h1);
    expect(h2.deck.meta.title).toBe('A');
    expect(canRedo(h2)).toBe(true);
    const h3 = redo(h2);
    expect(h3.deck.meta.title).toBe('B');
  });

  it('pushing after undo clears the redo stack', () => {
    const h1 = pushOp(initHistory(makeDeck()), { kind: 'set-deck-title', title: 'B' });
    const h2 = undo(h1);
    const h3 = pushOp(h2, { kind: 'set-deck-theme', theme: 'coral' });
    expect(canRedo(h3)).toBe(false);
    expect(h3.deck.meta.title).toBe('A');
    expect(h3.deck.meta.theme).toBe('coral');
  });

  it('round-trips a remove-block op', () => {
    const h1 = pushOp(initHistory(makeDeck()), { kind: 'remove-block', blockId: 'b1' });
    expect(h1.deck.slides[0].slots.content).toHaveLength(0);
    const h2 = undo(h1);
    expect(h2.deck.slides[0].slots.content).toHaveLength(1);
    expect(h2.deck.slides[0].slots.content[0].id).toBe('b1');
  });

  it('deep round-trips a mixed sequence of ops', () => {
    const before = makeDeck();
    const ops: EditOp[] = [
      { kind: 'set-deck-title', title: 'B' },
      { kind: 'set-deck-theme', theme: 'coral' },
      {
        kind: 'add-block',
        slideId: 's1',
        slot: 'content',
        index: 1,
        block: { id: 'b2', type: 'text', props: { text: 'two' } },
      },
      { kind: 'update-block-props', blockId: 'b1', props: { text: 'edited' } },
      { kind: 'remove-block', blockId: 'b1' },
    ];
    let h = initHistory(before);
    for (const op of ops) h = pushOp(h, op);
    for (let i = 0; i < ops.length; i++) h = undo(h);
    expect(h.deck).toEqual(before);
    expect(canUndo(h)).toBe(false);
  });

  it('redo then undo restores a captured block via the recomputed inverse', () => {
    const h1 = pushOp(initHistory(makeDeck()), { kind: 'remove-block', blockId: 'b1' });
    const h2 = undo(h1);
    const h3 = redo(h2);
    expect(h3.deck.slides[0].slots.content).toHaveLength(0);
    const h4 = undo(h3);
    expect(h4.deck.slides[0].slots.content[0].id).toBe('b1');
    expect(h4.deck.slides[0].slots.content[0].props).toEqual({ text: 'x' });
  });

  it('pushing after a redo clears the future across a multi-step sequence', () => {
    let h = initHistory(makeDeck());
    h = pushOp(h, { kind: 'set-deck-title', title: 'B' });
    h = pushOp(h, { kind: 'set-deck-theme', theme: 'coral' });
    h = undo(h);
    h = undo(h);
    h = redo(h);
    expect(h.deck.meta.title).toBe('B');
    h = pushOp(h, { kind: 'set-deck-title', title: 'C' });
    expect(canRedo(h)).toBe(false);
    expect(h.deck.meta.title).toBe('C');
  });

  it('does not mutate prior history states', () => {
    const h1 = pushOp(initHistory(makeDeck()), { kind: 'set-deck-title', title: 'B' });
    const h2 = pushOp(h1, { kind: 'remove-block', blockId: 'b1' });
    expect(h1.deck.meta.title).toBe('B');
    expect(h1.deck.slides[0].slots.content).toHaveLength(1);
    expect(h1.deck).not.toBe(h2.deck);
  });
});
