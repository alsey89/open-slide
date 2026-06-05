# Doc-Model M1a — Core Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the standalone, fully unit-tested document-model engine — types, validator, block/layout registry, built-in blocks + layouts, and a `renderDeck()` that turns a validated `Deck` into the existing `SlideModule` shape — with zero changes to the live app or the legacy TSX path.

**Architecture:** A new `packages/core/src/doc/` module. Pure data types + a hand-written validator (no new deps). A registry maps `type` strings → React components. Built-in blocks/layouts are React components styled with the existing `--osd-*` CSS vars. `renderDeck(deck)` maps each `Slide` to a zero-prop `Page` component and returns a `SlideModule` (`default`, `meta`, `design`, `notes`) — the exact contract the existing runtime already consumes. Wiring this engine into the Vite plugin and removing the TSX path is **M1b** (separate plan).

**Tech Stack:** TypeScript, React 18, vitest (root config: `packages/**/*.test.ts(x)`, node env), `react-dom/server` `renderToStaticMarkup` for DOM-free render assertions.

---

## File structure

All new, under `packages/core/src/doc/`:

- `model.ts` — `Deck`/`Slide`/`Block`/`DeckMeta` types + `SCHEMA_VERSION`.
- `validate.ts` — `validateDeck(input): Deck`, `DeckValidationError`.
- `registry.ts` — `registerBlock`/`registerLayout`/`getBlock`/`getLayout`/`resetRegistry`.
- `fit.ts` — `computeFitScale()` pure helper (overflow auto-fit math).
- `fit-to-slot.tsx` — `<FitToSlot>` component wrapping `computeFitScale` with a `ResizeObserver` (auto-fit at render time).
- `blocks/` — `heading.tsx`, `text.tsx`, `bullets.tsx`, `image.tsx`, `quote.tsx`, `code.tsx`, `unknown.tsx`, `index.ts`.
- `layouts/` — `title.tsx`, `title-body.tsx`, `two-col.tsx`, `media-text.tsx`, `section.tsx`, `missing.tsx`, `index.ts`.
- `builtins.ts` — registers all built-in blocks + layouts (idempotent).
- `render.tsx` — `renderDeck(deck): SlideModule`.
- Tests live next to sources as `*.test.ts(x)`.

Test command (from repo root): `pnpm test` (runs `vitest run`). Single file: `pnpm exec vitest run <path>`.

---

### Task 1: Document model types

**Files:**
- Create: `packages/core/src/doc/model.ts`
- Test: `packages/core/src/doc/model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/doc/model.test.ts
import { expect, test } from 'vitest';
import { SCHEMA_VERSION } from './model.ts';

test('schema version is 1', () => {
  expect(SCHEMA_VERSION).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/core/src/doc/model.test.ts`
Expected: FAIL — cannot find module `./model.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/doc/model.ts
import type { DesignSystem } from '../app/lib/design.ts';
import type { SlideTransition } from '../app/lib/transition.ts';

export const SCHEMA_VERSION = 1 as const;

export type DeckMeta = {
  title?: string;
  /** ISO 8601 string literal. Used to sort the slide list. */
  createdAt: string;
  /** Optional NAMED theme reference for the browser grouping UI. NOT the tokens. */
  theme?: string;
};

export type Block = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

export type Slide = {
  id: string;
  layout: string;
  slots: Record<string, Block[]>;
  notes?: string;
  transition?: SlideTransition;
};

export type Deck = {
  schemaVersion: typeof SCHEMA_VERSION;
  meta: DeckMeta;
  design: DesignSystem;
  slides: Slide[];
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/core/src/doc/model.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/doc/model.ts packages/core/src/doc/model.test.ts
git commit -m "feat(core): add document-model types"
```

---

### Task 2: Deck validator

