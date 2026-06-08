# M1b — Canvas Selection + In-Place WYSIWYG Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the new editor's canvas directly manipulable — click to select any block (with a selection ring + contextual toolbar for move/duplicate/delete), and double-click to edit its text in place with real typography — driven by a general `data-osd-text` block contract so built-in *and* agent-authored custom blocks are editable through one mechanism.

**Architecture:** Replace the canvas's use of `renderDeck`'s regenerated `Page` functions with a stable, keyed editor renderer (`SlideView`/`BlockView`) so edits reconcile in place instead of remounting (fixing the M1a caret hazard). A block opts an element into in-place editing by tagging it `data-osd-text="<propKey>"`; on double-click the editor makes that exact element `contentEditable='plaintext-only'`, the memoized `BlockView` skips re-rendering while the field is being edited (so React never fights the caret), and blur/Enter commits one `update-block-props` op. Selection lives in the store (M1a); editing state is added to the store. Block-level ops (move/duplicate/delete) are built by pure, tested helpers.

**Tech Stack:** React 18 (`memo`, refs, `contentEditable`), TypeScript, Vitest (node env; React-in-node via `react-dom/server`'s `renderToStaticMarkup`), Biome, Changesets. Reuses the M1a store/host, `getBlock`/`getLayout`/`UnknownBlock`/`MissingLayout`, `normalizeDesign`, `freshId`.

**Branch:** Implement on a fresh branch off `main` (e.g. `feat/m1b-canvas-editing`). If using worktrees, create it via superpowers:using-git-worktrees first.

**Conventions:** Biome must pass (`pnpm check`) before each commit. Every commit message ends with a blank line then the trailer:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```
(Omitted from the commands below for brevity — add it to each.)

**Boundary discipline (same as M1a):** node-tested modules import only relative paths and stay React-free (vitest is node env, no `@` alias) — enforced by `editor/pure.boundary.test.ts`. Browser-only files (`*.tsx`, anything using `@/`/`contentEditable`) are verified by `pnpm core typecheck` + the Task 10 real-browser pass, and must NOT be added to the guard.

**Scope note:** add-block (slot drop targets + block-type picker) and dnd-kit drag-reorder are deferred to the M1b follow-up plan; reordering here is via the contextual toolbar (↑/↓). Bullets/array-prop and decorative-field editing remain inspector-only (M1c).

---

## File Structure

**Created:**
- `packages/core/src/app/editor/block-ops.ts` — pure helpers: `findBlock`, `moveBlockOp`, `duplicateBlockOp` (build `EditOp`s for the toolbar).
- `packages/core/src/app/editor/block-ops.test.ts` — tests for the helpers.
- `packages/core/src/app/editor/slide-view.tsx` — stable, keyed editor renderer (`SlideView` + memoized `BlockView`) with in-place editing.
- `packages/core/src/app/editor/block-toolbar.tsx` — contextual toolbar (move ↑/↓, duplicate, delete) anchored to the selected block.

**Modified:**
- `packages/core/src/doc/blocks/heading.tsx`, `text.tsx`, `callout.tsx`, `code.tsx`, `quote.tsx`, `stat.tsx` — tag editable text elements with `data-osd-text`.
- `packages/core/src/doc/blocks/blocks.test.tsx` — assert the tags render.
- `packages/core/src/doc/ids.ts` — add `cloneBlockWithFreshId`.
- `packages/core/src/doc/ids.test.ts` — test it.
- `packages/core/src/doc/pure.ts` + `packages/core/src/doc/index.ts` + `packages/core/src/index.ts` — export `cloneBlockWithFreshId`.
- `packages/core/src/app/editor/editor-store.ts` — add `editing` state + `startEdit`/`commitEdit`/`cancelEdit`.
- `packages/core/src/app/editor/editor-store.test.ts` — test editing lifecycle.
- `packages/core/src/app/editor/pure.boundary.test.ts` — add `block-ops.ts` to the guarded set.
- `packages/core/src/app/editor/editor-canvas.tsx` — render via `SlideView`; click-select; double-click→startEdit; mount the toolbar.
- `packages/core/src/app/routes/slide.tsx` — editor owns its load/empty/error states (early full-screen return; no double header / double load gating).
- `.changeset/m1b-canvas-editing.md` — changeset.

**Relative-path cheat-sheet (from `src/app/editor/`):** doc layer = `../../doc/...`; `@/...` = `src/app/...` (browser/tsc only).

---

## Task 1: `data-osd-text` contract — tag built-in blocks

A block opts an element into in-place editing by tagging it `data-osd-text="<propKey>"`, where the element's text content is exactly `String(block.props[propKey] ?? '')`. This is the general mechanism the editor keys on (built-ins now; custom/agent blocks by adding the same attribute).

**Files:**
- Modify: `packages/core/src/doc/blocks/heading.tsx`, `text.tsx`, `callout.tsx`, `code.tsx`, `quote.tsx`, `stat.tsx`
- Modify: `packages/core/src/doc/blocks/blocks.test.tsx`

- [ ] **Step 1: Write the failing tests**

Open `packages/core/src/doc/blocks/blocks.test.tsx`. It uses `renderToStaticMarkup` from `react-dom/server`. Append these tests (adapt the existing import block if `createElement`/`renderToStaticMarkup`/the block components aren't already imported — import each block from `./index.ts`):
```tsx
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { Block } from '../model.ts';
import { Callout, Code, Heading, Quote, Stat, Text } from './index.ts';

const b = (type: string, props: Record<string, unknown>): Block => ({ id: 'b1', type, props });

test('heading tags its text element for in-place editing', () => {
  const html = renderToStaticMarkup(createElement(Heading, { block: b('heading', { text: 'Hi' }) }));
  expect(html).toContain('data-osd-text="text"');
  expect(html).toContain('Hi');
});

test('text tags its text element', () => {
  const html = renderToStaticMarkup(createElement(Text, { block: b('text', { text: 'Body' }) }));
  expect(html).toContain('data-osd-text="text"');
});

test('callout tags its text element', () => {
  const html = renderToStaticMarkup(createElement(Callout, { block: b('callout', { text: 'Note' }) }));
  expect(html).toContain('data-osd-text="text"');
});

test('code tags its code element', () => {
  const html = renderToStaticMarkup(createElement(Code, { block: b('code', { code: 'x=1' }) }));
  expect(html).toContain('data-osd-text="code"');
});

test('quote tags only the inner text, not the decorative quote marks', () => {
  const html = renderToStaticMarkup(createElement(Quote, { block: b('quote', { text: 'Wisdom' }) }));
  expect(html).toContain('data-osd-text="text"');
  // the tagged span must contain exactly the prop text (quotes are siblings, not inside it)
  expect(html).toMatch(/data-osd-text="text"[^>]*>Wisdom</);
});

test('stat tags value, label, and caption independently', () => {
  const html = renderToStaticMarkup(
    createElement(Stat, { block: b('stat', { value: '98%', label: 'Uptime', caption: 'last 30d' }) }),
  );
  expect(html).toContain('data-osd-text="value"');
  expect(html).toContain('data-osd-text="label"');
  expect(html).toContain('data-osd-text="caption"');
});
```
(If `blocks.test.tsx` already imports some of these, merge rather than duplicate imports.)

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm exec vitest run packages/core/src/doc/blocks/blocks.test.tsx`
Expected: FAIL — the `data-osd-text` assertions fail (attribute not present yet).

- [ ] **Step 3: Tag `heading.tsx`**

In `packages/core/src/doc/blocks/heading.tsx`, add `data-osd-text="text"` to the `<h2>`:
```tsx
    <h2
      data-osd-text="text"
      style={{
```

- [ ] **Step 4: Tag `text.tsx`**

In `packages/core/src/doc/blocks/text.tsx`, add `data-osd-text="text"` to the `<p>`:
```tsx
    <p
      data-osd-text="text"
      style={{
```

- [ ] **Step 5: Tag `callout.tsx`**

In `packages/core/src/doc/blocks/callout.tsx`, add `data-osd-text="text"` to the `<span>`:
```tsx
    <span
      data-osd-text="text"
      style={{
```

- [ ] **Step 6: Tag `code.tsx`**

In `packages/core/src/doc/blocks/code.tsx`, tag the inner `<code>` (its text is exactly `props.code`):
```tsx
      <code data-osd-text="code">{String(block.props.code ?? '')}</code>
```

- [ ] **Step 7: Tag `quote.tsx` (keep decorative quotes OUTSIDE the tagged element)**

In `packages/core/src/doc/blocks/quote.tsx`, replace the `<blockquote>…</blockquote>` body so the curly quotes are siblings of a tagged `<span>` whose text is exactly `props.text`:
```tsx
      <blockquote
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 'calc(var(--osd-size-body) * 1.6)',
          color: 'var(--osd-text)',
          lineHeight: 1.3,
          margin: 0,
        }}
      >
        “<span data-osd-text="text">{text}</span>”
      </blockquote>
```

- [ ] **Step 8: Tag `stat.tsx` (value, label, caption)**

In `packages/core/src/doc/blocks/stat.tsx`, add the matching `data-osd-text` to each of the three `<div>`s:
- the value div: `<div data-osd-text="value" style={{ … }}>{value}</div>`
- the label div: `<div data-osd-text="label" style={{ … }}>{label}</div>`
- the caption div: `<div data-osd-text="caption" style={{ … }}>{caption}</div>`

(Add the attribute as the first prop on each existing `<div>`; leave the `style` objects unchanged.)

- [ ] **Step 9: Run tests to verify they pass + full suite (viewer unaffected)**

Run: `pnpm exec vitest run packages/core/src/doc && pnpm core typecheck`
Expected: PASS — new tag assertions pass; existing block/render/layout tests still pass (adding a data attribute does not change rendered text or break the viewer).

- [ ] **Step 10: Biome + commit**

```bash
pnpm check
git add packages/core/src/doc/blocks
git commit -m "feat(core): tag built-in block text with data-osd-text for in-place editing"
```

---

## Task 2: `cloneBlockWithFreshId` in `doc/ids.ts`

Duplicate needs a fresh-id block clone (mirror of `cloneSlideWithFreshIds`). Pure + reusable by the ops API later.

**Files:**
- Modify: `packages/core/src/doc/ids.ts`
- Modify: `packages/core/src/doc/ids.test.ts`
- Modify: `packages/core/src/doc/pure.ts`, `packages/core/src/doc/index.ts`, `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

In `packages/core/src/doc/ids.test.ts`, add (it already imports from `./ids.ts` and `./model.ts`; extend the imports with `cloneBlockWithFreshId` and `Block`):
```ts
import { cloneBlockWithFreshId } from './ids.ts';
import type { Block } from './model.ts';

describe('cloneBlockWithFreshId', () => {
  it('gives the block a new id while preserving type and props', () => {
    const block: Block = { id: 'b1', type: 'heading', props: { text: 'Hi' } };
    const clone = cloneBlockWithFreshId(block);
    expect(clone.id).not.toBe('b1');
    expect(clone.id.startsWith('b-')).toBe(true);
    expect(clone.type).toBe('heading');
    expect(clone.props).toEqual({ text: 'Hi' });
    expect(clone.props).not.toBe(block.props);
  });
});
```
(If `ids.test.ts` already imports `describe`/`it`/`expect` and `Block`, merge.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run packages/core/src/doc/ids.test.ts`
Expected: FAIL — `cloneBlockWithFreshId` not exported.

- [ ] **Step 3: Implement it**

In `packages/core/src/doc/ids.ts`, add (it already imports `Block`? it imports `Slide`; add `Block` to that type import) and append:
```ts
export function cloneBlockWithFreshId(block: Block): Block {
  const copy = structuredClone(block);
  copy.id = freshId('b');
  return copy;
}
```
Ensure the top import reads `import type { Block, Slide } from './model.ts';`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm exec vitest run packages/core/src/doc/ids.test.ts`
Expected: PASS.

- [ ] **Step 5: Export from the barrels**

In `packages/core/src/doc/pure.ts`, change the ids export line to include the new fn:
```ts
export { cloneBlockWithFreshId, cloneSlideWithFreshIds, freshId } from './ids.ts';
```
In `packages/core/src/doc/index.ts`, do the same for its `./ids.ts` re-export. In `packages/core/src/index.ts`, add `cloneBlockWithFreshId` to the alphabetized re-export from `./doc/index.ts`.

- [ ] **Step 6: Suite + typecheck + biome + commit**

Run: `pnpm exec vitest run && pnpm core typecheck && pnpm check`
Expected: PASS (incl. the doc pure-boundary guard — `ids.ts` stays React-free).
```bash
git add packages/core/src/doc/ids.ts packages/core/src/doc/ids.test.ts packages/core/src/doc/pure.ts packages/core/src/doc/index.ts packages/core/src/index.ts
git commit -m "feat(core): cloneBlockWithFreshId for block duplication"
```

---

## Task 3: Pure block-op helpers (`editor/block-ops.ts`)

The toolbar (Task 8) builds ops via these pure helpers, so the op logic is node-tested rather than buried in a component.

**Files:**
- Create: `packages/core/src/app/editor/block-ops.ts`
- Create: `packages/core/src/app/editor/block-ops.test.ts`
- Modify: `packages/core/src/app/editor/pure.boundary.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/app/editor/block-ops.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { defaultDesign } from '../../doc/design.ts';
import type { Deck } from '../../doc/model.ts';
import { duplicateBlockOp, findBlock, moveBlockOp } from './block-ops.ts';

function makeDeck(): Deck {
  return {
    schemaVersion: 1,
    meta: { title: 'D', createdAt: '2026-01-01T00:00:00.000Z' },
    design: defaultDesign,
    slides: [
      {
        id: 's1',
        layout: 'title-body',
        slots: {
          title: [{ id: 'b1', type: 'heading', props: { text: 'A' } }],
          body: [
            { id: 'b2', type: 'text', props: { text: 'one' } },
            { id: 'b3', type: 'text', props: { text: 'two' } },
          ],
        },
      },
    ],
  };
}

describe('findBlock', () => {
  it('locates a block by id', () => {
    expect(findBlock(makeDeck(), 'b3')).toEqual({ slideId: 's1', slot: 'body', index: 1 });
  });
  it('returns null for an unknown id', () => {
    expect(findBlock(makeDeck(), 'nope')).toBeNull();
  });
});

describe('moveBlockOp', () => {
  it('moves a block down within its slot', () => {
    const op = moveBlockOp(makeDeck(), 'b2', 'down');
    expect(op).toEqual({
      kind: 'set-slot-blocks',
      slideId: 's1',
      slot: 'body',
      blocks: [
        { id: 'b3', type: 'text', props: { text: 'two' } },
        { id: 'b2', type: 'text', props: { text: 'one' } },
      ],
    });
  });
  it('moves a block up within its slot', () => {
    const op = moveBlockOp(makeDeck(), 'b3', 'up');
    expect(op?.kind).toBe('set-slot-blocks');
    if (op?.kind === 'set-slot-blocks') {
      expect(op.blocks.map((b) => b.id)).toEqual(['b3', 'b2']);
    }
  });
  it('returns null at the slot boundary (cannot move up the first block)', () => {
    expect(moveBlockOp(makeDeck(), 'b2', 'up')).toBeNull();
    expect(moveBlockOp(makeDeck(), 'b3', 'down')).toBeNull();
  });
});

describe('duplicateBlockOp', () => {
  it('inserts a fresh-id clone immediately after the original', () => {
    const op = duplicateBlockOp(makeDeck(), 'b2');
    expect(op?.kind).toBe('add-block');
    if (op?.kind === 'add-block') {
      expect(op.slideId).toBe('s1');
      expect(op.slot).toBe('body');
      expect(op.index).toBe(1);
      expect(op.block.id).not.toBe('b2');
      expect(op.block.props).toEqual({ text: 'one' });
    }
  });
  it('returns null for an unknown id', () => {
    expect(duplicateBlockOp(makeDeck(), 'nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm exec vitest run packages/core/src/app/editor/block-ops.test.ts`
Expected: FAIL — `./block-ops.ts` does not exist.

- [ ] **Step 3: Implement `block-ops.ts`**

Create `packages/core/src/app/editor/block-ops.ts`:
```ts
import { cloneBlockWithFreshId } from '../../doc/ids.ts';
import type { Deck } from '../../doc/model.ts';
import type { EditOp } from '../../doc/ops.ts';

export type BlockLocation = { slideId: string; slot: string; index: number };

export function findBlock(deck: Deck, blockId: string): BlockLocation | null {
  for (const slide of deck.slides) {
    for (const slot of Object.keys(slide.slots)) {
      const index = slide.slots[slot].findIndex((b) => b.id === blockId);
      if (index !== -1) return { slideId: slide.id, slot, index };
    }
  }
  return null;
}

export function moveBlockOp(deck: Deck, blockId: string, dir: 'up' | 'down'): EditOp | null {
  const loc = findBlock(deck, blockId);
  if (!loc) return null;
  const slide = deck.slides.find((s) => s.id === loc.slideId);
  if (!slide) return null;
  const blocks = [...slide.slots[loc.slot]];
  const to = dir === 'up' ? loc.index - 1 : loc.index + 1;
  if (to < 0 || to >= blocks.length) return null;
  const [moved] = blocks.splice(loc.index, 1);
  blocks.splice(to, 0, moved);
  return { kind: 'set-slot-blocks', slideId: loc.slideId, slot: loc.slot, blocks };
}

export function duplicateBlockOp(deck: Deck, blockId: string): EditOp | null {
  const loc = findBlock(deck, blockId);
  if (!loc) return null;
  const slide = deck.slides.find((s) => s.id === loc.slideId);
  if (!slide) return null;
  const original = slide.slots[loc.slot][loc.index];
  return {
    kind: 'add-block',
    slideId: loc.slideId,
    slot: loc.slot,
    index: loc.index + 1,
    block: cloneBlockWithFreshId(original),
  };
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm exec vitest run packages/core/src/app/editor/block-ops.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Add `block-ops.ts` to the pure-boundary guard**

In `packages/core/src/app/editor/pure.boundary.test.ts`, add `'block-ops.ts'` to the `PURE_MODULES` array:
```ts
const PURE_MODULES = ['deck-host.ts', 'memory-host.ts', 'history.ts', 'editor-store.ts', 'block-ops.ts'];
```

- [ ] **Step 6: Suite + typecheck + biome + commit**

Run: `pnpm exec vitest run packages/core/src/app/editor && pnpm core typecheck && pnpm check`
Expected: PASS (incl. the boundary guard now covering `block-ops.ts`).
```bash
git add packages/core/src/app/editor/block-ops.ts packages/core/src/app/editor/block-ops.test.ts packages/core/src/app/editor/pure.boundary.test.ts
git commit -m "feat(core): pure block-op helpers (find/move/duplicate)"
```

---

## Task 4: Editing state in the store

Add an editing lifecycle to the store so double-click→edit→commit is testable and coordinates with selection. `startEdit` also selects; `commitEdit` writes one `update-block-props` op and clears; `cancelEdit` just clears.

**Files:**
- Modify: `packages/core/src/app/editor/editor-store.ts`
- Modify: `packages/core/src/app/editor/editor-store.test.ts`

- [ ] **Step 1: Write the failing tests**

In `packages/core/src/app/editor/editor-store.test.ts`, append inside the existing `describe('createEditorStore', …)` block:
```ts
  it('startEdit sets the editing field and selects the block', () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: makeDeck() });
    store.startEdit('b1', 'text');
    expect(store.getState().editing).toEqual({ blockId: 'b1', field: 'text' });
    expect(store.getState().selectedBlockId).toBe('b1');
    store.dispose();
  });

  it('commitEdit writes update-block-props for the edited field and clears editing', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: await host.loadDeck('s1') });
    store.startEdit('b1', 'text');
    store.commitEdit('Edited');
    expect(store.getState().editing).toBeNull();
    expect(store.getState().deck.slides[0].slots.title[0].props.text).toBe('Edited');
    expect(store.getState().canUndo).toBe(true);
    store.dispose();
  });

  it('commitEdit is a no-op when not editing', () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: makeDeck() });
    store.commitEdit('x');
    expect(store.getState().canUndo).toBe(false);
    store.dispose();
  });

  it('cancelEdit clears editing without applying an op', () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: makeDeck() });
    store.startEdit('b1', 'text');
    store.cancelEdit();
    expect(store.getState().editing).toBeNull();
    expect(store.getState().canUndo).toBe(false);
    store.dispose();
  });
