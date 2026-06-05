import { expect, test } from 'vitest';
import { computeFitScale } from './fit.ts';

test('no scaling when content fits', () => {
  expect(computeFitScale(800, 1000)).toBe(1);
  expect(computeFitScale(1000, 1000)).toBe(1);
});

test('scales down proportionally when content overflows', () => {
  expect(computeFitScale(2000, 1000)).toBeCloseTo(0.5);
});

test('never goes below the minimum', () => {
  expect(computeFitScale(10000, 1000, 0.5)).toBe(0.5);
});

test('degenerate sizes return 1', () => {
  expect(computeFitScale(0, 1000)).toBe(1);
  expect(computeFitScale(1000, 0)).toBe(1);
});
