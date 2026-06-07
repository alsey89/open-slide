import type { Block, Deck, Slide } from './model.ts';
import { validateDeck } from './validate.ts';

export type EditOp =
  | { kind: 'set-deck-title'; title: string }
  | { kind: 'set-deck-theme'; theme?: string }
  | { kind: 'set-design'; design: Deck['design'] }
  | { kind: 'add-slide'; index: number; slide: Slide }
  | { kind: 'remove-slide'; slideId: string }
  | { kind: 'move-slide'; slideId: string; toIndex: number }
  | { kind: 'set-slide-layout'; slideId: string; layout: string }
  | { kind: 'set-slide-notes'; slideId: string; notes?: string }
  | { kind: 'set-slot-blocks'; slideId: string; slot: string; blocks: Block[] }
  | { kind: 'add-block'; slideId: string; slot: string; index: number; block: Block }
  | { kind: 'remove-block'; blockId: string }
  | { kind: 'update-block-props'; blockId: string; props: Record<string, unknown> };

export class EditOpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EditOpError';
  }
}

function clampIndex(i: number, len: number): number {
  if (i < 0) return 0;
  if (i > len) return len;
  return i;
}

function findSlide(deck: Deck, slideId: string): Slide {
  const slide = deck.slides.find((s) => s.id === slideId);
  if (!slide) throw new EditOpError(`slide not found: ${slideId}`);
  return slide;
}

function mutate(deck: Deck, op: EditOp): void {
  switch (op.kind) {
    case 'set-deck-title':
      deck.meta.title = op.title;
      return;
    case 'set-deck-theme':
      if (op.theme === undefined) delete deck.meta.theme;
      else deck.meta.theme = op.theme;
      return;
    case 'set-design':
      deck.design = op.design;
      return;
    case 'add-slide':
      deck.slides.splice(clampIndex(op.index, deck.slides.length), 0, op.slide);
      return;
    case 'remove-slide': {
      const idx = deck.slides.findIndex((s) => s.id === op.slideId);
      if (idx === -1) throw new EditOpError(`slide not found: ${op.slideId}`);
      if (deck.slides.length === 1) throw new EditOpError('cannot remove the only slide');
      deck.slides.splice(idx, 1);
      return;
    }
    case 'move-slide': {
      const from = deck.slides.findIndex((s) => s.id === op.slideId);
      if (from === -1) throw new EditOpError(`slide not found: ${op.slideId}`);
      const [moved] = deck.slides.splice(from, 1);
      deck.slides.splice(clampIndex(op.toIndex, deck.slides.length), 0, moved);
      return;
    }
    case 'set-slide-layout':
      findSlide(deck, op.slideId).layout = op.layout;
      return;
    case 'set-slide-notes': {
      const slide = findSlide(deck, op.slideId);
      if (op.notes === undefined) delete slide.notes;
      else slide.notes = op.notes;
      return;
    }
    case 'set-slot-blocks':
      findSlide(deck, op.slideId).slots[op.slot] = op.blocks;
      return;
    case 'add-block': {
      const slide = findSlide(deck, op.slideId);
      if (!slide.slots[op.slot]) slide.slots[op.slot] = [];
      const arr = slide.slots[op.slot];
      arr.splice(clampIndex(op.index, arr.length), 0, op.block);
      return;
    }
    case 'remove-block': {
      for (const slide of deck.slides) {
        for (const name of Object.keys(slide.slots)) {
          const arr = slide.slots[name];
          const idx = arr.findIndex((b) => b.id === op.blockId);
          if (idx !== -1) {
            arr.splice(idx, 1);
            return;
          }
        }
      }
      throw new EditOpError(`block not found: ${op.blockId}`);
    }
    case 'update-block-props': {
      for (const slide of deck.slides) {
        for (const name of Object.keys(slide.slots)) {
          const block = slide.slots[name].find((b) => b.id === op.blockId);
          if (block) {
            block.props = { ...block.props, ...op.props };
            return;
          }
        }
      }
      throw new EditOpError(`block not found: ${op.blockId}`);
    }
  }
}

export function applyOp(deck: Deck, op: EditOp): Deck {
  const next = structuredClone(deck);
  mutate(next, op);
  return validateDeck(next);
}

export function applyOps(deck: Deck, ops: EditOp[]): Deck {
  let current = deck;
  for (const op of ops) current = applyOp(current, op);
  return current;
}
