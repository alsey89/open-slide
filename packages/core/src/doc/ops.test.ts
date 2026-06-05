import { expect, test } from 'vitest';
import type { Deck } from './model.ts';
import { applyOp, applyOps, EditOpError } from './ops.ts';

function deck(): Deck {
  return {
    schemaVersion: 1,
    meta: { title: 'D', createdAt: '2026-06-05T12:00:00Z' },
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
      {
        id: 's2',
        layout: 'title-body',
        slots: { body: [{ id: 'b2', type: 'text', props: { text: 'x' } }] },
      },
    ],
  };
}

test('does not mutate the input deck', () => {
  const d = deck();
  applyOp(d, { kind: 'set-deck-title', title: 'New' });
  expect(d.meta.title).toBe('D');
});

test('set-deck-title', () => {
  expect(applyOp(deck(), { kind: 'set-deck-title', title: 'New' }).meta.title).toBe('New');
});

test('set-design replaces tokens', () => {
  const d2 = applyOp(deck(), { kind: 'set-design', design: { ...deck().design, radius: 20 } });
  expect(d2.design.radius).toBe(20);
});

test('add-slide inserts at index', () => {
  const d2 = applyOp(deck(), {
    kind: 'add-slide',
    index: 1,
    slide: { id: 's3', layout: 'title', slots: {} },
  });
  expect(d2.slides.map((s) => s.id)).toEqual(['s1', 's3', 's2']);
});

test('add-slide with duplicate id rejected by validation', () => {
  expect(() =>
    applyOp(deck(), {
      kind: 'add-slide',
      index: 0,
      slide: { id: 's1', layout: 'title', slots: {} },
    }),
  ).toThrow();
});

test('remove-slide', () => {
  expect(applyOp(deck(), { kind: 'remove-slide', slideId: 's1' }).slides.map((s) => s.id)).toEqual([
    's2',
  ]);
});

test('remove-slide unknown id throws EditOpError', () => {
  expect(() => applyOp(deck(), { kind: 'remove-slide', slideId: 'nope' })).toThrow(EditOpError);
});

test('move-slide', () => {
  expect(
    applyOp(deck(), { kind: 'move-slide', slideId: 's1', toIndex: 1 }).slides.map((s) => s.id),
  ).toEqual(['s2', 's1']);
});

test('set-slide-layout', () => {
  expect(
    applyOp(deck(), { kind: 'set-slide-layout', slideId: 's2', layout: 'two-col' }).slides[1]
      .layout,
  ).toBe('two-col');
});

test('set-slide-notes sets and clears', () => {
  expect(
    applyOp(deck(), { kind: 'set-slide-notes', slideId: 's1', notes: 'hello' }).slides[0].notes,
  ).toBe('hello');
  const cleared = applyOp(
    applyOp(deck(), { kind: 'set-slide-notes', slideId: 's1', notes: 'hello' }),
    { kind: 'set-slide-notes', slideId: 's1' },
  );
  expect(cleared.slides[0].notes).toBeUndefined();
});

test('set-slot-blocks', () => {
  const d2 = applyOp(deck(), {
    kind: 'set-slot-blocks',
    slideId: 's1',
    slot: 'title',
    blocks: [{ id: 'nb', type: 'heading', props: { text: 'Yo' } }],
  });
  expect(d2.slides[0].slots.title.map((b) => b.id)).toEqual(['nb']);
});

test('add-block inserts into a slot', () => {
  const d2 = applyOp(deck(), {
    kind: 'add-block',
    slideId: 's2',
    slot: 'body',
    index: 0,
    block: { id: 'b3', type: 'text', props: { text: 'first' } },
  });
  expect(d2.slides[1].slots.body.map((b) => b.id)).toEqual(['b3', 'b2']);
});

test('remove-block by id (searches all slides/slots)', () => {
  const d2 = applyOp(deck(), { kind: 'remove-block', blockId: 'b2' });
  expect(d2.slides[1].slots.body).toEqual([]);
});

test('remove-block unknown id throws', () => {
  expect(() => applyOp(deck(), { kind: 'remove-block', blockId: 'nope' })).toThrow(EditOpError);
});

test('update-block-props merges', () => {
  const d2 = applyOp(deck(), {
    kind: 'update-block-props',
    blockId: 'b1',
    props: { text: 'Bye', sub: 1 },
  });
  const b = d2.slides[0].slots.title[0];
  expect(b.props).toEqual({ text: 'Bye', sub: 1 });
});

test('applyOps runs in sequence', () => {
  const d2 = applyOps(deck(), [
    { kind: 'set-deck-title', title: 'Seq' },
    { kind: 'add-slide', index: 2, slide: { id: 's3', layout: 'title', slots: {} } },
  ]);
  expect(d2.meta.title).toBe('Seq');
  expect(d2.slides).toHaveLength(3);
});
