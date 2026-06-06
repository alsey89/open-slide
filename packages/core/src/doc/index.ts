export { registerBuiltins } from './builtins.ts';
export type { Block, Deck, DeckMeta, Slide } from './model.ts';
export { SCHEMA_VERSION } from './model.ts';
export { applyOp, applyOps, type EditOp, EditOpError } from './ops.ts';
export {
  type BlockComponent,
  getBlock,
  getLayout,
  type LayoutComponent,
  listBlockTypes,
  listLayouts,
  registerBlock,
  registerLayout,
} from './registry.ts';
export { renderDeck } from './render.tsx';
export { DeckValidationError, validateDeck } from './validate.ts';