**Files:**
- Create: `packages/core/src/doc/validate.ts`
- Test: `packages/core/src/doc/validate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/doc/validate.test.ts
import { describe, expect, test } from 'vitest';
import { DeckValidationError, validateDeck } from './validate.ts';

const valid = {
  schemaVersion: 1,
  meta: { title: 'T', createdAt: '2026-06-05T12:00:00Z' },
  design: { palette: { bg: '#fff', text: '#000', accent: '#f00' }, fonts: { display: 'a', body: 'b' }, typeScale: { hero: 100, body: 30 }, radius: 8 },
  slides: [
    { id: 's1', layout: 'title', slots: { title: [{ id: 'b1', type: 'heading', props: { text: 'Hi' } }] } },
  ],
};

test('accepts a valid deck and returns it', () => {
  expect(validateDeck(structuredClone(valid)).slides[0].id).toBe('s1');
});

describe('rejections', () => {
  test('wrong schemaVersion', () => {
    expect(() => validateDeck({ ...structuredClone(valid), schemaVersion: 2 })).toThrow(DeckValidationError);
  });
  test('missing createdAt', () => {
    const d = structuredClone(valid); delete (d.meta as Record<string, unknown>).createdAt;
    expect(() => validateDeck(d)).toThrow(/createdAt/);
  });
  test('empty slides', () => {
    expect(() => validateDeck({ ...structuredClone(valid), slides: [] })).toThrow(/non-empty/);
  });
  test('duplicate ids', () => {
    const d = structuredClone(valid);
    d.slides[0].slots.title[0].id = 's1';
    expect(() => validateDeck(d)).toThrow(/duplicate id "s1"/);
  });
  test('block missing type', () => {
    const d = structuredClone(valid);
    delete (d.slides[0].slots.title[0] as Record<string, unknown>).type;
    expect(() => validateDeck(d)).toThrow(/\.type must be a non-empty string/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/core/src/doc/validate.test.ts`
Expected: FAIL — cannot find module `./validate.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/doc/validate.ts
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

export function validateDeck(input: unknown): Deck {
  if (!isObject(input)) fail('deck must be an object');
  if (input.schemaVersion !== SCHEMA_VERSION)
    fail(`unsupported schemaVersion: expected ${SCHEMA_VERSION}, got ${JSON.stringify(input.schemaVersion)}`);
  if (!isObject(input.meta)) fail('deck.meta must be an object');
  if (typeof input.meta.createdAt !== 'string' || Number.isNaN(Date.parse(input.meta.createdAt)))
    fail('deck.meta.createdAt must be an ISO 8601 date string');
  if (!isObject(input.design)) fail('deck.design must be an object');
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
        if (block.props !== undefined && !isObject(block.props)) fail(`${at}.props must be an object`);
      });
    }
    if (slide.notes !== undefined && typeof slide.notes !== 'string')
      fail(`slides[${i}].notes must be a string`);
  });

  return input as Deck;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/core/src/doc/validate.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/doc/validate.ts packages/core/src/doc/validate.test.ts
git commit -m "feat(core): add hand-written deck validator with id-uniqueness"
```

---

### Task 3: Block/layout registry

**Files:**
- Create: `packages/core/src/doc/registry.ts`
- Test: `packages/core/src/doc/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/doc/registry.test.ts
import { beforeEach, expect, test } from 'vitest';
import { getBlock, getLayout, registerBlock, registerLayout, resetRegistry } from './registry.ts';

beforeEach(() => resetRegistry());

test('registers and resolves a block', () => {
  const C = () => null;
  registerBlock('heading', C);
  expect(getBlock('heading')).toBe(C);
  expect(getBlock('missing')).toBeUndefined();
});

test('registers a layout with its slot names', () => {
  const L = () => null;
  registerLayout('two-col', L, ['title', 'left', 'right']);
  expect(getLayout('two-col')?.slots).toEqual(['title', 'left', 'right']);
});

test('resetRegistry clears entries', () => {
  registerBlock('x', () => null);
  resetRegistry();
  expect(getBlock('x')).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/core/src/doc/registry.test.ts`
Expected: FAIL — cannot find module `./registry.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/doc/registry.ts
import type { ComponentType, ReactNode } from 'react';
import type { Block, Slide } from './model.ts';

export type BlockComponent = ComponentType<{ block: Block }>;
export type LayoutComponent = ComponentType<{ slide: Slide; renderSlot: (name: string) => ReactNode }>;

const blocks = new Map<string, BlockComponent>();
const layouts = new Map<string, { component: LayoutComponent; slots: string[] }>();

export function registerBlock(type: string, component: BlockComponent): void {
  blocks.set(type, component);
}

export function registerLayout(type: string, component: LayoutComponent, slots: string[]): void {
  layouts.set(type, { component, slots });
}

export function getBlock(type: string): BlockComponent | undefined {
  return blocks.get(type);
}

export function getLayout(type: string): { component: LayoutComponent; slots: string[] } | undefined {
  return layouts.get(type);
}

export function resetRegistry(): void {
  blocks.clear();
  layouts.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/core/src/doc/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/doc/registry.ts packages/core/src/doc/registry.test.ts
git commit -m "feat(core): add block/layout registry"
```

