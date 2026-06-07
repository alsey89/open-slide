import type { SlideTransition } from '../app/lib/transition.ts';
import type { DesignSystem } from './design.ts';

export const SCHEMA_VERSION = 1 as const;

export type DeckMeta = {
  title?: string;
  /** ISO 8601 string literal. Used to sort the slide list. */
  createdAt: string;
  /** Optional NAMED theme reference for the browser grouping UI. NOT the tokens. */
  theme?: string;
};

export type Block = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

export type Slide = {
  id: string;
  layout: string;
  slots: Record<string, Block[]>;
  notes?: string;
  transition?: SlideTransition;
};

export type Deck = {
  schemaVersion: typeof SCHEMA_VERSION;
  meta: DeckMeta;
  design: DesignSystem;
  slides: Slide[];
};
