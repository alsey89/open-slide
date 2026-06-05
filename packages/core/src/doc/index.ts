export { registerBuiltins } from './builtins.ts';
export type { Block, Deck, DeckMeta, Slide } from './model.ts';
export { SCHEMA_VERSION } from './model.ts';
export {
  type BlockComponent,
  getBlock,
  getLayout,
  type LayoutComponent,
  registerBlock,
  registerLayout,
} from './registry.ts';
export { renderDeck } from './render.tsx';
export { DeckValidationError, validateDeck } from './validate.ts';