---

### Task 4: Overflow auto-fit math (`computeFitScale`)

**Files:**
- Create: `packages/core/src/doc/fit.ts`
- Test: `packages/core/src/doc/fit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/doc/fit.test.ts
import { expect, test } from 'vitest';
import { computeFitScale } from './fit.ts';

test('no scaling when content fits', () => {
  expect(computeFitScale(800, 1000)).toBe(1);
  expect(computeFitScale(1000, 1000)).toBe(1);
});

test('scales down proportionally when content overflows', () => {
  expect(computeFitScale(2000, 1000)).toBeCloseTo(0.5);
});

test('never goes below the minimum', () => {
  expect(computeFitScale(10000, 1000, 0.5)).toBe(0.5);
});

test('degenerate sizes return 1', () => {
  expect(computeFitScale(0, 1000)).toBe(1);
  expect(computeFitScale(1000, 0)).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/core/src/doc/fit.test.ts`
Expected: FAIL — cannot find module `./fit.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/doc/fit.ts
/**
 * Scale factor to fit `content` px into `available` px. Returns 1 when it
 * already fits, otherwise shrinks proportionally but never below `min` —
 * below that the slot lets content overflow rather than become illegible.
 */
export function computeFitScale(content: number, available: number, min = 0.5): number {
  if (content <= 0 || available <= 0) return 1;
  if (content <= available) return 1;
  return Math.max(min, available / content);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/core/src/doc/fit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/doc/fit.ts packages/core/src/doc/fit.test.ts
git commit -m "feat(core): add computeFitScale overflow math"
```

---

### Task 5: `<FitToSlot>` component

**Files:**
- Create: `packages/core/src/doc/fit-to-slot.tsx`
- Test: `packages/core/src/doc/fit-to-slot.test.tsx`

Note: the `ResizeObserver`-driven scaling only runs in a browser; in the node test we assert it renders its children and applies the wrapper attributes (initial scale = 1).

- [ ] **Step 1: Write the failing test**

```tsx
// packages/core/src/doc/fit-to-slot.test.tsx
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { FitToSlot } from './fit-to-slot.tsx';

test('renders children and a fit wrapper', () => {
  const html = renderToStaticMarkup(createElement(FitToSlot, null, 'hello'));
  expect(html).toContain('hello');
  expect(html).toContain('data-osd-fit');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/core/src/doc/fit-to-slot.test.tsx`
Expected: FAIL — cannot find module `./fit-to-slot.tsx`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// packages/core/src/doc/fit-to-slot.tsx
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { computeFitScale } from './fit.ts';

export function FitToSlot({ children, min = 0.5 }: { children: ReactNode; min?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      // Measure natural height at scale 1, then fit to the slot's box.
      const contentH = i.scrollHeight;
      const availH = o.clientHeight;
      setScale(computeFitScale(contentH, availH, min));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    measure();
    return () => ro.disconnect();
  }, [min]);

  return (
    <div ref={outer} data-osd-fit style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={inner} style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: `${100 / scale}%` }}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/core/src/doc/fit-to-slot.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/doc/fit-to-slot.tsx packages/core/src/doc/fit-to-slot.test.tsx
git commit -m "feat(core): add FitToSlot auto-fit wrapper"
```

---

### Task 6: Content blocks + unknown-block fallback

**Files:**
- Create: `packages/core/src/doc/blocks/heading.tsx`, `text.tsx`, `bullets.tsx`, `image.tsx`, `quote.tsx`, `code.tsx`, `unknown.tsx`, `index.ts`
- Test: `packages/core/src/doc/blocks/blocks.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/core/src/doc/blocks/blocks.test.tsx
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { Block } from '../model.ts';
import { Bullets } from './bullets.tsx';
import { Code } from './code.tsx';
import { Heading } from './heading.tsx';
import { ImageBlock } from './image.tsx';
import { Quote } from './quote.tsx';
import { Text } from './text.tsx';
import { UnknownBlock } from './unknown.tsx';

