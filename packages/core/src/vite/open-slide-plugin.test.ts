import { expect, test } from 'vitest';
import { __test } from './open-slide-plugin.ts';

test('toId returns the deck folder name', () => {
  expect(__test.toId('/proj/slides/intro/deck.json', '/proj/slides')).toBe('intro');
});

test('slideIdForEntry matches only slides/<id>/deck.json', () => {
  expect(__test.slideIdForEntry('/proj/slides/intro/deck.json', '/proj/slides')).toBe('intro');
  expect(__test.slideIdForEntry('/proj/slides/intro/index.tsx', '/proj/slides')).toBeNull();
  expect(__test.slideIdForEntry('/proj/slides/intro/assets/x.png', '/proj/slides')).toBeNull();
});

test('readDeckMetaFromJson extracts theme and createdAt', () => {
  const json = JSON.stringify({ meta: { createdAt: '2026-06-05T12:00:00Z', theme: 'acme' } });
  expect(__test.readDeckMetaFromJson(json)).toEqual({
    theme: 'acme',
    createdAt: '2026-06-05T12:00:00Z',
  });
});

test('readDeckMetaFromJson tolerates missing meta', () => {
  expect(__test.readDeckMetaFromJson('{}')).toEqual({ theme: null, createdAt: null });
  expect(__test.readDeckMetaFromJson('not json')).toEqual({ theme: null, createdAt: null });
});
