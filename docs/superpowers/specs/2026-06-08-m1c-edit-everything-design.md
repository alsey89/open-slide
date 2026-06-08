# open-slide — M1c: Edit Everything (as data) — Design

> Status: approved design (brainstormed 2026-06-08), ready for planning.
> Scope: the M1c milestone of the editor rebuild — make **every data field** of every block editable through the right surface, staying inside the structured-document thesis. Builds on M1a (DeckHost + store) and M1b (canvas selection + in-place scalar text editing).
> Companion specs: `2026-06-07-editor-and-ops-api-rebuild-design.md` (the umbrella M0–M6 design). This refines M1c.

## 1. Problem / goal

M1b made the canvas directly manipulable, but in-place editing only covers **top-level scalar text** (`data-osd-text="title"`). On real decks — especially full-bleed custom-block pitch decks like `pylon-pitch` / `beacon-pitch` — most content is **not** a top-level scalar: it's array items (a bullet/point list), nested object fields (a stat's `value`/`label`), or non-text props (enums, numbers, colors). Today those are uneditable in the editor, so it feels "selective," not a proper WYSIWYG.

**Goal:** every **data field** of a block is editable through the appropriate surface — all text in place on the slide (including nested/array text), and everything else (structured props, adding/removing/reordering array items, slide structure) through a structured inspector and slide-level controls.

**The thesis boundary (decided in brainstorm):** "edit everything" means **every data field (prop)**, not freeform/visual editing. The block's React composition itself — layout, SVG dataviz, motion, positioning — remains the **author's/agent's escape hatch** and is intentionally NOT freeform-editable. This is what keeps humans and agents editing the *same* structured ops reliably (umbrella spec §2 non-goal: freeform canvas). Direct-manipulation beyond data (drag-reorder of items on the slide, layout toggles) is explicitly **deferred** — revisit after M1c.

## 2. The three surfaces (and the slice order)

"Edit every data field" decomposes into three complementary surfaces, built in this order (chosen for highest value + lowest risk first):

1. **M1c-1 — In-place text everywhere (nested/array paths).** Extend the `data-osd-text` contract from scalar keys to **dot-paths** so any visible text — list items, nested object fields — edits in place on the slide. Contained extension of the M1b machinery; the highest-value WYSIWYG win for the common case (most content is text). Includes the **Gap A** selection-ring fix.
2. **M1c-2 — Inspector.** Select a block → a dock panel exposes **every** prop via typed schema fields (`PropField`) + array editors (add/remove/reorder items, edit item fields) + a JSON fallback. The universal mop-up: non-text props and the structural array ops in-place can't do. Works for built-in AND custom blocks.
3. **M1c-3 — Slide structure + Gap B.** Slide add/duplicate/delete/reorder + set-layout; **full-bleed awareness** so structural ops route to the *slide* level (no more stacked blocks); structure-tree toggle for navigation/selection.

Each slice is independently shippable and dogfoodable. M1c-1 is specified in implementation depth below; M1c-2 and M1c-3 are a detailed roadmap to be planned when started.

---

## 3. M1c-1 — In-place editing of all text (implementation depth)

### 3.1 The path contract

Extend `data-osd-text` to accept a **dot-path** into `block.props`, not just a top-level key:

- scalar (unchanged, back-compatible): `data-osd-text="title"`
- array item: `data-osd-text="points.0"`, `data-osd-text="items.2"`
- nested object field: `data-osd-text="figure.value"`
- array-of-objects field: `data-osd-text="steps.1.title"`, `data-osd-text="metrics.0.value"`

The tagged element's rendered text must still be **exactly** the string at that path (`String(get(block.props, path) ?? '')`). A scalar key is just a single-segment path, so existing tags keep working.

### 3.2 Commit semantics — reuse `update-block-props`, no new op

In-place editing reads `innerText` from the DOM on commit (M1b), so the path is only needed to **write back**. On commit of text `T` for path `P = s0.s1.…`:

