import { Bullets, Code, Heading, ImageBlock, Quote, Text } from './blocks/index.ts';
import { LAYOUT_SLOTS, MediaText, Section, Title, TitleBody, TwoCol } from './layouts/index.ts';
import { registerBlock, registerLayout } from './registry.ts';

export function registerBuiltins(): void {
  registerBlock('heading', Heading);
  registerBlock('text', Text);
  registerBlock('bullets', Bullets);
  registerBlock('image', ImageBlock);
  registerBlock('quote', Quote);
  registerBlock('code', Code);

  registerLayout('title', Title, LAYOUT_SLOTS.title);
  registerLayout('title-body', TitleBody, LAYOUT_SLOTS['title-body']);
  registerLayout('two-col', TwoCol, LAYOUT_SLOTS['two-col']);
  registerLayout('media-text', MediaText, LAYOUT_SLOTS['media-text']);
  registerLayout('section', Section, LAYOUT_SLOTS.section);
}
