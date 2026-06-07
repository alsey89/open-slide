import type { Block, Deck } from './model.ts';
import { applyOp, type EditOp, EditOpError } from './ops.ts';

function slideIndex(deck: Deck, slideId: string): number {
  const i = deck.slides.findIndex((s) => s.id === slideId);
  if (i === -1) throw new EditOpError(`slide not found: ${slideId}`);
  return i;
}

function locateBlock(
  deck: Deck,
  blockId: string,
): { slideId: string; slot: string; index: number; block: Block } {
  for (const slide of deck.slides) {
    for (const slot of Object.keys(slide.slots)) {
      const index = slide.slots[slot].findIndex((b) => b.id === blockId);
      if (index !== -1) {
        return { slideId: slide.id, slot, index, block: slide.slots[slot][index] };
      }
    }
  }
  throw new EditOpError(`block not found: ${blockId}`);
}

/** Given the deck BEFORE `op` is applied, return the op that undoes it. */
export function invertOp(before: Deck, op: EditOp): EditOp {
  switch (op.kind) {
    case 'set-deck-title':
      return { kind: 'set-deck-title', title: before.meta.title };
    case 'set-deck-theme':
      return { kind: 'set-deck-theme', theme: before.meta.theme };
    case 'set-design':
      return { kind: 'set-design', design: structuredClone(before.design) };
    case 'add-slide':
      return { kind: 'remove-slide', slideId: op.slide.id };
    case 'remove-slide': {
      const i = slideIndex(before, op.slideId);
      return { kind: 'add-slide', index: i, slide: structuredClone(before.slides[i]) };
    }
    case 'move-slide':
      return { kind: 'move-slide', slideId: op.slideId, toIndex: slideIndex(before, op.slideId) };
    case 'set-slide-layout': {
      const s = before.slides[slideIndex(before, op.slideId)];
      return { kind: 'set-slide-layout', slideId: op.slideId, layout: s.layout };
    }
    case 'set-slide-notes': {
      const s = before.slides[slideIndex(before, op.slideId)];
      return { kind: 'set-slide-notes', slideId: op.slideId, notes: s.notes };
    }
    case 'set-slot-blocks': {
      const s = before.slides[slideIndex(before, op.slideId)];
      // No op can delete a slot key, so undoing a set on a previously-absent slot leaves it as [].
      return {
        kind: 'set-slot-blocks',
        slideId: op.slideId,
        slot: op.slot,
        blocks: structuredClone(s.slots[op.slot] ?? []),
      };
    }
    case 'add-block':
      return { kind: 'remove-block', blockId: op.block.id };
    case 'remove-block': {
      const loc = locateBlock(before, op.blockId);
      return {
        kind: 'add-block',
        slideId: loc.slideId,
        slot: loc.slot,
        index: loc.index,
        block: structuredClone(loc.block),
      };
    }
    case 'update-block-props': {
      const loc = locateBlock(before, op.blockId);
      const prev: Record<string, unknown> = {};
      // For each key the forward op writes, restore its prior value; absent keys become undefined,
      // which applyOp's update-block-props deletes — exactly undoing a newly-added key.
      for (const k of Object.keys(op.props)) prev[k] = loc.block.props[k];
      return { kind: 'update-block-props', blockId: op.blockId, props: prev };
    }
  }
}

export function applyOpWithInverse(deck: Deck, op: EditOp): { deck: Deck; inverse: EditOp } {
  const inverse = invertOp(deck, op);
  return { deck: applyOp(deck, op), inverse };
}
