import { beforeEach, expect, test } from 'vitest';
import { registerBuiltins } from './builtins.ts';
import { getBlock, getBlockSchema, getLayout, resetRegistry } from './registry.ts';

beforeEach(() => resetRegistry());

const ALL_BLOCKS = [
  'heading',
  'text',
  'bullets',
  'image',
  'quote',
  'code',
  'stat',
  'callout',
  'divider',
];

test('registers all built-in blocks', () => {
  registerBuiltins();
  for (const t of ALL_BLOCKS) {
    expect(getBlock(t), t).toBeDefined();
  }
});

test('every built-in block declares a prop schema (divider may be empty)', () => {
  registerBuiltins();
  for (const t of ALL_BLOCKS) {
    expect(getBlockSchema(t), t).toBeDefined();
  }
  expect(getBlockSchema('heading')).toEqual([{ key: 'text', type: 'textarea', label: 'Text' }]);
  expect(getBlockSchema('bullets')?.[0].type).toBe('string-list');
  expect(getBlockSchema('divider')).toEqual([]);
});

test('registers the new layouts with their slots', () => {
  registerBuiltins();
  expect(getLayout('full-bleed')?.slots).toEqual(['media', 'content']);
  expect(getLayout('grid')?.slots).toEqual(['title', 'items']);
  expect(getLayout('blank')?.slots).toEqual(['content']);
});

test('registers all built-in layouts with slots', () => {
  registerBuiltins();
  expect(getLayout('two-col')?.slots).toEqual(['title', 'left', 'right']);
  expect(getLayout('title-body')?.slots).toEqual(['title', 'body']);
});

test('is idempotent', () => {
  registerBuiltins();
  registerBuiltins();
  expect(getBlock('heading')).toBeDefined();
});
