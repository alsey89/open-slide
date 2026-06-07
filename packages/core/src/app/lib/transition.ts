import type { SlideTransition } from '../../doc/transition.ts';
import type { Page } from './sdk';

export type { SlideTransition, TransitionPhase } from '../../doc/transition.ts';

export function resolveTransition(
  pages: Page[],
  index: number,
  moduleDefault?: SlideTransition,
): SlideTransition | undefined {
  return pages[index]?.transition ?? moduleDefault;
}