const b = (props: Record<string, unknown>): { block: Block } => ({ block: { id: 'x', type: 't', props } });

test('heading renders its text', () => {
  expect(renderToStaticMarkup(createElement(Heading, b({ text: 'Title' })))).toContain('Title');
});
test('text renders its text', () => {
  expect(renderToStaticMarkup(createElement(Text, b({ text: 'Body copy' })))).toContain('Body copy');
});
test('bullets renders each item as <li>', () => {
  const html = renderToStaticMarkup(createElement(Bullets, b({ items: ['a', 'b'] })));
  expect(html).toContain('<li');
  expect(html).toContain('a');
  expect(html).toContain('b');
});
test('image renders src and alt', () => {
  const html = renderToStaticMarkup(createElement(ImageBlock, b({ src: '/x.png', alt: 'pic' })));
  expect(html).toContain('/x.png');
  expect(html).toContain('pic');
});
test('quote renders text and attribution', () => {
  const html = renderToStaticMarkup(createElement(Quote, b({ text: 'Q', attribution: 'A' })));
  expect(html).toContain('Q');
  expect(html).toContain('A');
});
test('code renders the code', () => {
  expect(renderToStaticMarkup(createElement(Code, b({ code: 'x=1' })))).toContain('x=1');
});
test('unknown block names the missing type', () => {
  expect(renderToStaticMarkup(createElement(UnknownBlock, { type: 'chart' }))).toContain('chart');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/core/src/doc/blocks/blocks.test.tsx`
Expected: FAIL — cannot find the block modules.

- [ ] **Step 3: Write minimal implementation**

```tsx
// packages/core/src/doc/blocks/heading.tsx
import type { Block } from '../model.ts';

export function Heading({ block }: { block: Block }) {
  const text = String(block.props.text ?? '');
  return (
    <h2 style={{ fontFamily: 'var(--osd-font-display)', fontSize: 'var(--osd-size-hero)', color: 'var(--osd-text)', fontWeight: 800, lineHeight: 1.1, margin: 0 }}>
      {text}
    </h2>
  );
}
```

```tsx
// packages/core/src/doc/blocks/text.tsx
import type { Block } from '../model.ts';

export function Text({ block }: { block: Block }) {
  return (
    <p style={{ fontFamily: 'var(--osd-font-body)', fontSize: 'var(--osd-size-body)', color: 'var(--osd-text)', lineHeight: 1.6, margin: 0 }}>
      {String(block.props.text ?? '')}
    </p>
  );
}
```

```tsx
// packages/core/src/doc/blocks/bullets.tsx
import type { Block } from '../model.ts';

export function Bullets({ block }: { block: Block }) {
  const items = Array.isArray(block.props.items) ? (block.props.items as unknown[]) : [];
  return (
    <ul style={{ fontFamily: 'var(--osd-font-body)', fontSize: 'var(--osd-size-body)', color: 'var(--osd-text)', lineHeight: 1.5, margin: 0, paddingLeft: '1.2em', display: 'grid', gap: 24 }}>
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: bullet order is the identity
        <li key={i}>{String(item)}</li>
      ))}
    </ul>
  );
}
```

```tsx
// packages/core/src/doc/blocks/image.tsx
import type { Block } from '../model.ts';

export function ImageBlock({ block }: { block: Block }) {
  const src = String(block.props.src ?? '');
  const alt = String(block.props.alt ?? '');
  const fit = block.props.fit === 'contain' ? 'contain' : 'cover';
  return (
    <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: fit, borderRadius: 'var(--osd-radius)', display: 'block' }} />
  );
}
```

```tsx
// packages/core/src/doc/blocks/quote.tsx
import type { Block } from '../model.ts';

