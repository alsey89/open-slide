export type {
  DeepPartial,
  DesignFonts,
  DesignPalette,
  DesignSystem,
  DesignTypeScale,
} from './design.ts';
export {
  cssVarsToString,
  defaultDesign,
  designToCssVars,
  normalizeDesign,
} from './design.ts';
export { cloneBlockWithFreshId, cloneSlideWithFreshIds, freshId } from './ids.ts';
export { applyOpWithInverse, invertOp } from './inverse.ts';
export type { Block, Deck, DeckMeta, Slide } from './model.ts';
export { SCHEMA_VERSION } from './model.ts';
export { applyOp, applyOps, type EditOp, EditOpError } from './ops.ts';
export {
  type BlockPropSchema,
  getBlockSchema,
  listBlockTypes,
  listLayouts,
  type PropField,
  type PropFieldType,
} from './registry.ts';
export { addSlideFromLayout, buildSlide } from './scaffold.ts';
export type { SlideTransition, TransitionPhase } from './transition.ts';
export { DeckValidationError, validateDeck } from './validate.ts';
