import { describe, expect, it } from 'vitest';
import { cloneSlideWithFreshIds, freshId } from './ids.ts';
import type { Slide } from './model.ts';

describe('freshId', () => {
  it('prefixes and is unique', () => {
    const a = freshId('b');
    const b = freshId('b');
    expect(a.startsWith('b-')).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe('cloneSlideWithFreshIds', () => {
  it('gives the slide and every block new ids while preserving content', () => {
    const slide: Slide = {
      id: 's1',
      layout: 'title-body',
      slots: { title: [{ id: 'b1', type: 'heading', props: { text: 'Hi' } }] },
    };
    const clone = cloneSlideWithFreshIds(slide);
    expect(clone.id).not.toBe('s1');
    expect(clone.slots.title[0].id).not.toBe('b1');
    expect(clone.slots.title[0].props).toEqual({ text: 'Hi' });
    expect(clone.layout).toBe('title-body');
  });
});
