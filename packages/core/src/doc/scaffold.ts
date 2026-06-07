import { freshId } from './ids.ts';
import type { Block, Slide } from './model.ts';
import type { EditOp } from './ops.ts';

export function buildSlide(layout: string, slots: string[], id: string = freshId('s')): Slide {
  const slotMap: Record<string, Block[]> = {};
  for (const name of slots) slotMap[name] = [];
  return { id, layout, slots: slotMap };
}

// Callers resolve slot names from the registry (getLayout) before calling.
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
