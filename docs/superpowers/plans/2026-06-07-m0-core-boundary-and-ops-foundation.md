# M0 — Core Boundary + Ops Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the React-free `@open-slide/core/doc` document layer, add inverse-ops (for undo/redo) and layout-aware slide scaffolding, and de-risk in-app custom-block compilation with an esbuild-wasm spike — the foundation M1 (editor) and M2 (ops API/MCP) build on.

**Architecture:** The `doc/` directory becomes fully self-contained (no runtime imports from `app/` or `react`), so the future API/MCP server can import the document model in Node without pulling in React. A new `doc/pure.ts` barrel + a static boundary guard test enforce this. Inverse-ops live alongside `applyOp` so every mutation can be undone by the same machinery for humans and agents. A throwaway spike proves esbuild-wasm can compile block TSX at runtime before M3 commits to it.

**Tech Stack:** TypeScript, Vitest (`vitest run`, node env, co-located `*.test.ts`), tsdown (build), Biome (`pnpm check`), Changesets, esbuild-wasm (spike only).

**Branch:** Implement on a fresh branch off `main` (e.g. `feat/m0-doc-boundary`), not on the current spec branch. If using worktrees, create it via superpowers:using-git-worktrees first.

**Conventions:** Biome must pass before each commit (`pnpm check`). Every commit message ends with the trailer:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```
(Omitted from the commands below for brevity — add it to each.)

---

## File Structure

**Created:**
- `packages/core/src/doc/design.ts` — design-token types + helpers (moved from `app/lib/design.ts`; pure).
- `packages/core/src/doc/transition.ts` — `SlideTransition` / `TransitionPhase` types (moved from `app/lib/transition.ts`; pure).
- `packages/core/src/doc/ids.ts` — `freshId`, `cloneSlideWithFreshIds` (canonical, pure).
- `packages/core/src/doc/inverse.ts` — `invertOp`, `applyOpWithInverse`.
- `packages/core/src/doc/inverse.test.ts` — inverse round-trip tests.
- `packages/core/src/doc/scaffold.ts` — `buildSlide`, `addSlideFromLayout`.
- `packages/core/src/doc/scaffold.test.ts` — scaffolding tests.
- `packages/core/src/doc/pure.ts` — React-free barrel (the node-safe document layer).
- `packages/core/src/doc/pure.boundary.test.ts` — static guard: pure modules import no runtime React/app.
- `spikes/esbuild-wasm-blocks/` — throwaway spike (`package.json`, `index.mjs`, `FINDINGS.md`).
- `.changeset/inverse-scaffold-doc-entry.md` — changeset.

**Modified:**
- `packages/core/src/app/lib/design.ts` — becomes a re-export shim from `doc/design.ts`.
- `packages/core/src/app/lib/transition.ts` — imports types from `doc/transition.ts`; keeps `resolveTransition`.
- `packages/core/src/doc/model.ts` — imports `DesignSystem`/`SlideTransition` from `./design.ts` / `./transition.ts`.
- `packages/core/src/app/components/editor/ids.ts` — re-export shim from `doc/ids.ts`.
- `packages/core/src/doc/ops.ts` — `update-block-props` deletes keys whose value is `undefined` (enables precise undo).
- `packages/core/src/index.ts` — design/transition exports sourced from `doc/`; add inverse + scaffold exports.
- `packages/core/package.json` — add `./doc` export entry.
- `packages/core/tsdown.config.ts` — add `doc/pure` build entry.
- `pnpm-workspace.yaml` — add `spikes/*`.

---

## Task 1: Move design tokens into `doc/` (make `doc/model.ts` app-free, part 1)

**Files:**
- Create: `packages/core/src/doc/design.ts`
- Modify: `packages/core/src/app/lib/design.ts`
- Modify: `packages/core/src/doc/model.ts:1`
- Modify: `packages/core/src/index.ts` (design export source)

- [ ] **Step 1: Create `doc/design.ts` with the moved content**

Copy the *entire current contents* of `packages/core/src/app/lib/design.ts` into a new file `packages/core/src/doc/design.ts` verbatim (the `DesignPalette`, `DesignFonts`, `DesignTypeScale`, `DesignSystem` types and `designToCssVars`, `cssVarsToString`, `defaultDesign`, `DeepPartial`, `normalizeDesign`). It has no imports, so it moves cleanly.

- [ ] **Step 2: Replace `app/lib/design.ts` with a re-export shim**

```ts
export type {
  DeepPartial,
  DesignFonts,
  DesignPalette,
  DesignSystem,
  DesignTypeScale,
} from '../../doc/design.ts';
export {
  cssVarsToString,
  defaultDesign,
  designToCssVars,
  normalizeDesign,
} from '../../doc/design.ts';
```

- [ ] **Step 3: Point `doc/model.ts` at the local design module**

In `packages/core/src/doc/model.ts`, change line 1 from:
```ts
import type { DesignSystem } from '../app/lib/design.ts';
```
to:
```ts
import type { DesignSystem } from './design.ts';
```

- [ ] **Step 4: Point `index.ts` design exports at `doc/design.ts`**

In `packages/core/src/index.ts`, change the two design export blocks to source from `./doc/design.ts`:
```ts
export type {
  DesignFonts,
  DesignPalette,
  DesignSystem,
  DesignTypeScale,
} from './doc/design.ts';
export {
  cssVarsToString,
  defaultDesign,
  designToCssVars,
  normalizeDesign,
} from './doc/design.ts';
```

- [ ] **Step 5: Run the full suite + typecheck (existing tests are the guard for this refactor)**

Run: `pnpm exec vitest run && pnpm core typecheck`
Expected: PASS — behavior is unchanged; this is a pure move with a re-export shim.

- [ ] **Step 6: Biome + commit**

```bash
pnpm check
git add packages/core/src/doc/design.ts packages/core/src/app/lib/design.ts packages/core/src/doc/model.ts packages/core/src/index.ts
git commit -m "refactor(core): move design tokens into doc/ with app re-export shim"
```

---

## Task 2: Move transition types into `doc/` (make `doc/model.ts` app-free, part 2)

**Files:**
- Create: `packages/core/src/doc/transition.ts`
- Modify: `packages/core/src/app/lib/transition.ts`
- Modify: `packages/core/src/doc/model.ts:2`
- Modify: `packages/core/src/index.ts` (transition type export source)

- [ ] **Step 1: Create `doc/transition.ts` with just the types**

```ts
export type TransitionPhase = {
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  easing?: string;
  duration?: number;
  delay?: number;
};

export type SlideTransition = {
  duration: number;
  easing?: string;
  enter?: TransitionPhase;
  exit?: TransitionPhase;
};
```

- [ ] **Step 2: Update `app/lib/transition.ts` to re-use the moved types**

Replace the type declarations with imports, keeping `resolveTransition` (which depends on the app-level `Page` type):
```ts
import type { Page } from './sdk';
import type { SlideTransition } from '../../doc/transition.ts';

export type { SlideTransition, TransitionPhase } from '../../doc/transition.ts';

export function resolveTransition(
  pages: Page[],
  index: number,
  moduleDefault?: SlideTransition,
): SlideTransition | undefined {
  return pages[index]?.transition ?? moduleDefault;
}
```

- [ ] **Step 3: Point `doc/model.ts` at the local transition module**

In `packages/core/src/doc/model.ts`, change line 2 from:
```ts
import type { SlideTransition } from '../app/lib/transition.ts';
```
to:
```ts
import type { SlideTransition } from './transition.ts';
```

- [ ] **Step 4: Point `index.ts` transition type export at `doc/transition.ts`**

In `packages/core/src/index.ts`, change:
```ts
export type { SlideTransition, TransitionPhase } from './app/lib/transition.ts';
```
to:
```ts
export type { SlideTransition, TransitionPhase } from './doc/transition.ts';
```

- [ ] **Step 5: Run suite + typecheck**

Run: `pnpm exec vitest run && pnpm core typecheck`
Expected: PASS — pure move with re-export shim, `resolveTransition` unchanged.

- [ ] **Step 6: Biome + commit**

```bash
pnpm check
git add packages/core/src/doc/transition.ts packages/core/src/app/lib/transition.ts packages/core/src/doc/model.ts packages/core/src/index.ts
git commit -m "refactor(core): move transition types into doc/ with app re-export shim"
```

---

## Task 3: Canonical id helpers in `doc/`

**Files:**
- Create: `packages/core/src/doc/ids.ts`
- Create: `packages/core/src/doc/ids.test.ts`
- Modify: `packages/core/src/app/components/editor/ids.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/doc/ids.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { cloneSlideWithFreshIds, freshId } from './ids.ts';
import type { Slide } from './model.ts';

describe('freshId', () => {
  it('prefixes and is unique', () => {
    const a = freshId('b');
    const b = freshId('b');
    expect(a.startsWith('b-')).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe('cloneSlideWithFreshIds', () => {
  it('gives the slide and every block new ids while preserving content', () => {
    const slide: Slide = {
      id: 's1',
      layout: 'title-body',
      slots: { title: [{ id: 'b1', type: 'heading', props: { text: 'Hi' } }] },
    };
    const clone = cloneSlideWithFreshIds(slide);
    expect(clone.id).not.toBe('s1');
    expect(clone.slots.title[0].id).not.toBe('b1');
    expect(clone.slots.title[0].props).toEqual({ text: 'Hi' });
    expect(clone.layout).toBe('title-body');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/core/src/doc/ids.test.ts`
Expected: FAIL — `./ids.ts` does not exist.

- [ ] **Step 3: Create `doc/ids.ts`**

```ts
import type { Slide } from './model.ts';

export function freshId(prefix = 'x'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function cloneSlideWithFreshIds(slide: Slide): Slide {
  const copy = structuredClone(slide);
  copy.id = freshId('s');
  for (const name of Object.keys(copy.slots)) {
    for (const block of copy.slots[name]) block.id = freshId('b');
  }
  return copy;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/core/src/doc/ids.test.ts`
Expected: PASS.

- [ ] **Step 5: Re-point the old editor `ids.ts` to the canonical module**

Replace the contents of `packages/core/src/app/components/editor/ids.ts` with:
```ts
export { cloneSlideWithFreshIds, freshId } from '../../../doc/ids.ts';
```

- [ ] **Step 6: Run suite + typecheck + biome, then commit**

Run: `pnpm exec vitest run && pnpm core typecheck && pnpm check`
Expected: PASS.
```bash
git add packages/core/src/doc/ids.ts packages/core/src/doc/ids.test.ts packages/core/src/app/components/editor/ids.ts
git commit -m "refactor(core): canonical freshId helpers in doc/ with editor shim"
```

---

## Task 4: React-free `doc/pure.ts` barrel + boundary guard + `./doc` export

**Files:**
- Create: `packages/core/src/doc/pure.ts`
- Create: `packages/core/src/doc/pure.boundary.test.ts`
- Modify: `packages/core/tsdown.config.ts`
- Modify: `packages/core/package.json`

- [ ] **Step 1: Create the pure barrel**

Create `packages/core/src/doc/pure.ts` — note it deliberately does NOT export `render.tsx` (React):
```ts
export type { DeckMeta, Block, Slide, Deck } from './model.ts';
export { SCHEMA_VERSION } from './model.ts';
export type {
  DeepPartial,
  DesignFonts,
  DesignPalette,
  DesignSystem,
  DesignTypeScale,
} from './design.ts';
export {
  cssVarsToString,
  defaultDesign,
  designToCssVars,
  normalizeDesign,
} from './design.ts';
export type { SlideTransition, TransitionPhase } from './transition.ts';
export { applyOp, applyOps, type EditOp, EditOpError } from './ops.ts';
export {
  type BlockPropSchema,
  getBlockSchema,
  listBlockTypes,
  listLayouts,
  type PropField,
  type PropFieldType,
} from './registry.ts';
export { DeckValidationError, validateDeck } from './validate.ts';
export { cloneSlideWithFreshIds, freshId } from './ids.ts';
```
(Inverse + scaffold exports are added in Tasks 5/6.)

- [ ] **Step 2: Write the failing boundary guard test**

Create `packages/core/src/doc/pure.boundary.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const docDir = dirname(fileURLToPath(import.meta.url));

// These modules MUST stay runtime-React-free and app-free so the API/MCP can import them in Node.
const PURE_MODULES = [
  'model.ts',
  'ops.ts',
  'validate.ts',
  'registry.ts',
  'design.ts',
  'transition.ts',
  'ids.ts',
  'inverse.ts',
  'scaffold.ts',
  'pure.ts',
];

// Match runtime imports only — `import type ... from '...'` is erased at build, so it is allowed.
function runtimeImports(src: string): string[] {
  const re = /^\s*import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/gm;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

describe('doc pure boundary', () => {
  for (const file of PURE_MODULES) {
    it(`${file} has no runtime react/app imports`, () => {
      const src = readFileSync(join(docDir, file), 'utf8');
      for (const spec of runtimeImports(src)) {
        expect(spec, `${file} runtime-imports ${spec}`).not.toBe('react');
        expect(spec, `${file} runtime-imports ${spec}`).not.toBe('react-dom');
        expect(spec.includes('/app/'), `${file} runtime-imports app module ${spec}`).toBe(false);
        expect(spec.endsWith('.tsx'), `${file} runtime-imports a .tsx module ${spec}`).toBe(false);
      }
    });
  }
});
```

- [ ] **Step 3: Run the guard test**

Run: `pnpm exec vitest run packages/core/src/doc/pure.boundary.test.ts`
Expected: FAIL on the `inverse.ts` and `scaffold.ts` cases (`ENOENT` — they don't exist yet). The `pure.ts` and existing-module cases PASS. This is expected; Tasks 5 and 6 create those files. Proceed.

- [ ] **Step 4: Add the `doc/pure` build entry**

In `packages/core/tsdown.config.ts`, add to the `entry` map:
```ts
  entry: {
    index: 'src/index.ts',
    'cli/bin': 'src/cli/bin.ts',
    'vite/index': 'src/vite/index.ts',
    'locale/index': 'src/locale/index.ts',
    'doc/pure': 'src/doc/pure.ts',
  },
```

- [ ] **Step 5: Add the `./doc` package export**

In `packages/core/package.json`, add to `exports` after the `.` entry:
```json
    "./doc": {
      "types": "./dist/doc/pure.d.ts",
      "import": "./dist/doc/pure.js"
    },
```

- [ ] **Step 6: Build to confirm the pure entry compiles standalone, then commit**

Run: `pnpm core build`
Expected: PASS; `packages/core/dist/doc/pure.js` and `pure.d.ts` exist.
```bash
pnpm check
git add packages/core/src/doc/pure.ts packages/core/src/doc/pure.boundary.test.ts packages/core/tsdown.config.ts packages/core/package.json
git commit -m "feat(core): add React-free @open-slide/core/doc entry + boundary guard"
```
(The boundary test still has 2 ENOENT failures until Tasks 5–6 land; that is acceptable mid-stream and resolved by Task 6.)

---

## Task 5: Inverse-ops for undo/redo

**Files:**
- Modify: `packages/core/src/doc/ops.ts:98-109` (update-block-props deletes `undefined` keys)
- Create: `packages/core/src/doc/inverse.ts`
- Create: `packages/core/src/doc/inverse.test.ts`
- Modify: `packages/core/src/doc/pure.ts` (export inverse)
- Modify: `packages/core/src/index.ts` (export inverse)

- [ ] **Step 1: Make `update-block-props` able to delete keys (enables precise undo)**

In `packages/core/src/doc/ops.ts`, replace the `update-block-props` case body (currently `block.props = { ...block.props, ...op.props };`) so that keys explicitly set to `undefined` are removed:
```ts
    case 'update-block-props': {
      for (const slide of deck.slides) {
        for (const name of Object.keys(slide.slots)) {
          const block = slide.slots[name].find((b) => b.id === op.blockId);
          if (block) {
            // Merge, then drop keys explicitly set to undefined so undo can remove keys a forward op added.
            block.props = { ...block.props, ...op.props };
            for (const k of Object.keys(op.props)) {
              if (op.props[k] === undefined) delete block.props[k];
            }
            return;
          }
        }
      }
      throw new EditOpError(`block not found: ${op.blockId}`);
    }
```

- [ ] **Step 2: Write the failing inverse tests**

Create `packages/core/src/doc/inverse.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { applyOp } from './ops.ts';
import type { EditOp } from './ops.ts';
import { applyOpWithInverse, invertOp } from './inverse.ts';
import type { Deck } from './model.ts';
import { defaultDesign } from './design.ts';

function makeDeck(): Deck {
  return {
    schemaVersion: 1,
    meta: { title: 'Original', createdAt: '2026-01-01T00:00:00.000Z', theme: 'midnight' },
    design: defaultDesign,
    slides: [
      {
        id: 's1',
        layout: 'title-body',
        slots: {
          title: [{ id: 'b1', type: 'heading', props: { text: 'One' } }],
          body: [{ id: 'b2', type: 'text', props: { text: 'Two' } }],
        },
        notes: 'note one',
      },
      {
        id: 's2',
        layout: 'blank',
        slots: { content: [{ id: 'b3', type: 'text', props: { text: 'Three' } }] },
      },
    ],
  };
}

const ROUND_TRIP_OPS: EditOp[] = [
  { kind: 'set-deck-title', title: 'New' },
  { kind: 'set-deck-theme', theme: 'coral' },
  { kind: 'set-design', design: { ...defaultDesign, space: 16 } },
  { kind: 'add-slide', index: 1, slide: { id: 's3', layout: 'blank', slots: { content: [] } } },
  { kind: 'remove-slide', slideId: 's2' },
  { kind: 'move-slide', slideId: 's1', toIndex: 1 },
  { kind: 'set-slide-layout', slideId: 's1', layout: 'two-col' },
  { kind: 'set-slide-notes', slideId: 's1', notes: 'changed' },
  { kind: 'set-slot-blocks', slideId: 's1', slot: 'title', blocks: [] },
  { kind: 'add-block', slideId: 's1', slot: 'title', index: 1, block: { id: 'b9', type: 'text', props: {} } },
  { kind: 'remove-block', blockId: 'b2' },
  { kind: 'update-block-props', blockId: 'b1', props: { text: 'Changed' } },
];

describe('invertOp round-trips', () => {
  for (const op of ROUND_TRIP_OPS) {
    it(`apply then undo restores the deck for ${op.kind}`, () => {
      const before = makeDeck();
      const { deck: after, inverse } = applyOpWithInverse(before, op);
      const restored = applyOp(after, inverse);
      expect(restored).toEqual(before);
    });
  }
});

describe('update-block-props undo removes newly added keys', () => {
  it('drops a key the forward op introduced', () => {
    const before = makeDeck();
    const op: EditOp = { kind: 'update-block-props', blockId: 'b1', props: { color: 'red' } };
    const { deck: after, inverse } = applyOpWithInverse(before, op);
    expect((after.slides[0].slots.title[0].props as Record<string, unknown>).color).toBe('red');
    const restored = applyOp(after, inverse);
    expect(restored.slides[0].slots.title[0].props).toEqual({ text: 'One' });
  });
});

describe('invertOp errors', () => {
  it('throws when the target block is missing', () => {
    expect(() => invertOp(makeDeck(), { kind: 'remove-block', blockId: 'nope' })).toThrow();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/core/src/doc/inverse.test.ts`
Expected: FAIL — `./inverse.ts` does not exist.

- [ ] **Step 4: Implement `doc/inverse.ts`**

```ts
import type { Block, Deck } from './model.ts';
import { applyOp, type EditOp, EditOpError } from './ops.ts';

function slideIndex(deck: Deck, slideId: string): number {
  const i = deck.slides.findIndex((s) => s.id === slideId);
  if (i === -1) throw new EditOpError(`slide not found: ${slideId}`);
  return i;
}

function locateBlock(
  deck: Deck,
  blockId: string,
): { slideId: string; slot: string; index: number; block: Block } {
  for (const slide of deck.slides) {
    for (const slot of Object.keys(slide.slots)) {
      const index = slide.slots[slot].findIndex((b) => b.id === blockId);
      if (index !== -1) {
        return { slideId: slide.id, slot, index, block: slide.slots[slot][index] };
      }
    }
  }
  throw new EditOpError(`block not found: ${blockId}`);
}

/** Given the deck BEFORE `op` is applied, return the op that undoes it. */
export function invertOp(before: Deck, op: EditOp): EditOp {
  switch (op.kind) {
    case 'set-deck-title':
      return { kind: 'set-deck-title', title: before.meta.title ?? '' };
    case 'set-deck-theme':
      return { kind: 'set-deck-theme', theme: before.meta.theme };
    case 'set-design':
      return { kind: 'set-design', design: structuredClone(before.design) };
    case 'add-slide':
      return { kind: 'remove-slide', slideId: op.slide.id };
    case 'remove-slide': {
      const i = slideIndex(before, op.slideId);
      return { kind: 'add-slide', index: i, slide: structuredClone(before.slides[i]) };
    }
    case 'move-slide':
      return { kind: 'move-slide', slideId: op.slideId, toIndex: slideIndex(before, op.slideId) };
    case 'set-slide-layout': {
      const s = before.slides[slideIndex(before, op.slideId)];
      return { kind: 'set-slide-layout', slideId: op.slideId, layout: s.layout };
    }
    case 'set-slide-notes': {
      const s = before.slides[slideIndex(before, op.slideId)];
      return { kind: 'set-slide-notes', slideId: op.slideId, notes: s.notes };
    }
    case 'set-slot-blocks': {
      const s = before.slides[slideIndex(before, op.slideId)];
      return {
        kind: 'set-slot-blocks',
        slideId: op.slideId,
        slot: op.slot,
        blocks: structuredClone(s.slots[op.slot] ?? []),
      };
    }
    case 'add-block':
      return { kind: 'remove-block', blockId: op.block.id };
    case 'remove-block': {
      const loc = locateBlock(before, op.blockId);
      return {
        kind: 'add-block',
        slideId: loc.slideId,
        slot: loc.slot,
        index: loc.index,
        block: structuredClone(loc.block),
      };
    }
    case 'update-block-props': {
      const loc = locateBlock(before, op.blockId);
      const prev: Record<string, unknown> = {};
      // For each key the forward op writes, restore its prior value; absent keys become undefined,
      // which applyOp's update-block-props deletes — exactly undoing a newly-added key.
      for (const k of Object.keys(op.props)) prev[k] = loc.block.props[k];
      return { kind: 'update-block-props', blockId: op.blockId, props: prev };
    }
  }
}

