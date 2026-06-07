import { createElement } from 'react';
import type { Page, SlideModule } from '../app/lib/sdk.ts';
import { UnknownBlock } from './blocks/index.ts';
import { normalizeDesign } from './design.ts';
import { MissingLayout } from './layouts/index.ts';
import type { Block, Deck, Slide } from './model.ts';
import { getBlock, getLayout } from './registry.ts';

function renderBlock(block: Block) {
  const Component = getBlock(block.type);
  const inner = Component
    ? createElement(Component, { block })
    : createElement(UnknownBlock, { type: block.type });
  // display:contents makes the wrapper invisible to grid/flex layout while still
  // providing a stable DOM node for click-to-block-id resolution.
  return createElement(
    'div',
    { key: block.id, 'data-osd-block-id': block.id, style: { display: 'contents' } },
    inner,
  );
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
    design: normalizeDesign(deck.design),
    notes: deck.slides.map((s) => s.notes),
  };
}
