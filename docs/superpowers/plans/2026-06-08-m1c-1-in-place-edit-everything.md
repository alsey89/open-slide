# M1c-1 — In-place editing of all text (nested/array paths) + Gap A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every visible text value of a block editable in place on the slide — not just top-level scalars, but array items and nested object fields — by extending the `data-osd-text` contract from a single prop key to a dot-path, and fix the selection ring so it stays visible on full-bleed blocks (Gap A).

**Architecture:** A new pure module `text-path.ts` resolves dot-paths and builds an *existing* `update-block-props` op by immutably cloning the top-level prop value and writing the leaf. The store's `editing` state changes from `{ blockId, field }` to `{ blockId, path }`; `commitEdit` routes through `buildTextUpdateOp`. The canvas/view machinery is unchanged except that the `data-osd-text` attribute now carries a path. No new op kind, no document-model change — agents still see ordinary `update-block-props`. Built-in and demo blocks tag their nested/array text. The Gap A fix flips the selection outline to an inset offset so it can't be clipped by a full-bleed block's `overflow:hidden`.

**Tech Stack:** TypeScript, React 19, Vitest (node env for pure modules, jsdom/SSR for blocks), Vite, Biome, Changesets. Monorepo: `packages/core` (runtime), `packages/cli` (template), `apps/demo` (dogfood).

**Source of truth:** `docs/superpowers/specs/2026-06-08-m1c-edit-everything-design.md` (§3 is M1c-1). M1c-2 (inspector) and M1c-3 (slide structure + Gap B) are explicitly out of scope.

**Branch:** Work on a branch off `main` (e.g. `feat/m1c-1-edit-everything`). One changeset for the milestone (core + cli) lands in Task 7.

**Reviewer note:** Task 1 (`text-path.ts`) and Task 3 (commit semantics) are correctness-critical — use an **opus** reviewer for their spec-review and code-quality-review stages. Other tasks can use the default reviewer model.

---

## File structure

| File | Change | Responsibility |
| --- | --- | --- |
| `packages/core/src/app/editor/text-path.ts` | **create** | Pure: `getTextAtPath` (resolve dot-path → string) + `buildTextUpdateOp` (dot-path + text → `update-block-props` op, immutable). React-free. |
| `packages/core/src/app/editor/text-path.test.ts` | **create** | Node unit tests for the above (scalar, array index, nested object, array-of-objects, immutability, guards). |
| `packages/core/src/app/editor/pure.boundary.test.ts` | modify | Add `text-path.ts` to `PURE_MODULES`. |
| `packages/core/src/app/editor/block-ops.ts` | modify | Add `getBlockById(deck, blockId): Block \| null`. |
| `packages/core/src/app/editor/block-ops.test.ts` | modify | Test `getBlockById`. |
| `packages/core/src/app/editor/editor-store.ts` | modify | `editing` becomes `{ blockId, path }`; `startEdit(blockId, path)`; `commitEdit` routes through `buildTextUpdateOp`. |
| `packages/core/src/app/editor/editor-store.test.ts` | modify | Migrate `field`→`path`; add nested-commit test. |
| `packages/core/src/app/editor/slide-view.tsx` | modify | `editingField`→`editingPath`; `editing.field`→`editing.path`. |
| `packages/core/src/app/editor/editor-canvas.tsx` | modify | `onDoubleClick` reads path; **Gap A** inset ring. |
| `packages/core/src/doc/blocks/bullets.tsx` | modify | Tag each `<li>` with `data-osd-text={`items.${i}`}`. |
| `packages/core/src/doc/blocks/blocks.test.tsx` | modify | Assert bullets emits `data-osd-text="items.0"`. |
| `apps/demo/blocks/index.tsx` | modify | Tag all text (scalar + nested/array) in the pylon + beacon packs. |
| `packages/core/skills/slide-authoring/SKILL.md` | modify | Document the path form of `data-osd-text`. |
| `packages/cli/template/.agents/skills/slide-authoring/SKILL.md` | modify | Mirror the same doc edit (the two files are byte-identical). |
| `.changeset/<name>.md` | **create** | One changeset: core `minor`, cli `patch`. |

---

## Task 1: `text-path.ts` — pure path resolver + op builder  *(opus reviewer)*

**Files:**
- Create: `packages/core/src/app/editor/text-path.ts`
- Test: `packages/core/src/app/editor/text-path.test.ts`
- Modify: `packages/core/src/app/editor/pure.boundary.test.ts`