1. `s0` is the top-level prop key.
2. Immutably clone `block.props[s0]`, navigate to the nested location (`s1…`), set the leaf to `T`.
3. Emit the **existing** op: `update-block-props { [s0]: <clonedUpdatedValue> }`.

For a single-segment path this is identical to M1b (`{ [s0]: T }`). No new op kind, no document-model change, no thesis change — agents still see ordinary `update-block-props` ops.

### 3.3 Files / units

- **`packages/core/src/app/editor/text-path.ts` (new, pure, node-tested):**
  - `getTextAtPath(props: Record<string, unknown>, path: string): string` — resolve a dot-path to its string (for tests/validation; the editor uses DOM innerText at runtime).
  - `buildTextUpdateOp(block: Block, path: string, text: string): EditOp` — returns `{ kind: 'update-block-props', blockId, props: { [topKey]: nestedUpdatedValue } }`, cloning immutably. Handles array indices and nested objects. Added to `editor/pure.boundary.test.ts`.
- **`packages/core/src/app/editor/editor-store.ts`:** change `editing` from `{ blockId; field }` to `{ blockId; path }`; `startEdit(blockId, path)`; `commitEdit(text)` calls `buildTextUpdateOp(currentBlock, editing.path, text)` and applies it (instead of the flat `{[field]: text}`). `findBlock`/`block-ops` reused to locate the block.
- **`packages/core/src/app/editor/slide-view.tsx` (`BlockView`):** the effect already targets `[data-osd-text="<value>"]`; `<value>` is now a path. `CSS.escape` already handles dots. No structural change — the attribute carries a path.
- **`packages/core/src/app/editor/editor-canvas.tsx`:** `onDoubleClick` reads `data-osd-text` (now a path) → `store.startEdit(blockId, path)`. Unchanged logic.
- **Built-in blocks (`packages/core/src/doc/blocks/`):** tag nested/array text. Primary: `bullets` → each `<li data-osd-text={`items.${i}`}>`. (Heading/text/etc. already scalar-tagged.)
- **Demo custom blocks (`apps/demo/blocks/index.tsx`):** tag the array/nested text in pylon + beacon packs (`points.${i}`, `figure.value`/`figure.label`, `steps.${i}.title`/`.desc`, `metrics.${i}.value`/`.label`, `members.${i}.name`/…, `allocations.${i}.label`, `rings/segments.${i}.…`).
- **Skill (`packages/core/skills/slide-authoring/SKILL.md` + the CLI template mirror):** extend the `data-osd-text` section to document the **path form** for arrays/nested fields (with an example), so future authored/agent blocks tag them. Changeset (core + cli).

### 3.4 Gap A — selection ring visible on full-bleed blocks (folded in)

Today the ring is an `outline` drawn 2px **outside** the block's box; a full-bleed `position:absolute; inset:0` block's box is the whole 1920×1080 canvas, so the outline lands at the canvas edge and is clipped by `overflow:hidden` → no selection feedback. Fix in `editor-canvas.tsx`: make the ring an **inset** indicator that can't be clipped (e.g. `outline-offset: -2px`, or a dedicated absolutely-positioned ring overlay sized to the block's rect inside the canvas). Must remain visible for both full-bleed and small in-layout blocks. Verify via the headless-CDP harness against a full-bleed deck.

### 3.5 What M1c-1 does NOT do (→ M1c-2)

In-place editing edits **existing** text values. It does **not** add/remove/reorder array items (add a 4th bullet, delete a point), nor edit non-text props (enums, numbers, colors). Those are the inspector (M1c-2). Stated so the slice has a clean boundary.

### 3.6 Testing

- Pure `text-path` unit tests (node): scalar, array index, nested object, array-of-objects; immutability (input props unmutated); `buildTextUpdateOp` produces the right `update-block-props`.
- Store tests: `startEdit(path)` / `commitEdit` writes the nested value via `update-block-props`.
- Boundary guard: `text-path.ts` React-free.
- Real-browser/CDP: double-click a bullet item, a stat value, a step title → edits in place + persists; full-bleed selection ring visible.