```
Note: the existing `makeDeck()` in this test file has slide `s1` with `slots.title = [{ id: 'b1', type: 'heading', props: { text: 'Hi' } }]` — these tests rely on `b1` existing in `title`. (If the existing `makeDeck` differs, adjust the block id/slot in these tests to match it.)

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm exec vitest run packages/core/src/app/editor/editor-store.test.ts`
Expected: FAIL — `editing`/`startEdit`/`commitEdit`/`cancelEdit` don't exist.

- [ ] **Step 3: Extend the store**

In `packages/core/src/app/editor/editor-store.ts`:

(a) Add `editing` to `EditorState`:
```ts
export type EditorState = {
  deck: Deck;
  selectedBlockId: string | null;
  editing: { blockId: string; field: string } | null;
  saveState: FlushState;
  error: string | null;
  canUndo: boolean;
  canRedo: boolean;
};
```

(b) Add the methods to `EditorStore`:
```ts
export type EditorStore = {
  getState: () => EditorState;
  subscribe: (listener: () => void) => () => void;
  apply: (ops: EditOp | EditOp[]) => void;
  select: (blockId: string | null) => void;
  startEdit: (blockId: string, field: string) => void;
  commitEdit: (value: string) => void;
  cancelEdit: () => void;
  undo: () => void;
  redo: () => void;
  flushNow: () => void;
  dispose: () => void;
};
```