Context: `EditOp`'s `update-block-props` shape is `{ kind: 'update-block-props'; blockId: string; props: Record<string, unknown> }` (see `packages/core/src/doc/ops.ts:16`). `Block` is `{ id: string; type: string; props: Record<string, unknown> }` (`packages/core/src/doc/model.ts:14`). Paths only contain `[A-Za-z0-9_.]`; a segment that is an integer string indexes an array. The runtime reads `innerText` from the DOM at commit, so `getTextAtPath` is for tests/validation; `buildTextUpdateOp` is the write-back path.

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/app/editor/text-path.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Block } from '../../doc/model.ts';
import { buildTextUpdateOp, getTextAtPath } from './text-path.ts';

const block = (props: Record<string, unknown>): Block => ({ id: 'b1', type: 'x', props });

describe('getTextAtPath', () => {
  it('resolves a top-level scalar', () => {
    expect(getTextAtPath({ title: 'Hi' }, 'title')).toBe('Hi');
  });
  it('resolves an array index', () => {
    expect(getTextAtPath({ items: ['a', 'b', 'c'] }, 'items.1')).toBe('b');
  });
  it('resolves a nested object field', () => {
    expect(getTextAtPath({ figure: { value: '10x', label: 'faster' } }, 'figure.value')).toBe('10x');
  });
  it('resolves an array-of-objects field', () => {
    expect(getTextAtPath({ steps: [{ title: 'A' }, { title: 'B' }] }, 'steps.1.title')).toBe('B');
  });
  it('coerces non-strings to strings', () => {
    expect(getTextAtPath({ n: 42 }, 'n')).toBe('42');
  });
  it('returns empty string for a missing path', () => {
    expect(getTextAtPath({}, 'nope')).toBe('');
    expect(getTextAtPath({ a: null }, 'a.b')).toBe('');
  });
});