export function applyOpWithInverse(deck: Deck, op: EditOp): { deck: Deck; inverse: EditOp } {
  const inverse = invertOp(deck, op);
  return { deck: applyOp(deck, op), inverse };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/core/src/doc/inverse.test.ts`
Expected: PASS (all round-trip cases, the added-key case, and the error case).

- [ ] **Step 6: Export inverse from the barrels**

Append to `packages/core/src/doc/pure.ts`:
```ts
export { applyOpWithInverse, invertOp } from './inverse.ts';
```
In `packages/core/src/index.ts`, add `applyOpWithInverse` and `invertOp` to the existing `from './doc/index.ts'` export block — first add them to `doc/index.ts`:
```ts
export { applyOpWithInverse, invertOp } from './inverse.ts';
```
then add `applyOpWithInverse,` and `invertOp,` to the alphabetised import list in `index.ts` that re-exports from `./doc/index.ts`.

- [ ] **Step 7: Run suite + typecheck + biome, then commit**

Run: `pnpm exec vitest run && pnpm core typecheck && pnpm check`
Expected: PASS — including the existing `ops.test.ts` (the undefined-delete change is additive).
```bash
git add packages/core/src/doc/ops.ts packages/core/src/doc/inverse.ts packages/core/src/doc/inverse.test.ts packages/core/src/doc/pure.ts packages/core/src/doc/index.ts packages/core/src/index.ts
git commit -m "feat(core): inverse-ops (invertOp/applyOpWithInverse) for undo/redo"
```

---

## Task 6: Layout-aware slide scaffolding

**Files:**
- Create: `packages/core/src/doc/scaffold.ts`
- Create: `packages/core/src/doc/scaffold.test.ts`
- Modify: `packages/core/src/doc/pure.ts` (export scaffold)
- Modify: `packages/core/src/doc/index.ts` + `packages/core/src/index.ts` (export scaffold)

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/doc/scaffold.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { defaultDesign } from './design.ts';
import type { Deck } from './model.ts';
import { applyOp } from './ops.ts';
import { addSlideFromLayout, buildSlide } from './scaffold.ts';

describe('buildSlide', () => {
  it('creates an empty array for each declared slot', () => {
    const slide = buildSlide('two-col', ['title', 'left', 'right'], 's-test');
    expect(slide.id).toBe('s-test');
    expect(slide.layout).toBe('two-col');
    expect(slide.slots).toEqual({ title: [], left: [], right: [] });
  });

  it('generates a fresh id when none is given', () => {
    const a = buildSlide('blank', ['content']);
    const b = buildSlide('blank', ['content']);
    expect(a.id).not.toBe(b.id);
    expect(a.id.startsWith('s-')).toBe(true);
  });
});

describe('addSlideFromLayout', () => {
  it('returns an add-slide op that validates when applied', () => {
    const deck: Deck = {
      schemaVersion: 1,
      meta: { createdAt: '2026-01-01T00:00:00.000Z' },
      design: defaultDesign,
      slides: [{ id: 's1', layout: 'blank', slots: { content: [] } }],
    };
    const op = addSlideFromLayout({ layout: 'title', slots: ['title', 'subtitle'], index: 1, id: 's2' });
    expect(op.kind).toBe('add-slide');
    const next = applyOp(deck, op);
    expect(next.slides).toHaveLength(2);
    expect(next.slides[1].id).toBe('s2');
    expect(next.slides[1].slots).toEqual({ title: [], subtitle: [] });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/core/src/doc/scaffold.test.ts`
Expected: FAIL — `./scaffold.ts` does not exist.

- [ ] **Step 3: Implement `doc/scaffold.ts`**

```ts
import { freshId } from './ids.ts';
import type { Block, Slide } from './model.ts';
import type { EditOp } from './ops.ts';

/** Build a new slide for `layout` with an empty array per declared slot. */
export function buildSlide(layout: string, slots: string[], id: string = freshId('s')): Slide {
  const slotMap: Record<string, Block[]> = {};
  for (const name of slots) slotMap[name] = [];
  return { id, layout, slots: slotMap };
}

/** Convenience op: insert a fresh, layout-shaped slide at `index`. Callers resolve `slots` from the registry. */
export function addSlideFromLayout(args: {
  layout: string;
  slots: string[];
  index: number;
  id?: string;
}): EditOp {
  return { kind: 'add-slide', index: args.index, slide: buildSlide(args.layout, args.slots, args.id) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/core/src/doc/scaffold.test.ts`
Expected: PASS.

- [ ] **Step 5: Export scaffold from the barrels**

Append to `packages/core/src/doc/pure.ts`:
```ts
export { addSlideFromLayout, buildSlide } from './scaffold.ts';
```
Append to `packages/core/src/doc/index.ts`:
```ts
export { addSlideFromLayout, buildSlide } from './scaffold.ts';
```
Then add `addSlideFromLayout,` and `buildSlide,` to the alphabetised `from './doc/index.ts'` re-export list in `packages/core/src/index.ts`.

- [ ] **Step 6: Run full suite (incl. boundary guard now fully green) + typecheck + biome, then commit**

Run: `pnpm exec vitest run && pnpm core typecheck && pnpm check`
Expected: PASS — `pure.boundary.test.ts` now finds all 10 pure modules and passes every case.
```bash
git add packages/core/src/doc/scaffold.ts packages/core/src/doc/scaffold.test.ts packages/core/src/doc/pure.ts packages/core/src/doc/index.ts packages/core/src/index.ts
git commit -m "feat(core): layout-aware slide scaffolding (buildSlide/addSlideFromLayout)"
```

---

## Task 7: esbuild-wasm custom-block compile spike

**Goal:** prove esbuild-wasm can compile a block's TSX into an importable ES module at runtime, and record init time / compile time / output size / wasm payload size so M3 can commit (or not) with data. This is a throwaway spike, not shipped runtime code.

**Files:**
- Modify: `pnpm-workspace.yaml`
- Create: `spikes/esbuild-wasm-blocks/package.json`
- Create: `spikes/esbuild-wasm-blocks/index.mjs`
- Create: `spikes/esbuild-wasm-blocks/FINDINGS.md`

- [ ] **Step 1: Register the spikes glob in the workspace**

Add `spikes/*` to the `packages:` list in `pnpm-workspace.yaml` (alongside the existing `packages/*` / `apps/*` entries).

- [ ] **Step 2: Create the spike package**

Create `spikes/esbuild-wasm-blocks/package.json`:
```json
{
  "name": "spike-esbuild-wasm-blocks",
  "private": true,
  "type": "module",
  "scripts": { "spike": "node index.mjs" },
  "dependencies": { "esbuild-wasm": "^0.24.0" }
}
```

- [ ] **Step 3: Write the spike script**

Create `spikes/esbuild-wasm-blocks/index.mjs`:
```js
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import * as esbuild from 'esbuild-wasm';

const require = createRequire(import.meta.url);

const SAMPLE_BLOCK = `
import type { Block } from '@open-slide/core/doc';
export function Timeline({ block }: { block: Block }) {
  const events = (block.props.events as string[]) ?? [];
  return (
    <ol style={{ display: 'grid', gap: 8 }}>
      {events.map((e, i) => <li key={i}>{e}</li>)}
    </ol>
  );
}
`;

async function main() {
  const wasmPath = require.resolve('esbuild-wasm/esbuild.wasm');
  const wasmSize = statSync(wasmPath).size;

  const t0 = performance.now();
  await esbuild.initialize({ wasmModule: await WebAssembly.compile(readFileSync(wasmPath)) });
  const initMs = performance.now() - t0;

  const t1 = performance.now();
  const result = await esbuild.build({
    stdin: { contents: SAMPLE_BLOCK, loader: 'tsx', sourcefile: 'timeline.tsx' },
    bundle: true,
    write: false,
    format: 'esm',
    jsx: 'automatic',
    external: ['react', 'react/jsx-runtime', '@open-slide/core/doc'],
  });
  const compileMs = performance.now() - t1;

  const code = result.outputFiles[0].text;
  const outBytes = Buffer.byteLength(code, 'utf8');

  const exportsComponent = /export\s*\{[^}]*Timeline/.test(code) || /export\s+function\s+Timeline/.test(code);

  const findings = [
    '# esbuild-wasm block-compile spike — findings',
    '',
    `- esbuild.wasm payload: ${(wasmSize / 1024 / 1024).toFixed(2)} MB`,
    `- initialize(): ${initMs.toFixed(0)} ms (one-time, cold)`,
    `- build() one block: ${compileMs.toFixed(0)} ms`,
    `- compiled output size: ${outBytes} bytes`,
    `- output is ESM exporting the component: ${exportsComponent ? 'yes' : 'NO — investigate'}`,
    `- react kept external (host provides it): ${code.includes('react/jsx-runtime') ? 'yes' : 'check'}`,
    '',
    '## Verdict',
    'TODO after running: is the wasm payload + init time acceptable for the Tauri webview (M3)?',
    '',
    '## Raw compiled output',
    '```js',
    code.trim(),
    '```',
  ].join('\n');

  writeFileSync(new URL('./FINDINGS.md', import.meta.url), findings);
  console.log(findings.split('\n## Raw')[0]);
  await esbuild.stop();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 4: Create a placeholder findings file**