(c) Add an `editing` local + include it in the snapshot. Next to `let selectedBlockId: string | null = null;` add:
```ts
  let editing: { blockId: string; field: string } | null = null;
```
In the `snapshot()` object add `editing,` (e.g. right after `selectedBlockId,`).

(d) Implement the three methods in the returned object (place after `select`):
```ts
    startEdit(blockId, field) {
      selectedBlockId = blockId;
      editing = { blockId, field };
      emit();
    },
    commitEdit(value) {
      const e = editing;
      editing = null;
      if (!e) {
        emit();
        return;
      }
      this.apply({ kind: 'update-block-props', blockId: e.blockId, props: { [e.field]: value } });
    },
    cancelEdit() {
      editing = null;
      emit();
    },
```
Note: `this.apply(...)` calls the object's own `apply` (which pushes history, enqueues, and emits — so editing is already `null` when it emits). If the surrounding object literal style makes `this` awkward, hoist `apply` into a local `const apply = (ops) => {…}` and call `apply(...)` from both the `apply` member and `commitEdit`; either is fine as long as `commitEdit` ends up applying the op and emitting once.

(e) When an external change is adopted (the `host.subscribe` handler) and when `dispose` runs, also clear `editing` for consistency: in the subscribe handler add `editing = null;` next to `selectedBlockId = null;`.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm exec vitest run packages/core/src/app/editor/editor-store.test.ts`
Expected: PASS (all four new cases + the existing ones).

- [ ] **Step 5: Suite + typecheck + biome + commit**

Run: `pnpm exec vitest run && pnpm core typecheck && pnpm check`
Expected: PASS (incl. boundary guard — store stays React-free).
```bash
git add packages/core/src/app/editor/editor-store.ts packages/core/src/app/editor/editor-store.test.ts
git commit -m "feat(core): editing lifecycle in the editor store (start/commit/cancel)"
```

---

## Task 5: Stable editor renderer (`SlideView` + `BlockView`)

Replace the canvas's `renderDeck`-Page approach with stable, keyed React components so edits reconcile in place (fixes the M1a remount). This task renders blocks stably and memoized; in-place editing is wired in Task 7.

**Files:**
- Create: `packages/core/src/app/editor/slide-view.tsx`

- [ ] **Step 1: Create `slide-view.tsx`**

```tsx
import { memo } from 'react';
import { UnknownBlock } from '../../doc/blocks/index.ts';
import { MissingLayout } from '../../doc/layouts/index.ts';
import type { Block, Slide } from '../../doc/model.ts';
import { getBlock, getLayout } from '../../doc/registry.ts';

