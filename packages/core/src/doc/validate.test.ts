import { describe, expect, test } from 'vitest';
import { DeckValidationError, validateDeck } from './validate.ts';

const valid = {
  schemaVersion: 1,
  meta: { title: 'T', createdAt: '2026-06-05T12:00:00Z' },
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
      slots: { title: [{ id: 'b1', type: 'heading', props: { text: 'Hi' } }] },
    },
  ],
};

test('accepts a valid deck and returns it', () => {
  expect(validateDeck(structuredClone(valid)).slides[0].id).toBe('s1');
});

describe('rejections', () => {
  test('wrong schemaVersion', () => {
    expect(() => validateDeck({ ...structuredClone(valid), schemaVersion: 2 })).toThrow(
      DeckValidationError,
    );
  });
  test('missing createdAt', () => {
    const d = structuredClone(valid);
    delete (d.meta as Record<string, unknown>).createdAt;
    expect(() => validateDeck(d)).toThrow(/createdAt/);
  });
  test('empty slides', () => {
    expect(() => validateDeck({ ...structuredClone(valid), slides: [] })).toThrow(/non-empty/);
  });
  test('duplicate ids', () => {
    const d = structuredClone(valid);
    d.slides[0].slots.title[0].id = 's1';
    expect(() => validateDeck(d)).toThrow(/duplicate id "s1"/);
  });
  test('block missing type', () => {
    const d = structuredClone(valid);
    delete (d.slides[0].slots.title[0] as Record<string, unknown>).type;
    expect(() => validateDeck(d)).toThrow(/\.type must be a non-empty string/);
  });
});

test('accepts an empty design (all fields optional)', () => {
  expect(() => validateDeck({ ...structuredClone(valid), design: {} })).not.toThrow();
});
test('accepts a partial design with only some palette roles', () => {
  expect(() =>
    validateDeck({ ...structuredClone(valid), design: { palette: { accent: '#f00' } } }),
  ).not.toThrow();
});
test('accepts a deck with no design key at all', () => {
  const d = structuredClone(valid);
  delete (d as Record<string, unknown>).design;
  expect(() => validateDeck(d)).not.toThrow();
});
test('rejects non-string palette color', () => {
  const d = structuredClone(valid);
  (d.design.palette as Record<string, unknown>).bg = 123;
  expect(() => validateDeck(d)).toThrow(/palette\.bg must be a string/);
});
test('rejects non-number typeScale', () => {
  const d = structuredClone(valid);
  (d.design.typeScale as Record<string, unknown>).hero = '100';
  expect(() => validateDeck(d)).toThrow(/typeScale\.hero must be a number/);
});
test('rejects non-number radius', () => {
  const d = structuredClone(valid);
  (d.design as Record<string, unknown>).radius = '8';
  expect(() => validateDeck(d)).toThrow(/radius must be a number/);
});
test('rejects non-number space when present', () => {
  const d = structuredClone(valid);
  (d.design as Record<string, unknown>).space = 'x';
  expect(() => validateDeck(d)).toThrow(/space must be a number/);
});
test('rejects non-string shadow when present', () => {
  const d = structuredClone(valid);
  (d.design as Record<string, unknown>).shadow = 123;
  expect(() => validateDeck(d)).toThrow(/shadow must be a string/);
});
test('rejects a block with missing props', () => {
  const d = structuredClone(valid);
  delete (d.slides[0].slots.title[0] as Record<string, unknown>).props;
  expect(() => validateDeck(d)).toThrow(/props must be an object/);
});
