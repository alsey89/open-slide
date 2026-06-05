import { expect, test } from 'vitest';
import { applyOpsToJson } from './deck.ts';

const RAW = JSON.stringify({
  schemaVersion: 1,
  meta: { title: 'A', createdAt: '2026-06-05T12:00:00Z' },
  design: {
    palette: { bg: '#fff', text: '#000', accent: '#f00' },
    fonts: { display: 'a', body: 'b' },
    typeScale: { hero: 100, body: 30 },
    radius: 8,
  },
  slides: [{ id: 's1', layout: 'title', slots: {} }],
});

test('applies ops to raw deck json and returns updated json', () => {
  const out = applyOpsToJson(RAW, [{ kind: 'set-deck-title', title: 'B' }]);
  expect(JSON.parse(out).meta.title).toBe('B');
});

test('invalid ops throw', () => {
  expect(() => applyOpsToJson(RAW, [{ kind: 'remove-slide', slideId: 'nope' }])).toThrow();
});