export type BlockViewProps = {
  block: Block;
  editingField: string | null;
  onCommitEdit: (value: string) => void;
  onCancelEdit: () => void;
};

export const BlockView = memo(function BlockView({ block }: BlockViewProps) {
  const Component = getBlock(block.type);
  return (
    <div data-osd-block-id={block.id} style={{ display: 'contents' }}>
      {Component ? <Component block={block} /> : <UnknownBlock type={block.type} />}
    </div>
  );
});

export function SlideView({
  slide,
  editing,
  onCommitEdit,
  onCancelEdit,
}: {
  slide: Slide;
  editing: { blockId: string; field: string } | null;
  onCommitEdit: (value: string) => void;
  onCancelEdit: () => void;
}) {
  const entry = getLayout(slide.layout);
  if (!entry) return <MissingLayout layout={slide.layout} />;
  const Layout = entry.component;
  const renderSlot = (name: string) =>
    (slide.slots[name] ?? []).map((b) => (
      <BlockView
        key={b.id}
        block={b}
        editingField={editing?.blockId === b.id ? editing.field : null}
        onCommitEdit={onCommitEdit}
        onCancelEdit={onCancelEdit}
      />
    ));
  return <Layout slide={slide} renderSlot={renderSlot} />;
}
```
Note: `BlockView` is `memo`'d and receives `block` (a new reference only when that block changes), `editingField` (a primitive), and the two callbacks (which the canvas will pass as *stable* store methods in Task 6). So when an unrelated state change re-renders the canvas, blocks whose `block`/`editingField` are unchanged skip reconciliation — the property that keeps the caret alive during editing (Task 7). The `editingField`/callbacks are unused in this task's `BlockView` body (Task 7 uses them); that's expected — they're part of the stable prop contract now so Task 7 is a localized change.

- [ ] **Step 2: Typecheck + biome + commit**

Run: `pnpm core typecheck && pnpm check`
Expected: PASS. (`editingField`/`onCommitEdit`/`onCancelEdit` are declared in `BlockViewProps` and passed through; biome may warn about unused destructured props — destructure only `block` in `BlockView` for now, as written above, so the others are accepted via the typed props object without being flagged. If biome flags unused props on the type, that's fine; if it flags an unused *binding*, ensure you only bind `{ block }`.)
```bash
git add packages/core/src/app/editor/slide-view.tsx
git commit -m "feat(core): stable keyed SlideView/BlockView editor renderer"
```

---

## Task 6: Canvas renders via `SlideView` + selection + double-click-to-edit

Rewire `EditorCanvas` to render the current slide with `SlideView` (no more `renderDeck` Page remounts), keep single-click selection + the selection ring, and add double-click → `startEdit` on the tagged text element. Pass the store's *stable* `commitEdit`/`cancelEdit` to `SlideView`.

**Files:**
- Modify: `packages/core/src/app/editor/editor-canvas.tsx`

- [ ] **Step 1: Replace `editor-canvas.tsx`**

```tsx
import { type MouseEvent, useEffect, useRef } from 'react';
import { SlideCanvas } from '@/components/slide-canvas';
import { normalizeDesign } from '../../doc/design.ts';
import type { EditorState, EditorStore } from './editor-store.ts';
import { SlideView } from './slide-view.tsx';

