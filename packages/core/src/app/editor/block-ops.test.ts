import { describe, expect, it } from 'vitest';
import { defaultDesign } from '../../doc/design.ts';
import type { Deck } from '../../doc/model.ts';
import { duplicateBlockOp, findBlock, moveBlockOp } from './block-ops.ts';

function makeDeck(): Deck {
  return {
    schemaVersion: 1,
    meta: { title: 'D', createdAt: '2026-01-01T00:00:00.000Z' },
    design: defaultDesign,
    slides: [
      {
        id: 's1',
        layout: 'title-body',
        slots: {
          title: [{ id: 'b1', type: 'heading', props: { text: 'A' } }],
          body: [
            { id: 'b2', type: 'text', props: { text: 'one' } },
            { id: 'b3', type: 'text', props: { text: 'two' } },
          ],
        },
      },
    ],
  };
}

describe('findBlock', () => {
  it('locates a block by id', () => {
    expect(findBlock(makeDeck(), 'b3')).toEqual({ slideId: 's1', slot: 'body', index: 1 });
  });
  it('returns null for an unknown id', () => {
    expect(findBlock(makeDeck(), 'nope')).toBeNull();
  });
});

describe('moveBlockOp', () => {
  it('moves a block down within its slot', () => {
    const op = moveBlockOp(makeDeck(), 'b2', 'down');
    expect(op).toEqual({
      kind: 'set-slot-blocks',
      slideId: 's1',
      slot: 'body',
      blocks: [
        { id: 'b3', type: 'text', props: { text: 'two' } },
        { id: 'b2', type: 'text', props: { text: 'one' } },
      ],
    });
  });
  it('moves a block up within its slot', () => {
    const op = moveBlockOp(makeDeck(), 'b3', 'up');
    expect(op?.kind).toBe('set-slot-blocks');
    if (op?.kind === 'set-slot-blocks') {
      expect(op.blocks.map((b) => b.id)).toEqual(['b3', 'b2']);
    }
  });
  it('returns null at the slot boundary (cannot move up the first block)', () => {
    expect(moveBlockOp(makeDeck(), 'b2', 'up')).toBeNull();
    expect(moveBlockOp(makeDeck(), 'b3', 'down')).toBeNull();
  });
});

describe('duplicateBlockOp', () => {
  it('inserts a fresh-id clone immediately after the original', () => {
    const op = duplicateBlockOp(makeDeck(), 'b2');
    expect(op?.kind).toBe('add-block');
    if (op?.kind === 'add-block') {
      expect(op.slideId).toBe('s1');
      expect(op.slot).toBe('body');
      expect(op.index).toBe(1);
      expect(op.block.id).not.toBe('b2');
      expect(op.block.props).toEqual({ text: 'one' });
    }
  });
  it('returns null for an unknown id', () => {
    expect(duplicateBlockOp(makeDeck(), 'nope')).toBeNull();
  });
});
