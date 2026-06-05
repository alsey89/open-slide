import { createElement } from 'react';
import type { Page, SlideModule } from '../app/lib/sdk.ts';
import { UnknownBlock } from './blocks/index.ts';
import { MissingLayout } from './layouts/index.ts';
import type { Block, Deck, Slide } from './model.ts';
import { getBlock, getLayout } from './registry.ts';

function renderBlock(block: Block) {
  const Component = getBlock(block.type);
  if (!Component) return createElement(UnknownBlock, { key: block.id, type: block.type });
  return createElement(Component, { key: block.id, block });
}

function makePage(slide: Slide): Page {
  const SlidePage: Page = () => {
    const entry = getLayout(slide.layout);
    if (!entry) return createElement(MissingLayout, { layout: slide.layout });
    const renderSlot = (name: string) => (slide.slots[name] ?? []).map(renderBlock);
    return createElement(entry.component, { slide, renderSlot });
  };
  if (slide.transition) SlidePage.transition = slide.transition;
  return SlidePage;
}

export function renderDeck(deck: Deck): SlideModule {
  return {
    default: deck.slides.map(makePage),
    meta: { title: deck.meta.title, theme: deck.meta.theme, createdAt: deck.meta.createdAt },
    design: deck.design,
    notes: deck.slides.map((s) => s.notes),
  };
}
