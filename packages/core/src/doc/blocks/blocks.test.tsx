import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { Block } from '../model.ts';
import { Bullets } from './bullets.tsx';
import { Code } from './code.tsx';
import { Heading } from './heading.tsx';
import { ImageBlock } from './image.tsx';
import { Quote } from './quote.tsx';
import { Text } from './text.tsx';
import { UnknownBlock } from './unknown.tsx';

const b = (props: Record<string, unknown>): { block: Block } => ({
  block: { id: 'x', type: 't', props },
});

test('heading renders its text', () => {
  expect(renderToStaticMarkup(createElement(Heading, b({ text: 'Title' })))).toContain('Title');
});
test('text renders its text', () => {
  expect(renderToStaticMarkup(createElement(Text, b({ text: 'Body copy' })))).toContain(
    'Body copy',
  );
});
test('bullets renders each item as <li>', () => {
  const html = renderToStaticMarkup(createElement(Bullets, b({ items: ['a', 'b'] })));
  expect(html).toContain('<li');
  expect(html).toContain('a');
  expect(html).toContain('b');
});
test('image renders src and alt', () => {
  const html = renderToStaticMarkup(createElement(ImageBlock, b({ src: '/x.png', alt: 'pic' })));
  expect(html).toContain('/x.png');
  expect(html).toContain('pic');
});
test('quote renders text and attribution', () => {
  const html = renderToStaticMarkup(createElement(Quote, b({ text: 'Q', attribution: 'A' })));
  expect(html).toContain('Q');
  expect(html).toContain('A');
});
test('code renders the code', () => {
  expect(renderToStaticMarkup(createElement(Code, b({ code: 'x=1' })))).toContain('x=1');
});
test('unknown block names the missing type', () => {
  expect(renderToStaticMarkup(createElement(UnknownBlock, { type: 'chart' }))).toContain('chart');
});
