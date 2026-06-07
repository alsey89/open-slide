import { freshId } from './ids.ts';
import type { Block, Slide } from './model.ts';
import type { EditOp } from './ops.ts';

/** Build a new slide for `layout` with an empty array per declared slot. */
export function buildSlide(layout: string, slots: string[], id: string = freshId('s')): Slide {
  const slotMap: Record<string, Block[]> = {};
  for (const name of slots) slotMap[name] = [];
  return { id, layout, slots: slotMap };
}

/** Convenience op: insert a fresh, layout-shaped slide at `index`. Callers resolve `slots` from the registry. */
export function addSlideFromLayout(args: {
  layout: string;
  slots: string[];
  index: number;
  id?: string;
}): EditOp {
  return {
    kind: 'add-slide',
    index: args.index,
    slide: buildSlide(args.layout, args.slots, args.id),
  };
}
