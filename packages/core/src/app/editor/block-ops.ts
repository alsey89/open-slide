import { cloneBlockWithFreshId } from '../../doc/ids.ts';
import type { Block, Deck } from '../../doc/model.ts';
import type { EditOp } from '../../doc/ops.ts';

export type BlockLocation = { slideId: string; slot: string; index: number };

export function findBlock(deck: Deck, blockId: string): BlockLocation | null {
  for (const slide of deck.slides) {
    for (const slot of Object.keys(slide.slots)) {
      const index = slide.slots[slot].findIndex((b) => b.id === blockId);
      if (index !== -1) return { slideId: slide.id, slot, index };
    }
  }
  return null;
}

export function getBlockById(deck: Deck, blockId: string): Block | null {
  const loc = findBlock(deck, blockId);
  if (!loc) return null;
  const slide = deck.slides.find((s) => s.id === loc.slideId);
  return slide ? slide.slots[loc.slot][loc.index] : null;
}

export function moveBlockOp(deck: Deck, blockId: string, dir: 'up' | 'down'): EditOp | null {
  const loc = findBlock(deck, blockId);
  if (!loc) return null;
  const slide = deck.slides.find((s) => s.id === loc.slideId);
  if (!slide) return null;
  const blocks = [...slide.slots[loc.slot]];
  const to = dir === 'up' ? loc.index - 1 : loc.index + 1;
  if (to < 0 || to >= blocks.length) return null;
  const [moved] = blocks.splice(loc.index, 1);
  blocks.splice(to, 0, moved);
  return { kind: 'set-slot-blocks', slideId: loc.slideId, slot: loc.slot, blocks };
}

export function duplicateBlockOp(deck: Deck, blockId: string): EditOp | null {
  const loc = findBlock(deck, blockId);
  if (!loc) return null;
  const slide = deck.slides.find((s) => s.id === loc.slideId);
  if (!slide) return null;
  const original = slide.slots[loc.slot][loc.index];
  return {
    kind: 'add-block',
    slideId: loc.slideId,
    slot: loc.slot,
    index: loc.index + 1,
    block: cloneBlockWithFreshId(original),
  };
}