describe('buildTextUpdateOp', () => {
  it('builds a flat update for a scalar path', () => {
    expect(buildTextUpdateOp(block({ title: 'Hi' }), 'title', 'Bye')).toEqual({
      kind: 'update-block-props',
      blockId: 'b1',
      props: { title: 'Bye' },
    });
  });
  it('builds an array update preserving siblings', () => {
    expect(buildTextUpdateOp(block({ items: ['a', 'b', 'c'] }), 'items.1', 'B')).toEqual({
      kind: 'update-block-props',
      blockId: 'b1',
      props: { items: ['a', 'B', 'c'] },
    });
  });
  it('builds a nested-object update preserving siblings', () => {
    expect(
      buildTextUpdateOp(block({ figure: { value: '1', label: 'x' } }), 'figure.value', '2'),
    ).toEqual({
      kind: 'update-block-props',
      blockId: 'b1',
      props: { figure: { value: '2', label: 'x' } },
    });
  });
  it('builds an array-of-objects update preserving siblings', () => {
    expect(
      buildTextUpdateOp(
        block({ steps: [{ title: 'A', desc: 'd' }, { title: 'B', desc: 'e' }] }),
        'steps.1.title',
        'BB',
      ),
    ).toEqual({
      kind: 'update-block-props',
      blockId: 'b1',
      props: { steps: [{ title: 'A', desc: 'd' }, { title: 'BB', desc: 'e' }] },
    });
  });
  it('does not mutate the input block props', () => {
    const props = { steps: [{ title: 'A' }] };
    buildTextUpdateOp(block(props), 'steps.0.title', 'Z');
    expect(props.steps[0].title).toBe('A');
  });
  it('throws when the path cannot be resolved', () => {
    expect(() => buildTextUpdateOp(block({ title: 'Hi' }), 'title.deep', 'x')).toThrow();
    expect(() => buildTextUpdateOp(block({ figure: null }), 'figure.value', 'x')).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm core test -- text-path`
Expected: FAIL — `Failed to resolve import './text-path.ts'` / module not found.

- [ ] **Step 3: Write the implementation**

Create `packages/core/src/app/editor/text-path.ts`:

```ts
import type { Block } from '../../doc/model.ts';
import type { EditOp } from '../../doc/ops.ts';

export class TextPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TextPathError';
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object';
}

export function getTextAtPath(props: Record<string, unknown>, path: string): string {
  let cursor: unknown = props;
  for (const seg of path.split('.')) {
    if (!isObject(cursor)) return '';
    cursor = cursor[seg];
  }
  return cursor == null ? '' : String(cursor);
}

export function buildTextUpdateOp(block: Block, path: string, text: string): EditOp {
  const segments = path.split('.');
  const topKey = segments[0];
  if (segments.length === 1) {
    return { kind: 'update-block-props', blockId: block.id, props: { [topKey]: text } };
  }
  const cloned = structuredClone(block.props[topKey]);
  let cursor: unknown = cloned;
  for (let i = 1; i < segments.length - 1; i++) {
    if (!isObject(cursor)) {
      throw new TextPathError(`cannot resolve path "${path}" on block ${block.id}`);
    }
    cursor = cursor[segments[i]];
  }
  if (!isObject(cursor)) {
    throw new TextPathError(`cannot resolve path "${path}" on block ${block.id}`);
  }
  cursor[segments[segments.length - 1]] = text;
  return { kind: 'update-block-props', blockId: block.id, props: { [topKey]: cloned } };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm core test -- text-path`
Expected: PASS (all 13 tests).

- [ ] **Step 5: Register the module in the pure boundary guard**

In `packages/core/src/app/editor/pure.boundary.test.ts`, add `'text-path.ts',` to the `PURE_MODULES` array (after `'block-ops.ts',`):

```ts
const PURE_MODULES = [
  'deck-host.ts',
  'memory-host.ts',
  'history.ts',
  'editor-store.ts',
  'block-ops.ts',
  'text-path.ts',
];
```

- [ ] **Step 6: Run the boundary test**

Run: `pnpm core test -- pure.boundary`
Expected: PASS — `text-path.ts has no runtime react/alias/tsx imports` (it only `import type`s).

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/app/editor/text-path.ts packages/core/src/app/editor/text-path.test.ts packages/core/src/app/editor/pure.boundary.test.ts
git commit -m "feat(core): add text-path resolver + update-block-props builder for dot-paths"
```

---

## Task 2: `getBlockById` helper in block-ops

**Files:**
- Modify: `packages/core/src/app/editor/block-ops.ts`
- Test: `packages/core/src/app/editor/block-ops.test.ts`

Context: `findBlock(deck, blockId)` already returns `{ slideId, slot, index } | null`. The store needs the actual `Block` object at commit to read its current props. Reuse `findBlock`.

- [ ] **Step 1: Write the failing test**

In `packages/core/src/app/editor/block-ops.test.ts`, add to the imports line:

```ts
import { duplicateBlockOp, findBlock, getBlockById, moveBlockOp } from './block-ops.ts';
```

Then add a new describe block (anywhere after the existing `describe('findBlock', …)`):

```ts
describe('getBlockById', () => {
  it('returns the block object by id', () => {
    expect(getBlockById(makeDeck(), 'b2')).toEqual({ id: 'b2', type: 'text', props: { text: 'one' } });
  });
  it('returns null for an unknown id', () => {
    expect(getBlockById(makeDeck(), 'nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm core test -- block-ops`
Expected: FAIL — `getBlockById is not a function` / not exported.

- [ ] **Step 3: Write the implementation**

In `packages/core/src/app/editor/block-ops.ts`, change the model import to also bring in `Block`:

```ts
import type { Block, Deck } from '../../doc/model.ts';
```

Then add this function (after `findBlock`):

```ts
export function getBlockById(deck: Deck, blockId: string): Block | null {
  const loc = findBlock(deck, blockId);
  if (!loc) return null;
  const slide = deck.slides.find((s) => s.id === loc.slideId);
  return slide ? slide.slots[loc.slot][loc.index] : null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm core test -- block-ops`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/app/editor/block-ops.ts packages/core/src/app/editor/block-ops.test.ts
git commit -m "feat(core): add getBlockById helper to locate a block object by id"
```

---

## Task 3: Path migration across store + view + canvas  *(opus reviewer)*

**Files:**
- Modify: `packages/core/src/app/editor/editor-store.ts`
- Modify: `packages/core/src/app/editor/editor-store.test.ts`
- Modify: `packages/core/src/app/editor/slide-view.tsx`
- Modify: `packages/core/src/app/editor/editor-canvas.tsx`

These four files are coupled by the `editing` shape (`field` → `path`), so they migrate together to keep `tsc` green after the task. The store change is the commit-semantics core; the `.tsx` changes are mechanical renames (verified by `tsc` + the browser pass in Task 8). **Do not** change the Gap A ring here — that is Task 4.

- [ ] **Step 1: Update the store tests first (red)**

In `packages/core/src/app/editor/editor-store.test.ts`:

a) The existing `startEdit` test (currently asserts `{ blockId, field }`) — replace its body:

```ts
  it('startEdit sets the editing path and selects the block', () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: makeDeck() });
    store.startEdit('b1', 'text');
    expect(store.getState().editing).toEqual({ blockId: 'b1', path: 'text' });
    expect(store.getState().selectedBlockId).toBe('b1');
    store.dispose();
  });
```

b) The existing `commitEdit writes update-block-props…` test keeps its `startEdit('b1', 'text')` call (a scalar path) and its assertion `props.text` — unchanged; it already passes a single-segment path.

c) Add a new test that proves a **nested** path commits correctly. The default deck only has a scalar heading, so build a block with a nested array inline via an op first:

```ts
  it('commitEdit writes a nested array value via update-block-props', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: await host.loadDeck('s1') });
    store.apply({
      kind: 'add-block',
      slideId: 's1',
      slot: 'body',
      index: 0,
      block: { id: 'b2', type: 'bullets', props: { items: ['a', 'b', 'c'] } },
    });
    store.startEdit('b2', 'items.1');
    store.commitEdit('B');
    expect(store.getState().editing).toBeNull();
    expect(store.getState().deck.slides[0].slots.body[0].props.items).toEqual(['a', 'B', 'c']);
    store.dispose();
  });
