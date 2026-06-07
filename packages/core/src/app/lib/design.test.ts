import { describe, expect, test } from 'vitest';
import { defaultDesign, designToCssVars, normalizeDesign } from './design.ts';

const ALL_VARS = [
  '--osd-bg',
  '--osd-surface',
  '--osd-text',
  '--osd-muted',
  '--osd-accent',
  '--osd-border',
  '--osd-font-display',
  '--osd-font-body',
  '--osd-size-hero',
  '--osd-size-heading',
  '--osd-size-body',
  '--osd-size-caption',
  '--osd-space',
  '--osd-radius',
  '--osd-shadow',
];

describe('normalizeDesign', () => {
  test('empty input yields the full default design', () => {
    expect(normalizeDesign({})).toEqual(defaultDesign);
  });

  test('undefined input yields the full default design', () => {
    expect(normalizeDesign(undefined)).toEqual(defaultDesign);
  });

  test('a partial palette keeps provided keys and fills the rest', () => {
    const d = normalizeDesign({ palette: { accent: '#ff0000' } });
    expect(d.palette.accent).toBe('#ff0000');
    expect(d.palette.bg).toBe(defaultDesign.palette.bg);
    expect(d.palette.surface).toBe(defaultDesign.palette.surface);
    expect(d.palette.muted).toBe(defaultDesign.palette.muted);
    expect(d.palette.border).toBe(defaultDesign.palette.border);
    expect(d.typeScale).toEqual(defaultDesign.typeScale);
    expect(d.shadow).toBe(defaultDesign.shadow);
    expect(d.space).toBe(defaultDesign.space);
  });

  test('a partial typeScale fills missing steps', () => {
    const d = normalizeDesign({ typeScale: { hero: 200 } });
    expect(d.typeScale.hero).toBe(200);
    expect(d.typeScale.heading).toBe(defaultDesign.typeScale.heading);
    expect(d.typeScale.body).toBe(defaultDesign.typeScale.body);
    expect(d.typeScale.caption).toBe(defaultDesign.typeScale.caption);
  });
});

describe('designToCssVars', () => {
  test('emits all 15 tokens', () => {
    const vars = designToCssVars(defaultDesign);
    for (const key of ALL_VARS) {
      expect(vars[key], `missing ${key}`).toBeDefined();
    }
    expect(Object.keys(vars)).toHaveLength(ALL_VARS.length);
  });

  test('numeric tokens are emitted as px, shadow as raw string', () => {
    const vars = designToCssVars(defaultDesign);
    expect(vars['--osd-size-heading']).toBe(`${defaultDesign.typeScale.heading}px`);
    expect(vars['--osd-space']).toBe(`${defaultDesign.space}px`);
    expect(vars['--osd-shadow']).toBe(defaultDesign.shadow);
  });
});
