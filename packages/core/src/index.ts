export type { ImagePlaceholderProps } from './app/components/image-placeholder.tsx';
export { ImagePlaceholder } from './app/components/image-placeholder.tsx';
export { useSlidePageNumber } from './app/lib/page-context.tsx';
export type { Page, SlideMeta, SlideModule } from './app/lib/sdk.ts';
export { CANVAS_HEIGHT, CANVAS_WIDTH } from './app/lib/sdk.ts';
export type { StepProps, StepsProps } from './app/lib/step-context.tsx';
export { Step, Steps } from './app/lib/step-context.tsx';
export type { SlideTransition, TransitionPhase } from './app/lib/transition.ts';
export type { OpenSlideConfig } from './config.ts';
export type {
  DesignFonts,
  DesignPalette,
  DesignSystem,
  DesignTypeScale,
} from './doc/design.ts';
export {
  cssVarsToString,
  defaultDesign,
  designToCssVars,
  normalizeDesign,
} from './doc/design.ts';
export type { Block, Deck, DeckMeta, Slide } from './doc/index.ts';
export {
  applyOp,
  applyOps,
  type BlockComponent,
  type BlockPropSchema,
  DeckValidationError,
  type EditOp,
  EditOpError,
  getBlock,
  getBlockSchema,
  getLayout,
  type LayoutComponent,
  listBlockTypes,
  listLayouts,
  type PropField,
  type PropFieldType,
  registerBlock,
  registerBuiltins,
  registerLayout,
  renderDeck,
  SCHEMA_VERSION,
  validateDeck,
} from './doc/index.ts';
export type { Locale, Plural } from './locale/types.ts';