---

## 4. M1c-2 — Inspector (roadmap)

**Goal:** the universal "edit any prop" surface for the selected block — covers everything in-place can't.
**Scope:** a right-dock inspector panel (the M1a-reserved dock space). For the selected block: render typed fields from the block's `PropField[]` schema (`getBlockSchema`; field types text/textarea/number/boolean/select/color/string-list already exist), editing via `update-block-props`. **Array editors:** add/remove/reorder items + edit each item's fields — including **arrays of objects** (steps/metrics/members/allocations), which need either a nested item-schema in `PropField` or a structured list-editor; a **JSON fallback** for anything unschematized. Works for built-in and custom blocks (custom blocks already pass schemas via `registerBlock`'s 3rd arg). Also exposes block-level add/move/delete (the structured side of the contextual toolbar).
**Open questions:** how arrays-of-objects are described/edited (extend `PropField` with item schemas vs generic JSON list rows); keeping the inspector and in-place edits coherent (both emit `update-block-props`; the inspector must reflect in-place edits live via the store).
**Why second:** non-text props + structural array ops are less frequent than text editing but are the part that makes the editor *complete*.

## 5. M1c-3 — Slide structure + Gap B (roadmap)

**Goal:** structural editing at the level that matters, and fix the full-bleed confusion.
**Scope:** slide **add** (layout picker), **duplicate**, **delete**, **reorder**, **set-layout** with slot remap, **notes** — reusing the M0 `addSlideFromLayout`/`cloneSlideWithFreshIds` + the existing ops. **Gap B / full-bleed awareness:** for slides whose content is a single full-bleed block (the custom-pack pattern), structural intent is *slide*-level — surface duplicate/delete on the slide, and suppress or redirect block-level Duplicate/Add so it can't silently stack `position:absolute; inset:0` blocks. (Detection: e.g. a single block whose rendered root fills the canvas, or a registry hint that a layout/block is full-bleed — TBD in planning.) **Structure tree** (slide → slot → block) as a toggle in the left rail (umbrella spec §6.1), doubling as a reliable selection surface where canvas selection is ambiguous (overlapping/full-bleed), and the place agent edits highlight (M1d).
**Why third:** depends on nothing from 1–2 and is the smallest of the three; it cleans up structure once field-editing is complete.

## 6. Architecture notes

- Everything new lives under `packages/core/src/app/editor/` (the in-core editor module, package-shaped per M1a). Pure logic (`text-path.ts`, future inspector field-mappers) stays React-free + relative-imports-only (vitest node env), guarded by `editor/pure.boundary.test.ts`; React/`.tsx` files verified by tsc + the CDP/browser pass.
- One mutation path preserved: in-place, inspector, and agent edits all emit `EditOp`s through the M1a store (optimistic apply + inverse-op undo/redo + debounced persist). The inspector and in-place editing both reduce to `update-block-props`.
- No new op kinds for M1c-1/2 field editing (nested writes reuse `update-block-props`); M1c-3 reuses existing slide ops.

## 7. Verification

Reuse the session's headless-CDP harness (Playwright Chromium `chrome-headless-shell` + the DevTools-Protocol driver): drive a real browser to double-click nested/array text and confirm `contentEditable` + persistence, read computed styles to confirm the ring, and screenshot for craft. A `curl`/200 only proves the SPA shell. See `verifying-the-running-app` memory.

## 8. Open questions / risks

- **Arrays-of-objects in the inspector** (M1c-2): the cleanest schema/editor representation. Likely the biggest design question in the milestone.
- **Full-bleed detection** (M1c-3 / Gap B): rect-fills-canvas heuristic vs a registry/layout hint. Affects how cleanly block-vs-slide ops separate.
- **Nested-path edge cases** (M1c-1): editing a value whose path no longer exists after an external change; arrays that shrink. Low risk since in-place only edits currently-rendered text, but guard in `buildTextUpdateOp`.
- **Inspector ↔ in-place coherence:** both must stay live against the store snapshot so an edit in one reflects in the other.