export function Quote({ block }: { block: Block }) {
  const text = String(block.props.text ?? '');
  const attribution = block.props.attribution ? String(block.props.attribution) : null;
  return (
    <figure style={{ margin: 0, display: 'grid', gap: 24 }}>
      <blockquote style={{ fontFamily: 'var(--osd-font-display)', fontSize: 'calc(var(--osd-size-body) * 1.6)', color: 'var(--osd-text)', lineHeight: 1.3, margin: 0 }}>
        “{text}”
      </blockquote>
      {attribution && (
        <figcaption style={{ fontFamily: 'var(--osd-font-body)', fontSize: 'var(--osd-size-body)', color: 'var(--osd-accent)' }}>
          — {attribution}
        </figcaption>
      )}
    </figure>
  );
}
```

```tsx
// packages/core/src/doc/blocks/code.tsx
import type { Block } from '../model.ts';

export function Code({ block }: { block: Block }) {
  return (
    <pre style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 'calc(var(--osd-size-body) * 0.8)', color: 'var(--osd-text)', background: 'color-mix(in oklab, var(--osd-text) 6%, transparent)', borderRadius: 'var(--osd-radius)', padding: 32, margin: 0, overflow: 'hidden', lineHeight: 1.5 }}>
      <code>{String(block.props.code ?? '')}</code>
    </pre>
  );
}
```

```tsx
// packages/core/src/doc/blocks/unknown.tsx
export function UnknownBlock({ type }: { type: string }) {
  return (
    <div style={{ border: '2px dashed var(--osd-accent)', borderRadius: 'var(--osd-radius)', padding: 24, color: 'var(--osd-accent)', fontFamily: 'var(--osd-font-body)', fontSize: 'calc(var(--osd-size-body) * 0.8)' }}>
      unknown block: {type}
    </div>
  );
}
```

```ts
// packages/core/src/doc/blocks/index.ts
export { Bullets } from './bullets.tsx';
export { Code } from './code.tsx';
export { Heading } from './heading.tsx';
export { ImageBlock } from './image.tsx';
export { Quote } from './quote.tsx';
export { Text } from './text.tsx';
export { UnknownBlock } from './unknown.tsx';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/core/src/doc/blocks/blocks.test.tsx`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/doc/blocks
git commit -m "feat(core): add built-in content blocks + unknown fallback"
```

---

### Task 7: Layout templates + missing-layout fallback

**Files:**
- Create: `packages/core/src/doc/layouts/title.tsx`, `title-body.tsx`, `two-col.tsx`, `media-text.tsx`, `section.tsx`, `missing.tsx`, `index.ts`
- Test: `packages/core/src/doc/layouts/layouts.test.tsx`

Each layout fills the 1920×1080 canvas root (`width/height: 100%`), applies consistent padding, and wraps each slot's content in `<FitToSlot>` so overflow scales down. `renderSlot(name)` is supplied by the renderer (Task 8); tests pass a stub.

- [ ] **Step 1: Write the failing test**

```tsx
// packages/core/src/doc/layouts/layouts.test.tsx
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { Slide } from '../model.ts';
import { LAYOUT_SLOTS, TitleBody, TwoCol } from './index.ts';

const slide: Slide = { id: 's', layout: 'x', slots: {} };
const slot = (name: string): ReactNode => `[${name}]`;

test('title-body renders title and body slots', () => {
  const html = renderToStaticMarkup(createElement(TitleBody, { slide, renderSlot: slot }));
  expect(html).toContain('[title]');
  expect(html).toContain('[body]');
});

test('two-col renders title, left, right slots', () => {
  const html = renderToStaticMarkup(createElement(TwoCol, { slide, renderSlot: slot }));
  expect(html).toContain('[title]');
  expect(html).toContain('[left]');
  expect(html).toContain('[right]');
});

test('LAYOUT_SLOTS declares slot names per layout', () => {
  expect(LAYOUT_SLOTS['two-col']).toEqual(['title', 'left', 'right']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/core/src/doc/layouts/layouts.test.tsx`
Expected: FAIL — cannot find `./index.ts`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// packages/core/src/doc/layouts/title.tsx
import type { ReactNode } from 'react';
import type { Slide } from '../model.ts';
import { FitToSlot } from '../fit-to-slot.tsx';

