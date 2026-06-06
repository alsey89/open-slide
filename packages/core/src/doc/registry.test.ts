import { beforeEach, expect, test } from 'vitest';
import {
  getBlock,
  getLayout,
  listBlockTypes,
  listLayouts,
  registerBlock,
  registerLayout,
  resetRegistry,
} from './registry.ts';

beforeEach(() => resetRegistry());

test('registers and resolves a block', () => {
  const C = () => null;
  registerBlock('heading', C);
  expect(getBlock('heading')).toBe(C);
  expect(getBlock('missing')).toBeUndefined();
});

test('registers a layout with its slot names', () => {
  const L = () => null;
  registerLayout('two-col', L, ['title', 'left', 'right']);
  expect(getLayout('two-col')?.slots).toEqual(['title', 'left', 'right']);
});

test('resetRegistry clears entries', () => {
  registerBlock('x', () => null);
  resetRegistry();
  expect(getBlock('x')).toBeUndefined();
});

test('listBlockTypes returns registered types sorted', () => {
  registerBlock('zeta', () => null);
  registerBlock('alpha', () => null);
  expect(listBlockTypes()).toEqual(['alpha', 'zeta']);
});

test('listLayouts returns registered layouts with slots, sorted', () => {
  registerLayout('two-col', () => null, ['title', 'left', 'right']);
  registerLayout('title', () => null, ['title', 'subtitle']);
  expect(listLayouts()).toEqual([
    { type: 'title', slots: ['title', 'subtitle'] },
    { type: 'two-col', slots: ['title', 'left', 'right'] },
  ]);
});
