import {
  Bullets,
  Callout,
  Code,
  Divider,
  Heading,
  ImageBlock,
  Quote,
  Stat,
  Text,
} from './blocks/index.ts';
import {
  Blank,
  FullBleed,
  Grid,
  LAYOUT_SLOTS,
  MediaText,
  Section,
  Title,
  TitleBody,
  TwoCol,
} from './layouts/index.ts';
import { type BlockPropSchema, registerBlock, registerLayout } from './registry.ts';

const SCHEMAS: Record<string, BlockPropSchema> = {
  heading: [{ key: 'text', type: 'textarea', label: 'Text' }],
  text: [{ key: 'text', type: 'textarea', label: 'Text' }],
  bullets: [{ key: 'items', type: 'string-list', label: 'Items' }],
  image: [
    { key: 'src', type: 'text', label: 'Source', placeholder: 'https://… or /assets/…' },
    { key: 'alt', type: 'text', label: 'Alt text' },
    { key: 'fit', type: 'select', label: 'Fit', options: ['cover', 'contain'] },
  ],
  quote: [
    { key: 'text', type: 'textarea', label: 'Quote' },
    { key: 'attribution', type: 'text', label: 'Attribution' },
  ],
  code: [
    { key: 'code', type: 'textarea', label: 'Code' },
    { key: 'lang', type: 'text', label: 'Language', placeholder: 'e.g. ts' },
  ],
  stat: [
    { key: 'value', type: 'text', label: 'Value', placeholder: 'e.g. 98%' },
    { key: 'label', type: 'text', label: 'Label' },
    { key: 'caption', type: 'text', label: 'Caption' },
  ],
  callout: [
    { key: 'text', type: 'text', label: 'Text' },
    { key: 'variant', type: 'select', label: 'Variant', options: ['accent', 'surface', 'outline'] },
  ],
  divider: [],
};

export function registerBuiltins(): void {
  registerBlock('heading', Heading, SCHEMAS.heading);
  registerBlock('text', Text, SCHEMAS.text);
  registerBlock('bullets', Bullets, SCHEMAS.bullets);
  registerBlock('image', ImageBlock, SCHEMAS.image);
  registerBlock('quote', Quote, SCHEMAS.quote);
  registerBlock('code', Code, SCHEMAS.code);
  registerBlock('stat', Stat, SCHEMAS.stat);
  registerBlock('callout', Callout, SCHEMAS.callout);
  registerBlock('divider', Divider, SCHEMAS.divider);

  registerLayout('title', Title, LAYOUT_SLOTS.title);
  registerLayout('title-body', TitleBody, LAYOUT_SLOTS['title-body']);
  registerLayout('two-col', TwoCol, LAYOUT_SLOTS['two-col']);
  registerLayout('media-text', MediaText, LAYOUT_SLOTS['media-text']);
  registerLayout('section', Section, LAYOUT_SLOTS.section);
  registerLayout('full-bleed', FullBleed, LAYOUT_SLOTS['full-bleed']);
  registerLayout('grid', Grid, LAYOUT_SLOTS.grid);
  registerLayout('blank', Blank, LAYOUT_SLOTS.blank);
}