Create `spikes/esbuild-wasm-blocks/FINDINGS.md` with a single line so the file exists before the run overwrites it:
```md
# esbuild-wasm block-compile spike — findings (run `pnpm --filter spike-esbuild-wasm-blocks spike` to populate)
```

- [ ] **Step 5: Install and run the spike**

Run:
```bash
pnpm install
pnpm --filter spike-esbuild-wasm-blocks spike
```
Expected: console prints the metrics block; `spikes/esbuild-wasm-blocks/FINDINGS.md` is populated with init/compile timings, output size, wasm payload size, and the compiled ESM. Confirm `output is ESM exporting the component: yes`.

- [ ] **Step 6: Fill in the verdict and commit**

Edit `spikes/esbuild-wasm-blocks/FINDINGS.md` — replace the `TODO after running` line under `## Verdict` with a one/two-sentence go/no-go judgement based on the numbers (e.g. "~10 MB wasm + ~400 ms cold init is acceptable for a desktop webview; compile per block <50 ms. Go."). No changeset (spike is not a published package).
```bash
git add pnpm-workspace.yaml spikes/esbuild-wasm-blocks pnpm-lock.yaml
git commit -m "spike: prove esbuild-wasm compiles block TSX at runtime (M3 de-risk)"
```

---

## Task 8: Changeset + green gate

