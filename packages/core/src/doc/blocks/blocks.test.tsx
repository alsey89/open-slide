import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { Block } from '../model.ts';
import { Bullets } from './bullets.tsx';
import { ImageBlock } from './image.tsx';
import { Callout, Code, Heading, Quote, Stat, Text } from './index.ts';
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

const block = (type: string, props: Record<string, unknown>): Block => ({ id: 'b1', type, props });

test('heading tags its text element for in-place editing', () => {
  const html = renderToStaticMarkup(
    createElement(Heading, { block: block('heading', { text: 'Hi' }) }),
  );
  expect(html).toContain('data-osd-text="text"');
  expect(html).toContain('Hi');
});

test('text tags its text element', () => {
  const html = renderToStaticMarkup(
    createElement(Text, { block: block('text', { text: 'Body' }) }),
  );
  expect(html).toContain('data-osd-text="text"');
});

test('callout tags its text element', () => {
  const html = renderToStaticMarkup(
    createElement(Callout, { block: block('callout', { text: 'Note' }) }),
  );
  expect(html).toContain('data-osd-text="text"');
});

test('code tags its code element', () => {
  const html = renderToStaticMarkup(createElement(Code, { block: block('code', { code: 'x=1' }) }));
  expect(html).toContain('data-osd-text="code"');
});

test('quote tags only the inner text, not the decorative quote marks', () => {
  const html = renderToStaticMarkup(
    createElement(Quote, { block: block('quote', { text: 'Wisdom' }) }),
  );
  expect(html).toContain('data-osd-text="text"');
  expect(html).toMatch(/data-osd-text="text"[^>]*>Wisdom</);
});

test('stat tags value, label, and caption independently', () => {
  const html = renderToStaticMarkup(
    createElement(Stat, {
      block: block('stat', { value: '98%', label: 'Uptime', caption: 'last 30d' }),
    }),
  );
  expect(html).toContain('data-osd-text="value"');
  expect(html).toContain('data-osd-text="label"');
  expect(html).toContain('data-osd-text="caption"');
});
