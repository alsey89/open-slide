import { describe, expect, it } from 'vitest';
import { cloneBlockWithFreshId, cloneSlideWithFreshIds, freshId } from './ids.ts';
import type { Block, Slide } from './model.ts';

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

  it('clones all slots and leaves the original unmutated', () => {
    const slide: Slide = {
      id: 's1',
      layout: 'two-col',
      slots: {
        left: [{ id: 'b1', type: 'text', props: { text: 'L' } }],
        right: [{ id: 'b2', type: 'text', props: { text: 'R' } }],
      },
    };
    const clone = cloneSlideWithFreshIds(slide);
    expect(clone.slots.left[0].id).not.toBe('b1');
    expect(clone.slots.right[0].id).not.toBe('b2');
    expect(slide.id).toBe('s1');
    expect(slide.slots.left[0].id).toBe('b1');
    expect(slide.slots.right[0].id).toBe('b2');
  });
});

describe('cloneBlockWithFreshId', () => {
  it('gives the block a new id while preserving type and props', () => {
    const block: Block = { id: 'b1', type: 'heading', props: { text: 'Hi' } };
    const clone = cloneBlockWithFreshId(block);
    expect(clone.id).not.toBe('b1');
    expect(clone.id.startsWith('b-')).toBe(true);
    expect(clone.type).toBe('heading');
    expect(clone.props).toEqual({ text: 'Hi' });
    expect(clone.props).not.toBe(block.props);
  });
});