export function EditorCanvas({
  store,
  state,
  index,
}: {
  store: EditorStore;
  state: EditorState;
  index: number;
}) {
  const slide = state.deck.slides[index];
  const rootRef = useRef<HTMLDivElement>(null);

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest('[data-osd-block-id]');
    store.select(el?.getAttribute('data-osd-block-id') ?? null);
  };

  const onDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    const textEl = (e.target as HTMLElement).closest('[data-osd-text]');
    if (!textEl) return;
    const field = textEl.getAttribute('data-osd-text');
    const blockEl = textEl.closest('[data-osd-block-id]');
    const blockId = blockEl?.getAttribute('data-osd-block-id');
    if (field && blockId) store.startEdit(blockId, field);
  };

  // Selection ring: block wrappers are display:contents (no box), so outline the
  // wrapper's firstElementChild. Cleared/re-applied whenever selection or content changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: state.deck and index re-render the canvas DOM the effect queries, so the ring must re-apply when they change.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    for (const el of root.querySelectorAll('[data-osd-block-id]')) {
      const selected = el.getAttribute('data-osd-block-id') === state.selectedBlockId;
      const target = (el.firstElementChild as HTMLElement | null) ?? (el as HTMLElement);
      target.style.outline = selected ? '2px solid var(--osd-accent, #4f7cff)' : '';
      target.style.outlineOffset = selected ? '2px' : '';
    }
  }, [state.selectedBlockId, state.deck, index]);

  if (!slide) return null;

  return (
    <SlideCanvas design={normalizeDesign(state.deck.design)}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: canvas click/double-click to select/edit is intentionally a plain div — no semantic role fits this pattern */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard editing is handled by the shell keydown handler + contentEditable; canvas pointer handlers are a convenience */}
      <div
        ref={rootRef}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        style={{ width: '100%', height: '100%' }}
      >
        <SlideView
          slide={slide}
          editing={state.editing}
          onCommitEdit={store.commitEdit}
          onCancelEdit={store.cancelEdit}
        />
      </div>
    </SlideCanvas>
  );
}
```
Note: `store.commitEdit`/`store.cancelEdit` are stable references (defined once when the store is created), so passing them keeps `BlockView`'s memo effective.

- [ ] **Step 2: Typecheck + biome + commit**

Run: `pnpm core typecheck && pnpm check`
Expected: PASS.
```bash
git add packages/core/src/app/editor/editor-canvas.tsx
git commit -m "feat(core): canvas renders via SlideView with select + double-click-to-edit"
```

---

## Task 7: In-place `contentEditable` editing in `BlockView`

The headline. When `BlockView`'s `editingField` is set, make the matching `[data-osd-text="<field>"]` element `contentEditable`, focus + select it, and commit `innerText` on blur/Enter (Escape cancels). Because no op is dispatched until commit, the block's props don't change during the session and the memoized `BlockView` doesn't re-render — so React never resets the caret.

**Files:**
- Modify: `packages/core/src/app/editor/slide-view.tsx`

- [ ] **Step 1: Add the editing effect to `BlockView`**

Replace the `BlockView` definition in `packages/core/src/app/editor/slide-view.tsx` with:
```tsx
export const BlockView = memo(function BlockView({
  block,
  editingField,
  onCommitEdit,
  onCancelEdit,
}: BlockViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: block.id keys the editable target; onCommitEdit/onCancelEdit are stable store methods. We intentionally re-run only when the edited field or block identity changes — not on every block prop change (which would fight the caret).
  useEffect(() => {
    if (editingField === null) return;
    const el = ref.current?.querySelector(
      `[data-osd-text="${CSS.escape(editingField)}"]`,
    ) as HTMLElement | null;
    if (!el) return;

    el.contentEditable = 'plaintext-only';
    el.focus();
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    let cancelled = false;
    const finish = () => {
      el.contentEditable = 'inherit';
      if (cancelled) onCancelEdit();
      else onCommitEdit(el.innerText);
    };
    const onBlur = () => finish();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        el.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelled = true;
        el.blur();
      }
    };
    el.addEventListener('blur', onBlur);
    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('blur', onBlur);
      el.removeEventListener('keydown', onKeyDown);
      el.contentEditable = 'inherit';
    };
  }, [editingField, block.id, onCommitEdit, onCancelEdit]);

  const Component = getBlock(block.type);
  return (
    <div ref={ref} data-osd-block-id={block.id} style={{ display: 'contents' }}>
      {Component ? <Component block={block} /> : <UnknownBlock type={block.type} />}
    </div>
  );
});
```
Add `useEffect`, `useRef` to the React import at the top of the file:
```tsx
import { memo, useEffect, useRef } from 'react';
```

- [ ] **Step 2: Typecheck + biome**

Run: `pnpm core typecheck && pnpm check`
Expected: PASS. (`CSS.escape`, `window.getSelection`, `document.createRange` are DOM globals available under tsconfig's `vite/client`/dom lib; this file is browser-only.)

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/app/editor/slide-view.tsx
git commit -m "feat(core): in-place contentEditable text editing in BlockView"
```

