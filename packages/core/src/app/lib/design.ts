export type DesignPalette = {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
};

export type DesignFonts = {
  display: string;
  body: string;
};

export type DesignTypeScale = {
  hero: number;
  heading: number;
  body: number;
  caption: number;
};

export type DesignSystem = {
  palette: DesignPalette;
  fonts: DesignFonts;
  typeScale: DesignTypeScale;
  space: number;
  radius: number;
  shadow: string;
};

export function designToCssVars(d: DesignSystem): Record<string, string> {
  return {
    '--osd-bg': d.palette.bg,
    '--osd-surface': d.palette.surface,
    '--osd-text': d.palette.text,
    '--osd-muted': d.palette.muted,
    '--osd-accent': d.palette.accent,
    '--osd-border': d.palette.border,
    '--osd-font-display': d.fonts.display,
    '--osd-font-body': d.fonts.body,
    '--osd-size-hero': `${d.typeScale.hero}px`,
    '--osd-size-heading': `${d.typeScale.heading}px`,
    '--osd-size-body': `${d.typeScale.body}px`,
    '--osd-size-caption': `${d.typeScale.caption}px`,
    '--osd-space': `${d.space}px`,
    '--osd-radius': `${d.radius}px`,
    '--osd-shadow': d.shadow,
  };
}

export function cssVarsToString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
}

export const defaultDesign: DesignSystem = {
  palette: {
    bg: '#f7f5f0',
    surface: '#ffffff',
    text: '#1a1814',
    muted: '#6b6358',
    accent: '#6d4cff',
    border: '#e0d9cc',
  },
  fonts: {
    display: 'Georgia, "Times New Roman", serif',
    body: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
  },
  typeScale: {
    hero: 168,
    heading: 64,
    body: 36,
    caption: 20,
  },
  space: 8,
  radius: 12,
  shadow: '0 8px 24px rgba(0,0,0,0.12)',
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export function normalizeDesign(partial: DeepPartial<DesignSystem> | undefined): DesignSystem {
  const p = partial ?? {};
  return {
    palette: { ...defaultDesign.palette, ...p.palette },
    fonts: { ...defaultDesign.fonts, ...p.fonts },
    typeScale: { ...defaultDesign.typeScale, ...p.typeScale },
    space: p.space ?? defaultDesign.space,
    radius: p.radius ?? defaultDesign.radius,
    shadow: p.shadow ?? defaultDesign.shadow,
  };
}
