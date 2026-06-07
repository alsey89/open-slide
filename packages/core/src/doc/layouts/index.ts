export { Blank } from './blank.tsx';
export { FullBleed } from './full-bleed.tsx';
export { Grid } from './grid.tsx';
export { MediaText } from './media-text.tsx';
export { MissingLayout } from './missing.tsx';
export { Section } from './section.tsx';
export { Title } from './title.tsx';
export { TitleBody } from './title-body.tsx';
export { TwoCol } from './two-col.tsx';

export const LAYOUT_SLOTS: Record<string, string[]> = {
  title: ['title', 'subtitle'],
  'title-body': ['title', 'body'],
  'two-col': ['title', 'left', 'right'],
  'media-text': ['title', 'media', 'body'],
  section: ['eyebrow', 'title'],
  'full-bleed': ['media', 'content'],
  grid: ['title', 'items'],
  blank: ['content'],
};