```

- [ ] **Step 2: Run the store tests to verify they fail**

Run: `pnpm core test -- editor-store`
Expected: FAIL — the `startEdit` assertion expects `path` but the store still emits `field`; the nested test fails the `items` assertion.

- [ ] **Step 3: Migrate the store**

In `packages/core/src/app/editor/editor-store.ts`:

a) Add imports (top of file, after the existing relative imports):

```ts
import { getBlockById } from './block-ops.ts';
import { buildTextUpdateOp } from './text-path.ts';
```

b) Change the `editing` field in `EditorState`:

```ts
  editing: { blockId: string; path: string } | null;
```

c) Change the `startEdit` signature in `EditorStore`:

```ts
  startEdit: (blockId: string, path: string) => void;
```

d) Change the internal `editing` variable declaration:

```ts
  let editing: { blockId: string; path: string } | null = null;
```

e) Replace `startEdit`:

```ts
    startEdit(blockId, path) {
      selectedBlockId = blockId;
      editing = { blockId, path };
      emit();
    },
```

f) Replace `commitEdit`:

```ts
    commitEdit(value) {
      const e = editing;
      editing = null;
      if (!e) {
        emit();
        return;
      }
      const block = getBlockById(history.deck, e.blockId);
      if (!block) {
        emit();
        return;
      }
      let op: EditOp;
      try {
        op = buildTextUpdateOp(block, e.path, value);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        emit();
        return;
      }
      applyEditOps(op);
    },
```

(`EditOp` is already imported as a type at the top of the file.)

- [ ] **Step 4: Run the store tests to verify they pass**

Run: `pnpm core test -- editor-store`
Expected: PASS (all tests, including the new nested commit).

- [ ] **Step 5: Migrate `slide-view.tsx`**

In `packages/core/src/app/editor/slide-view.tsx`:

a) In `BlockViewProps`, rename `editingField` to `editingPath`:

```ts
export type BlockViewProps = {
  block: Block;
  editingPath: string | null;
  onCommitEdit: (value: string) => void;
  onCancelEdit: () => void;
};
```

b) In the `BlockView` destructure and effect, rename `editingField` → `editingPath` everywhere (the guard, the `CSS.escape(editingPath)` call, and the dependency array). The effect body is otherwise unchanged:

```ts
export const BlockView = memo(function BlockView({
  block,
  editingPath,
  onCommitEdit,
  onCancelEdit,
}: BlockViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: block.id keys the editable target; onCommitEdit/onCancelEdit are stable store methods. We intentionally re-run only when the edited path or block identity changes — not on every block prop change (which would fight the caret).
  useEffect(() => {
    if (editingPath === null) return;
    const el = ref.current?.querySelector(
      `[data-osd-text="${CSS.escape(editingPath)}"]`,
    ) as HTMLElement | null;
    if (!el) return;
    // …unchanged…
  }, [editingPath, block.id, onCommitEdit, onCancelEdit]);
```

c) In `SlideView`, change the `editing` prop type and the `renderSlot` wiring:

```ts
export function SlideView({
  slide,
  editing,
  onCommitEdit,
  onCancelEdit,
}: {
  slide: Slide;
  editing: { blockId: string; path: string } | null;
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
        editingPath={editing?.blockId === b.id ? editing.path : null}
        onCommitEdit={onCommitEdit}
        onCancelEdit={onCancelEdit}
      />
    ));
  return <Layout slide={slide} renderSlot={renderSlot} />;
}
```

- [ ] **Step 6: Migrate `editor-canvas.tsx` `onDoubleClick`**

In `packages/core/src/app/editor/editor-canvas.tsx`, rename the `field` local to `path` (the attribute now carries a path):

```ts
  const onDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    const textEl = (e.target as HTMLElement).closest('[data-osd-text]');
    if (!textEl) return;
    const path = textEl.getAttribute('data-osd-text');
    const blockEl = textEl.closest('[data-osd-block-id]');
    const blockId = blockEl?.getAttribute('data-osd-block-id');
    if (path && blockId) store.startEdit(blockId, path);
  };
