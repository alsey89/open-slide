import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { Slide } from '../model.ts';
import { LAYOUT_SLOTS, TitleBody, TwoCol } from './index.ts';

const slide: Slide = { id: 's', layout: 'x', slots: {} };
const slot = (name: string): ReactNode => `[${name}]`;

test('title-body renders title and body slots', () => {
  const html = renderToStaticMarkup(createElement(TitleBody, { slide, renderSlot: slot }));
  expect(html).toContain('[title]');
  expect(html).toContain('[body]');
});

test('two-col renders title, left, right slots', () => {
  const html = renderToStaticMarkup(createElement(TwoCol, { slide, renderSlot: slot }));
  expect(html).toContain('[title]');
  expect(html).toContain('[left]');
  expect(html).toContain('[right]');
});

test('LAYOUT_SLOTS declares slot names per layout', () => {
  expect(LAYOUT_SLOTS['two-col']).toEqual(['title', 'left', 'right']);
});
