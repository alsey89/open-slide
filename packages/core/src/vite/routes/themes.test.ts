import { describe, expect, it } from 'vitest';
import { slugifyThemeName, themeFileBody } from './themes.ts';

describe('slugifyThemeName', () => {
  it('kebab-cases and strips junk', () => {
    expect(slugifyThemeName('Midnight Blue!')).toBe('midnight-blue');
  });
  it('falls back to "theme" when empty', () => {
    expect(slugifyThemeName('   ')).toBe('theme');
  });
  it('avoids collisions with a numeric suffix', () => {
    expect(slugifyThemeName('Midnight', new Set(['midnight']))).toBe('midnight-2');
  });
});

describe('themeFileBody', () => {
  it('writes name/description/design pretty JSON with trailing newline', () => {
    const body = themeFileBody('Midnight', 'Dark', { palette: { bg: '#000' } });
    expect(body.endsWith('\n')).toBe(true);
    expect(JSON.parse(body)).toEqual({
      name: 'Midnight',
      description: 'Dark',
      design: { palette: { bg: '#000' } },
    });
  });
});