```

(Leave the ring `useEffect` untouched — Task 4.)

- [ ] **Step 7: Typecheck + full core test run**

Run: `pnpm typecheck`
Expected: PASS (no errors — the `editing` shape is consistent across store/view/canvas).

Run: `pnpm core test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/app/editor/editor-store.ts packages/core/src/app/editor/editor-store.test.ts packages/core/src/app/editor/slide-view.tsx packages/core/src/app/editor/editor-canvas.tsx
git commit -m "feat(core): route in-place edits through dot-paths (editing.path + buildTextUpdateOp)"
```

---

## Task 4: Gap A — inset selection ring visible on full-bleed blocks

**Files:**
- Modify: `packages/core/src/app/editor/editor-canvas.tsx`

Context: the ring is currently an `outline` drawn 2px *outside* the block box (`outlineOffset: '2px'`). A full-bleed block's box is the whole 1920×1080 canvas, so the outside outline lands at the canvas edge and is clipped by `overflow:hidden`. Drawing it **inset** (`outlineOffset: '-2px'`) keeps it inside the canvas for full-bleed blocks while remaining visible for small in-layout blocks. This is a CSS-only change to the existing ring `useEffect`; verified visually in Task 8.

- [ ] **Step 1: Flip the outline offset to inset**

In the ring `useEffect` in `packages/core/src/app/editor/editor-canvas.tsx`, change the offset line:

```ts
      target.style.outline = selected ? '2px solid var(--osd-accent, #4f7cff)' : '';
      target.style.outlineOffset = selected ? '-2px' : '';
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/app/editor/editor-canvas.tsx
git commit -m "fix(core): draw the selection ring inset so it stays visible on full-bleed blocks"
```

---

## Task 5: Tag the built-in `bullets` block's items

**Files:**
- Modify: `packages/core/src/doc/blocks/bullets.tsx`
- Test: `packages/core/src/doc/blocks/blocks.test.tsx`

- [ ] **Step 1: Add the failing assertion**

In `packages/core/src/doc/blocks/blocks.test.tsx`, extend the existing bullets test (`test('bullets renders each item as <li>', …)`) with a path assertion:

```ts
test('bullets renders each item as <li>', () => {
  const html = renderToStaticMarkup(createElement(Bullets, b({ items: ['a', 'b'] })));
  expect(html).toContain('<li');
  expect(html).toContain('data-osd-text="items.0"');
  expect(html).toContain('data-osd-text="items.1"');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm core test -- blocks`
Expected: FAIL — `data-osd-text="items.0"` not present.

- [ ] **Step 3: Tag the list items**

In `packages/core/src/doc/blocks/bullets.tsx`, add the attribute to the `<li>`:

```tsx
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: bullet order is the identity
        <li key={i} data-osd-text={`items.${i}`}>
          {String(item)}
        </li>
      ))}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm core test -- blocks`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/doc/blocks/bullets.tsx packages/core/src/doc/blocks/blocks.test.tsx
git commit -m "feat(core): make bullet list items in-place editable via items.N paths"
```

---

## Task 6: Tag the demo custom blocks (pylon + beacon)

**Files:**
- Modify: `apps/demo/blocks/index.tsx`

Goal: make **every** text value in both packs in-place editable so the full-bleed pitch decks dogfood the feature. Beacon already tags its scalars (`eyebrow`/`title`/`sub`/`amount`); add its nested/array text. Pylon currently tags nothing; add scalars **and** nested/array text.

