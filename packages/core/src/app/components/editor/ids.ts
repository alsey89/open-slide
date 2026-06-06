import type { Slide } from '../../../doc/model.ts';

export function freshId(prefix = 'x'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function cloneSlideWithFreshIds(slide: Slide): Slide {
  const copy: Slide = structuredClone(slide);
  copy.id = freshId('s');
  for (const name of Object.keys(copy.slots)) {
    for (const block of copy.slots[name]) block.id = freshId('b');
  }
  return copy;
}
