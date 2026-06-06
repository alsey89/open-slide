import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { FitToSlot } from './fit-to-slot.tsx';

test('renders children and a fit wrapper', () => {
  const html = renderToStaticMarkup(createElement(FitToSlot, null, 'hello'));
  expect(html).toContain('hello');
  expect(html).toContain('data-osd-fit');
});