export function Title({ renderSlot }: { slide: Slide; renderSlot: (name: string) => ReactNode }) {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--osd-bg)', padding: 160, boxSizing: 'border-box', display: 'grid', alignContent: 'center', gap: 40 }}>
      <FitToSlot>{renderSlot('title')}</FitToSlot>
      <FitToSlot>{renderSlot('subtitle')}</FitToSlot>
    </div>
  );
}
```

```tsx
// packages/core/src/doc/layouts/title-body.tsx
import type { ReactNode } from 'react';
import type { Slide } from '../model.ts';
import { FitToSlot } from '../fit-to-slot.tsx';

export function TitleBody({ renderSlot }: { slide: Slide; renderSlot: (name: string) => ReactNode }) {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--osd-bg)', padding: 140, boxSizing: 'border-box', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 56 }}>
      <FitToSlot>{renderSlot('title')}</FitToSlot>
      <FitToSlot>{renderSlot('body')}</FitToSlot>
    </div>
  );
}
```

```tsx
// packages/core/src/doc/layouts/two-col.tsx
import type { ReactNode } from 'react';
import type { Slide } from '../model.ts';
import { FitToSlot } from '../fit-to-slot.tsx';

export function TwoCol({ renderSlot }: { slide: Slide; renderSlot: (name: string) => ReactNode }) {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--osd-bg)', padding: 140, boxSizing: 'border-box', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 56 }}>
      <FitToSlot>{renderSlot('title')}</FitToSlot>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, minHeight: 0 }}>
        <FitToSlot>{renderSlot('left')}</FitToSlot>
        <FitToSlot>{renderSlot('right')}</FitToSlot>
      </div>
    </div>
  );
}
```

```tsx
// packages/core/src/doc/layouts/media-text.tsx
import type { ReactNode } from 'react';
import type { Slide } from '../model.ts';
import { FitToSlot } from '../fit-to-slot.tsx';

export function MediaText({ renderSlot }: { slide: Slide; renderSlot: (name: string) => ReactNode }) {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--osd-bg)', padding: 140, boxSizing: 'border-box', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 56 }}>
      <FitToSlot>{renderSlot('title')}</FitToSlot>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, minHeight: 0 }}>
        <div style={{ minHeight: 0 }}>{renderSlot('media')}</div>
        <FitToSlot>{renderSlot('body')}</FitToSlot>
      </div>
    </div>
  );
}
```

```tsx
// packages/core/src/doc/layouts/section.tsx
import type { ReactNode } from 'react';
import type { Slide } from '../model.ts';
import { FitToSlot } from '../fit-to-slot.tsx';

export function Section({ renderSlot }: { slide: Slide; renderSlot: (name: string) => ReactNode }) {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--osd-bg)', padding: 160, boxSizing: 'border-box', display: 'grid', alignContent: 'center', gap: 24 }}>
      <div style={{ fontFamily: 'var(--osd-font-body)', fontSize: 'calc(var(--osd-size-body) * 0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--osd-accent)' }}>
        {renderSlot('eyebrow')}
      </div>
      <FitToSlot>{renderSlot('title')}</FitToSlot>
    </div>
  );
}
```

```tsx
// packages/core/src/doc/layouts/missing.tsx
export function MissingLayout({ layout }: { layout: string }) {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--osd-bg)', display: 'grid', placeItems: 'center', color: 'var(--osd-accent)', fontFamily: 'var(--osd-font-body)', fontSize: 32 }}>
      unknown layout: {layout}
    </div>
  );
}
```

```ts
// packages/core/src/doc/layouts/index.ts
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
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/core/src/doc/layouts/layouts.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/doc/layouts
git commit -m "feat(core): add built-in layout templates + missing fallback"
```

---

### Task 8: Register built-ins

**Files:**
- Create: `packages/core/src/doc/builtins.ts`
- Test: `packages/core/src/doc/builtins.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/doc/builtins.test.ts
import { beforeEach, expect, test } from 'vitest';
import { registerBuiltins } from './builtins.ts';
import { getBlock, getLayout, resetRegistry } from './registry.ts';

beforeEach(() => resetRegistry());

test('registers all built-in blocks', () => {
  registerBuiltins();
  for (const t of ['heading', 'text', 'bullets', 'image', 'quote', 'code']) {
    expect(getBlock(t), t).toBeDefined();
  }
});

test('registers all built-in layouts with slots', () => {
  registerBuiltins();
  expect(getLayout('two-col')?.slots).toEqual(['title', 'left', 'right']);
  expect(getLayout('title-body')?.slots).toEqual(['title', 'body']);
});