**Tagging rules (apply consistently):**
- Tag the **innermost** element whose text is exactly `str(value)` for that one value. If the value is wrapped by decoration (e.g. the `<Eyebrow>`/`<Field>` accent bar), wrap just the text in a `<span data-osd-text="…">…</span>` (beacon already does this for eyebrow — match that pattern for pylon).
- **One element per path.** If the same value is rendered twice (e.g. a bar chart *and* a legend), tag exactly one occurrence — prefer the HTML legend row. Tagging both would make the editor's `querySelector` target the first match, not the clicked one.
- **Never tag SVG `<text>`** (e.g. pylon-market's ring values inside the `<svg>`). `contentEditable` is unreliable on SVG text; those values are inspector-only (M1c-2). Tag their HTML mirror if one exists; otherwise leave untagged.
- Do **not** tag numeric/enum values (`pct`, `variant`, `tone`, `series`) or derived text (avatar `initials`, the `NN` step number).
- Array item path form: `points.${i}`, `steps.${i}.title`, `metrics.${i}.value`, etc. Nested object: `figure.value`, `figure.label`.

**Exemplar A — array of strings (PylonStatement points).** Current:

```tsx
                    <span style={{ color: 'var(--osd-muted)' }}>{pt}</span>
```

becomes:

```tsx
                    <span style={{ color: 'var(--osd-muted)' }} data-osd-text={`points.${i}`}>
                      {pt}
                    </span>
```

**Exemplar B — array of objects (PylonSteps steps).** Current:

```tsx
              <div style={display(46, 700)}>{str(s.title)}</div>
              <div style={{ fontSize: 28, lineHeight: 1.45, color: 'var(--osd-muted)' }}>
                {str(s.desc)}
              </div>
```

becomes:

```tsx
              <div style={display(46, 700)} data-osd-text={`steps.${i}.title`}>
                {str(s.title)}
              </div>
              <div
                style={{ fontSize: 28, lineHeight: 1.45, color: 'var(--osd-muted)' }}
                data-osd-text={`steps.${i}.desc`}
              >
                {str(s.desc)}
              </div>
```

**Exemplar C — scalar inside an accent wrapper (PylonHero eyebrow).** Current:

```tsx
          <Eyebrow>{str(p.eyebrow, 'Predictive maintenance for the grid')}</Eyebrow>
```

becomes:

```tsx
          <Eyebrow>
            <span data-osd-text="eyebrow">
              {str(p.eyebrow, 'Predictive maintenance for the grid')}
            </span>
          </Eyebrow>
```

- [ ] **Step 1: Tag the Pylon pack**

Add `data-osd-text` to these elements in `apps/demo/blocks/index.tsx` (the `str(...)`/`{pt}` text element for each):

- **PylonHero:** `eyebrow` (wrap in `<span>` inside `<Eyebrow>`, per Exemplar C); `title` (the `<h1>`); `sub` (the `<p>`).
- **PylonStatement:** `eyebrow` (span in `<Eyebrow>`); `title` (the `<h2>`); each point `points.${i}` (Exemplar A); `figure.value` (the big figure `<div>`); `figure.label` (the label `<div>`).
- **PylonSteps:** `eyebrow` (span in `<Eyebrow>`); `title` (the `<h2>`); `steps.${i}.title` and `steps.${i}.desc` (Exemplar B).
- **PylonMarket:** `eyebrow` (span in `<Eyebrow>`); `title` (the `<h2>`); legend rows — `rings.${i}.label` (the mono `<span>`) and `rings.${i}.note` (the muted `<span>`). **Do not** tag the SVG `<text>` ring values.
- **PylonTraction:** `eyebrow` (span in `<Eyebrow>`); `title` (the `<h2>`); `metrics.${i}.value` and `metrics.${i}.label` (the two `<div>`s per metric). Skip the SVG series.
- **PylonTeam:** `eyebrow` (span in `<Eyebrow>`); `title` (the `<h2>`); `members.${i}.name`, `members.${i}.role`, `members.${i}.prev` (the three `<div>`s). Skip the initials avatar.
- **PylonAsk:** `eyebrow` (span in `<Eyebrow>`); `amount` (the big `<div>`); `title` (the `<h2>`); `allocations.${i}.label` (the muted `<span>`). Skip the `pct` numbers.

- [ ] **Step 2: Tag the Beacon pack's nested/array text**

Beacon scalars (`eyebrow`/`title`/`sub`/`amount`) are already tagged — leave them. Add:

- **BeaconStatement:** each point `points.${i}` (the `<span>` rendering `{pt}`); `figure.value`; `figure.label`.
- **BeaconSteps:** `steps.${i}.title` and `steps.${i}.desc`.
- **BeaconMarket:** in the **legend** (right column) only — `segments.${i}.label` (the mono `<span>` width 64), `segments.${i}.value` (the display `<span>`), `segments.${i}.note` (the muted `<span>`). **Do not** tag the bar-chart mirror (left column) — it duplicates value/label.
- **BeaconTraction:** `metrics.${i}.value` and `metrics.${i}.label`.
- **BeaconTeam:** `members.${i}.name`, `members.${i}.role`, `members.${i}.prev`. Skip the initials avatar.
- **BeaconAsk:** `allocations.${i}.label` (the `<span>` rendering `{str(a.label)}`). Skip the `pct`.

- [ ] **Step 3: Lint + typecheck the demo**

Run: `pnpm check` then `pnpm typecheck`
Expected: PASS. (Biome may reformat the new attributes — that's fine. If `pnpm check` reports fixable issues, run `pnpm check:fix`.)

- [ ] **Step 4: Commit**

```bash
git add apps/demo/blocks/index.tsx
git commit -m "feat(demo): tag nested/array text in pylon + beacon packs for in-place editing"
```

---

## Task 7: Skill docs (path form) + changeset

**Files:**
- Modify: `packages/core/skills/slide-authoring/SKILL.md`
- Modify: `packages/cli/template/.agents/skills/slide-authoring/SKILL.md`
- Create: `.changeset/<name>.md`

Context: the two `SKILL.md` files are **byte-identical** (verified). Apply the same edit to both. The current "In-place editing (`data-osd-text`)" section documents only scalar prop keys and explicitly says *"Do not tag arrays, objects…"* — that guidance is now outdated and must be replaced with the path form.

- [ ] **Step 1: Update the core skill**

In `packages/core/skills/slide-authoring/SKILL.md`, in the `### In-place editing (`data-osd-text`)` section:

a) Replace the bullet that currently reads:

```markdown
- Do **not** tag arrays, objects, numbers, or enums (`string[]`, nested `{…}`, counts, variant flags). Those edit through the typed schema / JSON fallback above — not in place.
```

with:

```markdown
- The value can be a **dot-path** into `props`, not just a top-level key — so array items and nested object fields edit in place too: `data-osd-text="points.0"` (array item), `data-osd-text="figure.value"` (nested field), `data-osd-text="steps.1.title"` (array of objects). Tag each item with its index inside the `.map`: `points.map((pt, i) => <span data-osd-text={`points.${i}`}>{pt}</span>)`. The tagged element's text must still be exactly the string at that path.
- Tag **one element per path.** If a value renders twice (e.g. a chart and a legend), tag only one. Don't tag SVG `<text>` (`contentEditable` is unreliable there) — those edit through the schema/JSON fallback. Numbers and enums (`pct`, `variant`) also stay in the schema, not in place.
```

b) After the existing `<Hero>` example code block, add a nested/array example:

