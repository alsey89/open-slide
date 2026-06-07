import { describe, expect, it } from 'vitest';
import { defaultDesign } from './design.ts';
import type { Deck } from './model.ts';
import { applyOp } from './ops.ts';
import { addSlideFromLayout, buildSlide } from './scaffold.ts';

describe('buildSlide', () => {
  it('creates an empty array for each declared slot', () => {
    const slide = buildSlide('two-col', ['title', 'left', 'right'], 's-test');
    expect(slide.id).toBe('s-test');
    expect(slide.layout).toBe('two-col');
    expect(slide.slots).toEqual({ title: [], left: [], right: [] });
  });

  it('produces an empty slots object when given no slots', () => {
    const slide = buildSlide('blank', []);
    expect(slide.slots).toEqual({});
    expect(slide.layout).toBe('blank');
  });

  it('generates a fresh id when none is given', () => {
    const a = buildSlide('blank', ['content']);
    const b = buildSlide('blank', ['content']);
    expect(a.id).not.toBe(b.id);
    expect(a.id.startsWith('s-')).toBe(true);
  });
});

describe('addSlideFromLayout', () => {
  it('returns an add-slide op that validates when applied', () => {
    const deck: Deck = {
      schemaVersion: 1,
      meta: { createdAt: '2026-01-01T00:00:00.000Z' },
      design: defaultDesign,
      slides: [{ id: 's1', layout: 'blank', slots: { content: [] } }],
    };
    const op = addSlideFromLayout({
      layout: 'title',
      slots: ['title', 'subtitle'],
      index: 1,
      id: 's2',
    });
    expect(op.kind).toBe('add-slide');
    const next = applyOp(deck, op);
    expect(next.slides).toHaveLength(2);
    expect(next.slides[1].id).toBe('s2');
    expect(next.slides[1].slots).toEqual({ title: [], subtitle: [] });
  });
});