test('is idempotent', () => {
  registerBuiltins();
  registerBuiltins();
  expect(getBlock('heading')).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/core/src/doc/builtins.test.ts`
Expected: FAIL — cannot find `./builtins.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/doc/builtins.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/core/src/doc/builtins.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/doc/builtins.ts packages/core/src/doc/builtins.test.ts
git commit -m "feat(core): register built-in blocks and layouts"
```

---

### Task 9: `renderDeck` — Deck → SlideModule

**Files:**
- Create: `packages/core/src/doc/render.tsx`
- Test: `packages/core/src/doc/render.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/core/src/doc/render.test.tsx
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, test } from 'vitest';
import { registerBuiltins } from './builtins.ts';
import type { Deck } from './model.ts';
import { renderDeck } from './render.tsx';
import { resetRegistry } from './registry.ts';

beforeEach(() => {
  resetRegistry();
  registerBuiltins();
});

const deck: Deck = {
  schemaVersion: 1,
  meta: { title: 'My deck', createdAt: '2026-06-05T12:00:00Z', theme: 'acme' },
  design: { palette: { bg: '#fff', text: '#000', accent: '#f00' }, fonts: { display: 'a', body: 'b' }, typeScale: { hero: 100, body: 30 }, radius: 8 },
  slides: [
    { id: 's1', layout: 'title', slots: { title: [{ id: 'b1', type: 'heading', props: { text: 'Hello' } }] }, notes: 'speak here' },
    { id: 's2', layout: 'two-col', slots: { title: [{ id: 'b2', type: 'heading', props: { text: 'Two' } }], left: [{ id: 'b3', type: 'chart', props: {} }] } },
  ],
};

test('produces one page per slide', () => {
  expect(renderDeck(deck).default).toHaveLength(2);
});

test('passes meta and design through', () => {
  const m = renderDeck(deck);
  expect(m.meta?.title).toBe('My deck');
  expect(m.meta?.theme).toBe('acme');
  expect(m.design?.palette.accent).toBe('#f00');
});

test('aggregates notes index-aligned with pages', () => {
  expect(renderDeck(deck).notes).toEqual(['speak here', undefined]);
});

test('renders block content', () => {
  const m = renderDeck(deck);
  expect(renderToStaticMarkup(createElement(m.default[0]))).toContain('Hello');
});

test('unknown block type renders a fallback, not a crash', () => {
  const m = renderDeck(deck);
  expect(renderToStaticMarkup(createElement(m.default[1]))).toContain('unknown block: chart');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/core/src/doc/render.test.tsx`
Expected: FAIL — cannot find `./render.tsx`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// packages/core/src/doc/render.tsx
import { createElement } from 'react';
import type { Page, SlideModule } from '../app/lib/sdk.ts';
import { UnknownBlock } from './blocks/index.ts';
import { MissingLayout } from './layouts/index.ts';
import type { Block, Deck, Slide } from './model.ts';
import { getBlock, getLayout } from './registry.ts';

function renderBlock(block: Block) {
  const Component = getBlock(block.type);
  if (!Component) return createElement(UnknownBlock, { key: block.id, type: block.type });
  return createElement(Component, { key: block.id, block });
}

function makePage(slide: Slide): Page {
  const SlidePage: Page = () => {
    const entry = getLayout(slide.layout);
    if (!entry) return createElement(MissingLayout, { layout: slide.layout });
    const renderSlot = (name: string) => (slide.slots[name] ?? []).map(renderBlock);
    return createElement(entry.component, { slide, renderSlot });
  };
  if (slide.transition) SlidePage.transition = slide.transition;
  return SlidePage;
}

export function renderDeck(deck: Deck): SlideModule {
  return {
    default: deck.slides.map(makePage),
    meta: { title: deck.meta.title, theme: deck.meta.theme, createdAt: deck.meta.createdAt },
    design: deck.design,
    notes: deck.slides.map((s) => s.notes),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/core/src/doc/render.test.tsx`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/doc/render.tsx packages/core/src/doc/render.test.tsx
git commit -m "feat(core): add renderDeck — Deck to SlideModule"
```

---

### Task 10: Public entry for the doc module + full suite green

**Files:**
- Create: `packages/core/src/doc/index.ts`
- Modify: `packages/core/src/index.ts` (add doc-model exports)

This exposes the engine for M1b (plugin/loadSlide) and for custom-block authors, without yet removing any legacy export.

- [ ] **Step 1: Create the doc barrel**

```ts
// packages/core/src/doc/index.ts
export { registerBuiltins } from './builtins.ts';
export type { Deck, DeckMeta, Block, Slide } from './model.ts';
export { SCHEMA_VERSION } from './model.ts';
export { renderDeck } from './render.tsx';
export {
  type BlockComponent,
  type LayoutComponent,
  getBlock,
  getLayout,
  registerBlock,
  registerLayout,
} from './registry.ts';
export { DeckValidationError, validateDeck } from './validate.ts';
```

- [ ] **Step 2: Add doc-model exports to the package entry**

Add these lines to `packages/core/src/index.ts` (append; do not remove existing exports — legacy removal is M1b):

```ts
export type { Block, Deck, DeckMeta, Slide } from './doc/index.ts';
export {
  type BlockComponent,
  type LayoutComponent,
  DeckValidationError,
  getBlock,
  getLayout,
  registerBlock,
  registerBuiltins,
  registerLayout,
  renderDeck,
  SCHEMA_VERSION,
  validateDeck,
} from './doc/index.ts';
```

- [ ] **Step 3: Run the full suite + typecheck**

Run: `pnpm test`
Expected: PASS — all doc-model tests green.

Run: `pnpm core typecheck`
Expected: no type errors.

- [ ] **Step 4: Biome**

Run: `pnpm check`
Expected: clean. If not: `pnpm check:fix` then re-run.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/doc/index.ts packages/core/src/index.ts
git commit -m "feat(core): export document-model engine from package entry"
```

---

### Task 11: Changeset

**Files:**
- Create: `.changeset/<generated>.md`

- [ ] **Step 1: Add a changeset**

Run: `pnpm changeset`
- Select `@open-slide/core`.
- Bump: **minor** (this plan only *adds* the engine; the breaking removal of the TSX path happens in M1b and carries the **major** bump).
- Description (one line, present tense): `Add document-model engine (schema, validator, block/layout registry, renderDeck).`

- [ ] **Step 2: Commit**

```bash
git add .changeset
git commit -m "chore: changeset for document-model engine"
```

---

## Self-Review

**Spec coverage (M1a portion of the spec):**
- Document model + versioned schema → Tasks 1, 2 ✓
- Block registry (open, by type) → Task 3 ✓
- Built-in blocks → Task 6 ✓; built-in layouts → Task 7 ✓
- Overflow auto-fit (scale-to-fit per slot) → Tasks 4, 5, used in Task 7 ✓
- Renderer adapting to `SlideModule` (notes aggregation, design/meta passthrough, unknown-type fallback) → Task 9 ✓
- Zero new runtime deps; hand-written validation → Task 2 ✓
- `design` inline tokens + `meta.theme` named ref split → Tasks 1, 9 ✓

**Deferred to M1b (NOT in this plan, by design):** Vite plugin discovery rewrite (`deck.json` glob, `import('./deck.json')`, `parseCreatedAtMs` from JSON), `virtual:open-slide/blocks` + static import in `main.tsx`, `loadSlide` adapter, decoupling `slide.tsx` from the inspector/design-panel/page-edit endpoints, deleting the legacy TSX path + `editing/` + `/__edit` routes, demo migration, CLI template, skill rewrite, production build-path verification, and the **major** version bump. M1b must begin by mapping the full inspector/edit-route file footprint before specifying removals.

**Placeholder scan:** none — every code step contains complete, runnable code.

**Type consistency:** `Block`/`Slide`/`Deck`/`DeckMeta` identical across model/validate/registry/render. `renderSlot: (name: string) => ReactNode` identical in registry `LayoutComponent` and every layout. `BlockComponent = ComponentType<{ block: Block }>` matches every block's `{ block }` prop. `Page`/`SlideModule` imported from the existing `app/lib/sdk.ts` — `meta`/`design`/`notes`/`transition` fields match its definition. `registerBuiltins` is idempotent (Map-set), safe to call once at app init in M1b.