```markdown
For arrays and nested fields, tag each rendered value with its path:

```tsx
function Stats({ block }: { block: Block }) {
  const p = block.props;
  const stats = (p.stats ?? []) as Array<{ value?: string; label?: string }>;
  return (
    <ul>
      {stats.map((s, i) => (
        <li key={i}>
          <span data-osd-text={`stats.${i}.value`}>{String(s.value ?? '')}</span>
          <span data-osd-text={`stats.${i}.label`}>{String(s.label ?? '')}</span>
        </li>
      ))}
    </ul>
  );
}
```​
```

(Remove the trailing zero-width marker `​` — it is only here to escape the nested fence; write a normal closing ```` ``` ````.)

- [ ] **Step 2: Mirror the edit to the cli template**

Apply the identical two edits to `packages/cli/template/.agents/skills/slide-authoring/SKILL.md`. Verify they stay in sync:

Run: `diff packages/core/skills/slide-authoring/SKILL.md packages/cli/template/.agents/skills/slide-authoring/SKILL.md && echo IDENTICAL`
Expected: `IDENTICAL`.

- [ ] **Step 3: Create the changeset**

Create `.changeset/m1c-1-edit-everything-text.md`:

```markdown
---
"@open-slide/core": minor
"@open-slide/cli": patch
---

Edit nested and array block text in place — `data-osd-text` now accepts a dot-path (`points.0`, `figure.value`, `steps.1.title`), and the selection ring stays visible on full-bleed blocks.
```

- [ ] **Step 4: Verify the changeset is well-formed**

Run: `pnpm changeset status`
Expected: lists `@open-slide/core` (minor) and `@open-slide/cli` (patch) as changed.

- [ ] **Step 5: Commit**

```bash
git add packages/core/skills/slide-authoring/SKILL.md packages/cli/template/.agents/skills/slide-authoring/SKILL.md .changeset/m1c-1-edit-everything-text.md
git commit -m "docs(skills): document the data-osd-text dot-path form for arrays/nested fields"
```

---

## Task 8: Full verification (gates + real-browser CDP pass)

**Files:** none (verification only).

This task proves the milestone works end-to-end. The data-layer correctness is already covered by Task 1/3 unit tests; this adds the static gates and a real-browser pass (a curl 200 does **not** prove the SPA rendered — see the `verifying-the-running-app` memory).

- [ ] **Step 1: Run all static gates**

```bash
pnpm check        # biome — must be clean
pnpm typecheck    # tsc across the graph
pnpm test         # vitest — all packages
```

Expected: all PASS. If `pnpm check` flags formatting, run `pnpm check:fix` and re-commit.

- [ ] **Step 2: Rebuild core dist (required before demo dev — see `demo-build-requires-core-dist-rebuild` memory)**

```bash
pnpm core build
```

Expected: tsdown build succeeds.

- [ ] **Step 3: Start the demo dev server**

```bash
pnpm dev
```

Note the port the **fresh** server prints (it may bump to 5174 if 5173 is held by a stale process — the stale-server gotcha in the memory). Use that exact port below. Editor route: `http://localhost:<port>/s/beacon-pitch?editor=next` (the M1a editor is gated behind `?editor=next` in DEV; see `packages/core/src/app/routes/slide.tsx:58`).

- [ ] **Step 4: Real-browser pass via the headless-CDP harness**

Drive a real browser (Playwright Chromium `chrome-headless-shell` + the DevTools-Protocol driver per the memory) against `http://localhost:<port>/s/beacon-pitch?editor=next`. The `beacon-pitch` deck exercises every shape (points, figure, steps, segments, metrics, members, allocations) and is full-bleed (`stage` layout). Confirm:

  1. **Console is clean** — no `invalid hook call` / `Cannot read properties of null` (the dual-React crash class). Grep `--dump-dom` output for `data-osd-block-id` to confirm the editor canvas mounted.
  2. **Selection ring (Gap A)** — single-click a full-bleed block; screenshot; confirm a visible accent ring inset from the canvas edge (read computed `outline`/`outline-offset` on the block's `firstElementChild`, expect `-2px`, and confirm it appears in the screenshot — not clipped).
  3. **In-place edit, array item** — navigate to the statement slide; double-click a bullet point (`[data-osd-text^="points."]`); confirm it becomes `contentEditable`; type new text; press Enter to commit.
  4. **In-place edit, nested object field** — double-click the statement's figure value (`[data-osd-text="figure.value"]`); edit + commit.
  5. **In-place edit, array-of-objects field** — go to the steps slide; double-click a step title (`[data-osd-text$=".title"]` under a step); edit + commit.
  6. **Persistence** — after each commit, confirm the change persisted by reading it back: either `GET`/`POST /__deck/beacon-pitch` round-trip or re-read `apps/demo/slides/beacon-pitch/deck.json` and confirm the edited `points[i]` / `figure.value` / `steps[i].title` holds the new text. (The store debounce-flushes through the dev host; allow the flush to settle.)

- [ ] **Step 5: Capture evidence**

Record, in the final report: the three gate outputs (`check`/`typecheck`/`test` all green), a screenshot path showing the visible ring + an edited value, and the deck.json diff proving persistence. Per `verification-before-completion`: evidence before assertions — do not claim "works" without the screenshot + persisted-value proof.

- [ ] **Step 6: Stop the dev server**

Kill the `pnpm dev` background process (and any stale listener on the port).

---

## Self-review checklist (run before handing off to execution)

- **Spec coverage (§3):** path contract (Task 1) ✓ · commit via existing `update-block-props`, no new op (Task 1 `buildTextUpdateOp` + Task 3 store) ✓ · `text-path.ts` pure + boundary (Task 1) ✓ · store `editing.path` (Task 3) ✓ · slide-view path attribute (Task 3) ✓ · canvas `onDoubleClick` path (Task 3) ✓ · built-in bullets `items.N` (Task 5) ✓ · demo pylon+beacon nested/array (Task 6) ✓ · skill path-form docs + changeset core+cli (Task 7) ✓ · Gap A inset ring (Task 4) ✓ · testing: pure unit + store + boundary + CDP (Tasks 1/3/8) ✓.
- **Out of scope (kept out):** add/remove/reorder array items, non-text props (enums/numbers/colors), inspector, slide structure, Gap B — all deferred to M1c-2/M1c-3. ✓
- **Type consistency:** `editing` is `{ blockId; path }` in `EditorState`, the internal var, `startEdit`, and `SlideView`'s prop; `BlockView` uses `editingPath`; `buildTextUpdateOp(block, path, text)` and `getBlockById(deck, blockId)` signatures match their call sites in `commitEdit`. ✓
- **No placeholders:** every code step shows complete code; every run step shows the command + expected result. ✓
- **Green between tasks:** Tasks 1, 2 add isolated/back-compatible code; Task 3 migrates the coupled `editing` shape across all four files in one task so `tsc` stays green; Tasks 4–7 are independent. ✓
