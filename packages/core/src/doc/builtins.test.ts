import { beforeEach, expect, test } from 'vitest';
import { registerBuiltins } from './builtins.ts';
import { getBlock, getLayout, resetRegistry } from './registry.ts';

beforeEach(() => resetRegistry());

test('registers all built-in blocks', () => {
  registerBuiltins();
  for (const t of ['heading', 'text', 'bullets', 'image', 'quote', 'code']) {
    expect(getBlock(t), t).toBeDefined();
  }
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
