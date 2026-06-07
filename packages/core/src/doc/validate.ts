import { type Deck, SCHEMA_VERSION } from './model.ts';

export class DeckValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeckValidationError';
  }
}

function fail(msg: string): never {
  throw new DeckValidationError(msg);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Every design field is optional; renderDeck fills gaps via normalizeDesign.
// We only validate the type of whatever IS present.
function validateStringFields(
  obj: Record<string, unknown>,
  keys: readonly string[],
  where: string,
): void {
  for (const k of keys) {
    if (obj[k] !== undefined && typeof obj[k] !== 'string') fail(`${where}.${k} must be a string`);
  }
}

function validateDesign(d: unknown, where: string): void {
  if (d === undefined) return;
  if (!isObject(d)) fail(`${where} must be an object`);

  if (d.palette !== undefined) {
    if (!isObject(d.palette)) fail(`${where}.palette must be an object`);
    validateStringFields(
      d.palette,
      ['bg', 'surface', 'text', 'muted', 'accent', 'border'],
      `${where}.palette`,
    );
  }

  if (d.fonts !== undefined) {
    if (!isObject(d.fonts)) fail(`${where}.fonts must be an object`);
    validateStringFields(d.fonts, ['display', 'body'], `${where}.fonts`);
  }

  if (d.typeScale !== undefined) {
    if (!isObject(d.typeScale)) fail(`${where}.typeScale must be an object`);
    for (const k of ['hero', 'heading', 'body', 'caption']) {
      if (d.typeScale[k] !== undefined && typeof d.typeScale[k] !== 'number')
        fail(`${where}.typeScale.${k} must be a number`);
    }
  }

  if (d.space !== undefined && typeof d.space !== 'number') fail(`${where}.space must be a number`);
  if (d.radius !== undefined && typeof d.radius !== 'number')
    fail(`${where}.radius must be a number`);
  if (d.shadow !== undefined && typeof d.shadow !== 'string')
    fail(`${where}.shadow must be a string`);
}

export function validateDeck(input: unknown): Deck {
  if (!isObject(input)) fail('deck must be an object');
  if (input.schemaVersion !== SCHEMA_VERSION)
    fail(
      `unsupported schemaVersion: expected ${SCHEMA_VERSION}, got ${JSON.stringify(input.schemaVersion)}`,
    );
  if (!isObject(input.meta)) fail('deck.meta must be an object');
  if (typeof input.meta.createdAt !== 'string' || Number.isNaN(Date.parse(input.meta.createdAt)))
    fail('deck.meta.createdAt must be an ISO 8601 date string');
  validateDesign(input.design, 'deck.design');
  if (!Array.isArray(input.slides) || input.slides.length === 0)
    fail('deck.slides must be a non-empty array');

  const ids = new Set<string>();
  const claim = (id: unknown, where: string): void => {
    if (typeof id !== 'string' || id.length === 0) fail(`${where} must have a non-empty string id`);
    if (ids.has(id)) fail(`duplicate id "${id}"`);
    ids.add(id);
  };

  input.slides.forEach((slide, i) => {
    if (!isObject(slide)) fail(`slides[${i}] must be an object`);
    claim(slide.id, `slides[${i}]`);
    if (typeof slide.layout !== 'string' || slide.layout.length === 0)
      fail(`slides[${i}].layout must be a non-empty string`);
    if (!isObject(slide.slots)) fail(`slides[${i}].slots must be an object`);
    for (const [name, blocks] of Object.entries(slide.slots)) {
      if (!Array.isArray(blocks)) fail(`slides[${i}].slots.${name} must be an array`);
      blocks.forEach((block, j) => {
        const at = `slides[${i}].slots.${name}[${j}]`;
        if (!isObject(block)) fail(`${at} must be an object`);
        claim(block.id, at);
        if (typeof block.type !== 'string' || block.type.length === 0)
          fail(`${at}.type must be a non-empty string`);
        if (!isObject(block.props)) fail(`${at}.props must be an object`);
      });
    }
    if (slide.notes !== undefined && typeof slide.notes !== 'string')
      fail(`slides[${i}].notes must be a string`);
  });

  return input as Deck;
}