---

## Task 8: Contextual block toolbar (move / duplicate / delete)

A floating toolbar anchored above the selected block, with move ↑/↓, duplicate, delete — building ops via the Task 3 helpers.

**Files:**
- Create: `packages/core/src/app/editor/block-toolbar.tsx`
- Modify: `packages/core/src/app/editor/editor-canvas.tsx`

- [ ] **Step 1: Create `block-toolbar.tsx`**

```tsx
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { duplicateBlockOp, moveBlockOp } from './block-ops.ts';
import type { EditorState, EditorStore } from './editor-store.ts';

export function BlockToolbar({
  store,
  state,
  containerRef,
}: {
  store: EditorStore;
  state: EditorState;
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const id = state.selectedBlockId;
  if (!id || state.editing) return null;
  const container = containerRef.current;
  const blockEl = container?.querySelector(`[data-osd-block-id="${CSS.escape(id)}"]`);
  const target = (blockEl?.firstElementChild as HTMLElement | null) ?? null;
  if (!container || !target) return null;

  const cRect = container.getBoundingClientRect();
  const bRect = target.getBoundingClientRect();
  const top = bRect.top - cRect.top - 40;
  const left = bRect.left - cRect.left;

  const move = (dir: 'up' | 'down') => {
    const op = moveBlockOp(state.deck, id, dir);
    if (op) store.apply(op);
  };
  const duplicate = () => {
    const op = duplicateBlockOp(state.deck, id);
    if (op) {
      store.apply(op);
      if (op.kind === 'add-block') store.select(op.block.id);
    }
  };
  const remove = () => {
    store.apply({ kind: 'remove-block', blockId: id });
    store.select(null);
  };

  return (
    <div
      style={{ position: 'absolute', top: Math.max(0, top), left: Math.max(0, left), zIndex: 10 }}
      className="flex items-center gap-0.5 rounded-md border border-border bg-popover p-0.5 shadow-md"
    >
      <button type="button" className="rounded p-1 hover:bg-muted" title="Move up" onClick={() => move('up')}>
        <ArrowUp className="size-3.5" />
      </button>
      <button type="button" className="rounded p-1 hover:bg-muted" title="Move down" onClick={() => move('down')}>
        <ArrowDown className="size-3.5" />
      </button>
      <button type="button" className="rounded p-1 hover:bg-muted" title="Duplicate" onClick={duplicate}>
        <Copy className="size-3.5" />
      </button>
      <button type="button" className="rounded p-1 text-destructive hover:bg-muted" title="Delete" onClick={remove}>
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
```
(`lucide-react` is already a core dependency; these icon names exist in it.)

