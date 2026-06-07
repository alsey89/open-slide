import type { DesignSystem } from '../../doc/design.ts';
import type { Deck } from '../../doc/model.ts';
import type { EditOp } from '../../doc/ops.ts';

export type BlockModule = Record<string, unknown>;

export type ThemeRef = { id: string; name: string; design: DesignSystem };

export type DeckHost = {
  loadDeck(id: string): Promise<Deck>;
  /** Persist `ops` and return the canonical deck after they are applied. */
  applyOps(id: string, ops: EditOp[]): Promise<{ deck: Deck }>;
  /** Notify when a different writer (e.g. an agent) changes the deck. Returns an unsubscribe. */
  subscribe(id: string, onExternalChange: (deck: Deck, ops?: EditOp[]) => void): () => void;
  /** Resolve an asset ref to a URL the renderer can load. */
  resolveAsset(ref: string): Promise<string>;
  compileBlock?(source: string): Promise<BlockModule>;
  listThemes?(): Promise<ThemeRef[]>;
  saveTheme?(theme: ThemeRef): Promise<{ id: string }>;
};