**Files:**
- Create: `.changeset/inverse-scaffold-doc-entry.md`

- [ ] **Step 1: Write the changeset**

Create `.changeset/inverse-scaffold-doc-entry.md` (match the terse one-line style of existing changesets):
```md
---
'@open-slide/core': minor
---

Add a React-free `@open-slide/core/doc` entry for the document model, inverse-ops (`invertOp`/`applyOpWithInverse`) for undo/redo, and layout-aware slide scaffolding (`buildSlide`/`addSlideFromLayout`).
```

- [ ] **Step 2: Full green gate across the graph**

Run: `pnpm exec vitest run && pnpm core typecheck && pnpm core build && pnpm check`
Expected: all PASS — tests green (incl. boundary guard with all 10 modules), typecheck clean, build emits `dist/doc/pure.js`, biome clean.

- [ ] **Step 3: Commit**

```bash
git add .changeset/inverse-scaffold-doc-entry.md
git commit -m "chore: changeset for doc entry, inverse-ops, and scaffolding"
```

---

## Self-Review (completed during authoring)

- **Spec coverage:** M0 in the spec = (a) `core/doc` pure vs `core/runtime` boundary → Tasks 1–4; (b) one ops surface + convenience ops (`add_slide_from_layout`) → Task 6 (+ `pure.ts` surface in Task 4); (c) inverse-ops for undo → Task 5; (d) esbuild-wasm spike → Task 7. `create_block` convenience op is intentionally deferred to M2/M5 (it writes component files, not deck mutations) — noted in the spec roadmap.
- **Placeholder scan:** no TBD/TODO in shipped code; the only `TODO` is inside the spike's generated FINDINGS template, resolved in Task 7 Step 6.
- **Type consistency:** `EditOp`, `Deck`, `Slide`, `Block` come from existing modules; `invertOp(before, op)`, `applyOpWithInverse(deck, op)`, `buildSlide(layout, slots, id?)`, `addSlideFromLayout({layout, slots, index, id?})` are used identically in tests and implementations.
- **Boundary-test mid-stream state:** the guard test references `inverse.ts`/`scaffold.ts` before they exist (Task 4) and goes fully green at Task 6 — called out explicitly in Task 4 Step 6 and Task 6 Step 6.
```