- [ ] **Step 2: Mount the toolbar in `editor-canvas.tsx`**

In `packages/core/src/app/editor/editor-canvas.tsx`: add the import
```tsx
import { BlockToolbar } from './block-toolbar.tsx';
```
and render the toolbar as a sibling of the slide content, inside a positioned wrapper so its absolute coordinates are relative to the canvas area. Wrap the `SlideCanvas` return in a relatively-positioned container and place `<BlockToolbar>` after it:
```tsx
  return (
    <div ref={containerRef} className="relative h-full w-full">
      <SlideCanvas design={normalizeDesign(state.deck.design)}>
        {/* …existing biome-ignore comments + the onClick/onDoubleClick div with <SlideView/>… */}
      </SlideCanvas>
      <BlockToolbar store={store} state={state} containerRef={containerRef} />
    </div>
  );
```
Add a `containerRef`:
```tsx
  const containerRef = useRef<HTMLDivElement>(null);
```
(Keep `rootRef` on the inner content div for the selection-ring effect; `containerRef` is the outer positioned box the toolbar measures against.)

- [ ] **Step 3: Typecheck + biome + commit**

Run: `pnpm core typecheck && pnpm check`
Expected: PASS.
```bash
git add packages/core/src/app/editor/block-toolbar.tsx packages/core/src/app/editor/editor-canvas.tsx
git commit -m "feat(core): contextual block toolbar (move/duplicate/delete)"
```

---

## Task 9: Editor owns its load / empty / error states

M1a mounted the editor inside the slide route's body ternary — *after* the legacy `useSlideModule` loader's `error`/`!slide`/`pageCount===0` guards and below the outer route header (so: deck loaded+validated twice, editor gated behind the legacy loader, empty deck shows the legacy "nothing to show" screen, and a double title/toolbar). Move the editor to an early full-screen return so it owns its own states.

**Files:**
- Modify: `packages/core/src/app/routes/slide.tsx`

- [ ] **Step 1: Remove the body-ternary branch added in M1a**

In `packages/core/src/app/routes/slide.tsx`, find the body-render ternary that currently begins:
```tsx
      {nextEditor ? (
        <EditorRoot slideId={slideId} />
      ) : view === 'assets' ? (
```
and revert it to just:
```tsx
      {view === 'assets' ? (
```
(Leave the assets / legacy-editing / viewer branches unchanged.)

- [ ] **Step 2: Add an early full-screen return before the load/error guards**

Still in `slide.tsx`: locate the first guard in the component body — the `if (error) { return … }` block (the one rendering the "failed to load" screen). Immediately BEFORE it, add:
```tsx
  if (nextEditor) {
    return (
      <div className="flex h-dvh min-h-0 flex-col">
        <EditorRoot slideId={slideId} />
      </div>
    );
  }
```
This runs after all hooks (so hook order is preserved) but before the legacy loader's `error`/`!slide`/`pageCount` guards and before the outer `<header>` — so the new editor renders full-screen and owns its own load/empty/error UI (via `useEditor`/`EditorShell`). The `nextEditor` const (added in M1a, `import.meta.env.DEV && searchParams.get('editor') === 'next'`) and the `EditorRoot` import remain.

