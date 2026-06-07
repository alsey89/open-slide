import { describe, expect, it } from 'vitest';
import { generateThemesModule, parseThemeFile } from './themes-plugin.ts';

describe('parseThemeFile', () => {
  it('reads id/name/description/design from json', () => {
    const t = parseThemeFile(
      'midnight',
      JSON.stringify({ name: 'Midnight', description: 'Dark', design: { palette: { bg: '#000' } } }),
    );
    expect(t).toEqual({
      id: 'midnight',
      name: 'Midnight',
      description: 'Dark',
      design: { palette: { bg: '#000' } },
    });
  });

  it('falls back name to id and design to empty', () => {
    const t = parseThemeFile('x', JSON.stringify({}));
    expect(t).toEqual({ id: 'x', name: 'x', description: '', design: {} });
  });

  it('tolerates malformed json', () => {
    const t = parseThemeFile('x', 'not json');
    expect(t).toEqual({ id: 'x', name: 'x', description: '', design: {} });
  });
});

describe('generateThemesModule', () => {
  it('emits a themes array with design and no demo loader', () => {
    const code = generateThemesModule([
      { id: 'midnight', name: 'Midnight', description: 'Dark', design: { palette: { bg: '#000' } } },
    ]);
    expect(code).toContain('export const themes =');
    expect(code).toContain('"midnight"');
    expect(code).toContain('"#000"');
    expect(code).not.toContain('loadThemeDemo');
  });
});
