import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, test } from 'vitest';
import { registerBuiltins } from './builtins.ts';
import type { Deck } from './model.ts';
import { resetRegistry } from './registry.ts';
import { renderDeck } from './render.tsx';

beforeEach(() => {
  resetRegistry();
  registerBuiltins();
});

const deck: Deck = {
  schemaVersion: 1,
  meta: { title: 'My deck', createdAt: '2026-06-05T12:00:00Z', theme: 'acme' },
  design: {
    palette: { bg: '#fff', text: '#000', accent: '#f00' },
    fonts: { display: 'a', body: 'b' },
    typeScale: { hero: 100, body: 30 },
    radius: 8,
  },
  slides: [
    {
      id: 's1',
      layout: 'title',
      slots: { title: [{ id: 'b1', type: 'heading', props: { text: 'Hello' } }] },
      notes: 'speak here',
    },
    {
      id: 's2',
      layout: 'two-col',
      slots: {
        title: [{ id: 'b2', type: 'heading', props: { text: 'Two' } }],
        left: [{ id: 'b3', type: 'chart', props: {} }],
      },
    },
  ],
};

test('produces one page per slide', () => {
  expect(renderDeck(deck).default).toHaveLength(2);
});

test('passes meta and design through', () => {
  const m = renderDeck(deck);
  expect(m.meta?.title).toBe('My deck');
  expect(m.meta?.theme).toBe('acme');
  expect(m.design?.palette.accent).toBe('#f00');
});

test('aggregates notes index-aligned with pages', () => {
  expect(renderDeck(deck).notes).toEqual(['speak here', undefined]);
});

test('renders block content', () => {
  const m = renderDeck(deck);
  expect(renderToStaticMarkup(createElement(m.default[0]))).toContain('Hello');
});

test('unknown block type renders a fallback, not a crash', () => {
  const m = renderDeck(deck);
  expect(renderToStaticMarkup(createElement(m.default[1]))).toContain('unknown block: chart');
});

test('tags each block with data-osd-block-id without breaking content', () => {
  const m = renderDeck(deck);
  const html = renderToStaticMarkup(createElement(m.default[0]));
  expect(html).toContain('data-osd-block-id="b1"');
  expect(html).toContain('Hello');
});