Note: `useSlideModule(slideId)` still runs as a hook on this path but its result is unused (a harmless background load; a future `enabled` flag could skip it — out of scope here).

- [ ] **Step 3: Typecheck + biome**

Run: `pnpm core typecheck && pnpm check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/app/routes/slide.tsx
git commit -m "feat(core): new editor owns its load/empty/error states (no double header)"
```

---

## Task 10: Green gate, real-browser verification, changeset

**Files:**
- Create: `.changeset/m1b-canvas-editing.md`

- [ ] **Step 1: Full green gate**

Run: `pnpm exec vitest run && pnpm core typecheck && pnpm core build && pnpm check`
Expected: all PASS — tests green (block tags, ids, block-ops, store editing, boundary guard incl. `block-ops.ts`), typecheck clean, build emits, biome clean.

- [ ] **Step 2: Rebuild core dist + start the demo on a known-free port**

```bash
pnpm core build
```
Then start the dev server and confirm the port it actually binds (a stale server may hold 5173 → it picks 5174; verify against the printed port):
```bash
cd apps/demo && pnpm dev
```

- [ ] **Step 3: Real-browser verification (required)**

In a real browser at the dev server's actual port, open `/s/blocks-showcase?editor=next` and confirm (console open, zero errors):
  1. The editor is full-screen (no second outer header/title above it); the deck renders; the slide rail switches slides.
  2. **Single-click** a block → selection ring + a floating toolbar (↑ ↓ duplicate delete) appears above it.
  3. **Double-click** a heading/text/callout (and a stat's value/label) → it becomes editable in place with real typography; type — **the caret stays put** (no jump/blur on each keystroke); **Enter** or click-away commits; **Escape** reverts. Confirm the change persists to `apps/demo/slides/blocks-showcase/deck.json` and is a single Undo step.
  4. Toolbar **move ↑/↓** reorders within the slot; **duplicate** inserts a copy after; **delete** removes. Each is one Undo (Cmd/Ctrl-Z) step.
  5. Editing a block does NOT delete it when you press Backspace mid-text (the shell's Delete/Backspace guard respects `contentEditable`).

As an automated proxy (catches a client crash + proves the contract + persistence): headless-screenshot the URL and confirm the DOM has `data-osd-text=` attributes and no `invalid hook call`; and round-trip an `update-block-props` op through `POST /__deck/blocks-showcase` (then restore the file) to confirm the persistence path. The interaction checks above still require a human in a real browser.

If any check fails, treat it as a bug to fix (systematic-debugging), not a step to skip.

- [ ] **Step 4: Write the changeset**

Create `.changeset/m1b-canvas-editing.md`:
```md
---
'@open-slide/core': minor
---

New editor (dev preview) canvas editing: click to select a block (ring + move/duplicate/delete toolbar) and double-click to edit its text in place. Built-in block text is editable via a `data-osd-text` contract that custom blocks can opt into.
```

- [ ] **Step 5: Commit**

```bash
git add .changeset/m1b-canvas-editing.md
git commit -m "chore: changeset for M1b canvas editing"
```

---

## Self-Review (completed during authoring)

- **Spec coverage (§6.2/§6.4 canvas-editing slice):** single-click select → Task 6; selection ring + contextual toolbar (move/duplicate/delete) → Tasks 6/8; double-click in-place text edit committing `update-block-props` → Tasks 1/4/6/7; "edit any block incl. custom" → the `data-osd-text` contract (Task 1) + universal inspector fallback (M1c). **Deferred (stated in Scope note):** drag-reorder + slot drop zones + add-block picker → M1b follow-up; bullets/array + decorative-field in-place editing → M1c inspector.
- **M1a carry-overs resolved:** renderDeck Page-identity remount → Task 5 (stable keyed components) + Task 7 (memo render-skip keeps the caret); editor owns load/empty/error + no double header → Task 9.
- **Placeholder scan:** no TBD/TODO in shipped code. Comments are limited to non-obvious WHYs (the contract rationale, the memo/caret invariant) and the precedent-matching `biome-ignore`s for the canvas click/effect (same rules as the legacy `deck-editor.tsx`).
- **Type consistency:** `findBlock`/`moveBlockOp`/`duplicateBlockOp`, `cloneBlockWithFreshId`, `EditorState.editing` `{blockId, field}`, `startEdit(blockId, field)`/`commitEdit(value)`/`cancelEdit()`, `BlockView` props (`block`, `editingField`, `onCommitEdit`, `onCancelEdit`), and `SlideView` props are used identically across helpers, store, tests, and components. `set-slot-blocks`/`add-block`/`remove-block`/`update-block-props` match the `EditOp` union.
- **Green at every commit:** `block-ops.ts` is added to the pure-boundary guard in the same task that creates it (Task 3); the data-osd-text tags are additive (viewer tests stay green, Task 1 Step 9); each task ends green.
- **Caret-safety reasoning:** in-place editing dispatches NO op until commit, so the edited block's `block`/`editingField` props are stable during the session → memoized `BlockView` skips re-render → React never resets the contentEditable text/caret. Unrelated emits (save-state) re-render the canvas but the memo bails for every unchanged block. This is the core correctness property; the Task 10 browser pass verifies it for real.
