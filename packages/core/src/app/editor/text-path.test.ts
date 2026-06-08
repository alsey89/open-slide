import { describe, expect, it } from 'vitest';
import type { Block } from '../../doc/model.ts';
import { buildTextUpdateOp, getTextAtPath } from './text-path.ts';

const block = (props: Record<string, unknown>): Block => ({ id: 'b1', type: 'x', props });

describe('getTextAtPath', () => {
  it('resolves a top-level scalar', () => {
    expect(getTextAtPath({ title: 'Hi' }, 'title')).toBe('Hi');
  });
  it('resolves an array index', () => {
    expect(getTextAtPath({ items: ['a', 'b', 'c'] }, 'items.1')).toBe('b');
  });
  it('resolves a nested object field', () => {
    expect(getTextAtPath({ figure: { value: '10x', label: 'faster' } }, 'figure.value')).toBe(
      '10x',
    );
  });
  it('resolves an array-of-objects field', () => {
    expect(getTextAtPath({ steps: [{ title: 'A' }, { title: 'B' }] }, 'steps.1.title')).toBe('B');
  });
  it('coerces non-strings to strings', () => {
    expect(getTextAtPath({ n: 42 }, 'n')).toBe('42');
  });
  it('returns empty string for a missing path', () => {
    expect(getTextAtPath({}, 'nope')).toBe('');
    expect(getTextAtPath({ a: null }, 'a.b')).toBe('');
  });
});

describe('buildTextUpdateOp', () => {
  it('builds a flat update for a scalar path', () => {
    expect(buildTextUpdateOp(block({ title: 'Hi' }), 'title', 'Bye')).toEqual({
      kind: 'update-block-props',
      blockId: 'b1',
      props: { title: 'Bye' },
    });
  });
  it('builds an array update preserving siblings', () => {
    expect(buildTextUpdateOp(block({ items: ['a', 'b', 'c'] }), 'items.1', 'B')).toEqual({
      kind: 'update-block-props',
      blockId: 'b1',
      props: { items: ['a', 'B', 'c'] },
    });
  });
  it('builds a nested-object update preserving siblings', () => {
    expect(
      buildTextUpdateOp(block({ figure: { value: '1', label: 'x' } }), 'figure.value', '2'),
    ).toEqual({
      kind: 'update-block-props',
      blockId: 'b1',
      props: { figure: { value: '2', label: 'x' } },
    });
  });
  it('builds an array-of-objects update preserving siblings', () => {
    expect(
      buildTextUpdateOp(
        block({
          steps: [
            { title: 'A', desc: 'd' },
            { title: 'B', desc: 'e' },
          ],
        }),
        'steps.1.title',
        'BB',
      ),
    ).toEqual({
      kind: 'update-block-props',
      blockId: 'b1',
      props: {
        steps: [
          { title: 'A', desc: 'd' },
          { title: 'BB', desc: 'e' },
        ],
      },
    });
  });
  it('does not mutate the input block props', () => {
    const props = { steps: [{ title: 'A' }] };
    buildTextUpdateOp(block(props), 'steps.0.title', 'Z');
    expect(props.steps[0].title).toBe('A');
  });
  it('throws when the path cannot be resolved', () => {
    expect(() => buildTextUpdateOp(block({ title: 'Hi' }), 'title.deep', 'x')).toThrow();
    expect(() => buildTextUpdateOp(block({ figure: null }), 'figure.value', 'x')).toThrow();
  });
});
