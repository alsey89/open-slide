import { describe, expect, it } from 'vitest';
import { defaultDesign } from './design.ts';
import { applyOpWithInverse, invertOp } from './inverse.ts';
import type { Deck } from './model.ts';
import type { EditOp } from './ops.ts';
import { applyOp } from './ops.ts';

function makeDeck(): Deck {
  return {
    schemaVersion: 1,
    meta: { title: 'Original', createdAt: '2026-01-01T00:00:00.000Z', theme: 'midnight' },
    design: defaultDesign,
    slides: [
      {
        id: 's1',
        layout: 'title-body',
        slots: {
          title: [{ id: 'b1', type: 'heading', props: { text: 'One' } }],
          body: [{ id: 'b2', type: 'text', props: { text: 'Two' } }],
        },
        notes: 'note one',
      },
      {
        id: 's2',
        layout: 'blank',
        slots: { content: [{ id: 'b3', type: 'text', props: { text: 'Three' } }] },
      },
    ],
  };
}

const ROUND_TRIP_OPS: EditOp[] = [
  { kind: 'set-deck-title', title: 'New' },
  { kind: 'set-deck-theme', theme: 'coral' },
  { kind: 'set-design', design: { ...defaultDesign, space: 16 } },
  { kind: 'add-slide', index: 1, slide: { id: 's3', layout: 'blank', slots: { content: [] } } },
  { kind: 'remove-slide', slideId: 's2' },
  { kind: 'move-slide', slideId: 's1', toIndex: 1 },
  { kind: 'set-slide-layout', slideId: 's1', layout: 'two-col' },
  { kind: 'set-slide-notes', slideId: 's1', notes: 'changed' },
  { kind: 'set-slot-blocks', slideId: 's1', slot: 'title', blocks: [] },
  {
    kind: 'add-block',
    slideId: 's1',
    slot: 'title',
    index: 1,
    block: { id: 'b9', type: 'text', props: {} },
  },
  { kind: 'remove-block', blockId: 'b2' },
  { kind: 'update-block-props', blockId: 'b1', props: { text: 'Changed' } },
];

describe('invertOp round-trips', () => {
  for (const op of ROUND_TRIP_OPS) {
    it(`apply then undo restores the deck for ${op.kind}`, () => {
      const before = makeDeck();
      const { deck: after, inverse } = applyOpWithInverse(before, op);
      const restored = applyOp(after, inverse);
      expect(restored).toEqual(before);
    });
  }
});

describe('update-block-props undo removes newly added keys', () => {
  it('drops a key the forward op introduced', () => {
    const before = makeDeck();
    const op: EditOp = { kind: 'update-block-props', blockId: 'b1', props: { color: 'red' } };
    const { deck: after, inverse } = applyOpWithInverse(before, op);
    expect((after.slides[0].slots.title[0].props as Record<string, unknown>).color).toBe('red');
    const restored = applyOp(after, inverse);
    expect(restored.slides[0].slots.title[0].props).toEqual({ text: 'One' });
  });
});

describe('invertOp errors', () => {
  it('throws when the target block is missing', () => {
    expect(() => invertOp(makeDeck(), { kind: 'remove-block', blockId: 'nope' })).toThrow();
  });
});

describe('invertOp restores under clamped indices', () => {
  const CLAMPED_OPS: EditOp[] = [
    { kind: 'add-slide', index: 999, slide: { id: 's4', layout: 'blank', slots: { content: [] } } },
    {
      kind: 'add-block',
      slideId: 's1',
      slot: 'title',
      index: 999,
      block: { id: 'b8', type: 'text', props: {} },
    },
    { kind: 'move-slide', slideId: 's1', toIndex: 999 },
  ];
  for (const op of CLAMPED_OPS) {
    it(`restores original state after a clamped ${op.kind}`, () => {
      const before = makeDeck();
      const { deck: after, inverse } = applyOpWithInverse(before, op);
      expect(applyOp(after, inverse)).toEqual(before);
    });
  }
});

describe('invertOp restores fields that were originally absent', () => {
  function bareDeck(): Deck {
    return {
      schemaVersion: 1,
      meta: { createdAt: '2026-01-01T00:00:00.000Z' },
      design: defaultDesign,
      slides: [{ id: 's1', layout: 'blank', slots: { content: [] } }],
    };
  }

  it('removes a title that was not there before undo', () => {
    const before = bareDeck();
    const { deck: after, inverse } = applyOpWithInverse(before, {
      kind: 'set-deck-title',
      title: 'X',
    });
    expect(after.meta.title).toBe('X');
    expect(applyOp(after, inverse)).toEqual(before);
  });

  it('removes a theme that was not there before undo', () => {
    const before = bareDeck();
    const { deck: after, inverse } = applyOpWithInverse(before, {
      kind: 'set-deck-theme',
      theme: 'coral',
    });
    expect(after.meta.theme).toBe('coral');
    expect(applyOp(after, inverse)).toEqual(before);
  });

  it('removes slide notes that were not there before undo', () => {
    const before = bareDeck();
    const { deck: after, inverse } = applyOpWithInverse(before, {
      kind: 'set-slide-notes',
      slideId: 's1',
      notes: 'hi',
    });
    expect(after.slides[0].notes).toBe('hi');
    expect(applyOp(after, inverse)).toEqual(before);
  });
});

describe('set-slot-blocks inverse leaves a previously-absent slot as []', () => {
  it('documents the slot-key limitation', () => {
    const before = makeDeck();
    const op: EditOp = {
      kind: 'set-slot-blocks',
      slideId: 's2',
      slot: 'extra',
      blocks: [{ id: 'bx', type: 'text', props: { text: 'X' } }],
    };
    const { deck: after, inverse } = applyOpWithInverse(before, op);
    expect(after.slides[1].slots.extra).toHaveLength(1);
    const restored = applyOp(after, inverse);
    // The slot key cannot be removed by any op, so it remains as [] rather than disappearing.
    expect(restored.slides[1].slots.extra).toEqual([]);
  });
});

describe('add-block inverse leaves a previously-absent slot as []', () => {
  it('documents the slot-key limitation', () => {
    const before = makeDeck();
    const op: EditOp = {
      kind: 'add-block',
      slideId: 's2',
      slot: 'extra',
      index: 0,
      block: { id: 'bx', type: 'text', props: { text: 'X' } },
    };
    const { deck: after, inverse } = applyOpWithInverse(before, op);
    expect(after.slides[1].slots.extra).toHaveLength(1);
    const restored = applyOp(after, inverse);
    // The slot key cannot be removed by any op, so it remains as [] rather than disappearing.
    expect(restored.slides[1].slots.extra).toEqual([]);
  });
});

describe('invertOp throws on a missing slide', () => {
  it('throws for move-slide with an unknown slideId', () => {
    expect(() =>
      invertOp(makeDeck(), { kind: 'move-slide', slideId: 'nope', toIndex: 0 }),
    ).toThrow();
  });
});
