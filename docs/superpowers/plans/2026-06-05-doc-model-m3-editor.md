# Doc-Model M3 — WYSIWYG Editor Implementation Plan

> Built on M2's `applyOp`/`applyOps` + `POST /__deck/:id`. Execute task-by-task with reviews.

**Goal:** An in-browser WYSIWYG editor so a non-developer can edit a `deck.json` deck — select blocks, edit content, add/remove/reorder blocks and slides, switch layouts, and tune design tokens — with live preview and autosave to disk.

**Architecture:** The editor loads the raw `Deck` (parsed `deck.json`), holds it in React state, applies `EditOp`s **in-memory via `applyOp`** for instant preview (re-rendered through `renderDeck`), and **persists debounced** to disk via `POST /__deck/:id`. The file remains the source of truth; the existing deck.json file-watcher + HMR keep other views in sync. The renderer tags blocks with `data-osd-block-id` for click hit-testing. Editing is dev-only (`import.meta.env.DEV`).

**Verification reality:** Hooks, edit-client, and the renderer tagging are unit/render-testable (vitest + `react-dom/server`). The interactive editor UI (clicks/drag/panels) needs the user's visual check — automated gates here are typecheck + build + render-presence tests.

---

## M3a — Editor foundation (verifiable)

- **Renderer tagging**: `renderBlock` wraps each block in `<div data-osd-block-id={id} style={{display:'contents'}}>` so `el.closest('[data-osd-block-id]')` resolves a click to a block id without affecting layout. Render-test that the attribute appears and content still renders.
- **Raw-deck loader**: expose `loadDeckRaw(id): Promise<Deck>` from `app/lib/slides.ts` = `validateDeck(await loadDeckJson(id))` (reuses the virtual module). The viewer keeps using `loadSlide` (→ SlideModule); the editor uses `loadDeckRaw`.
- **Edit client**: `app/lib/editor/edit-client.ts` → `postOps(slideId, ops): Promise<void>` (POST `/__deck/:id`, throw on non-200 with the server error). Unit-test with a mocked fetch.
- **`useDeckEditor(slideId)` hook** (`app/lib/editor/use-deck-editor.ts`): loads the raw deck; state `{ deck, status }`; `apply(op | op[])` → `applyOps(deck, ops)` in-memory (instant) + enqueue persistence (debounced `postOps`); exposes `deck`, `apply`, `selection`, `select`, `saveState` ('idle'|'saving'|'error'). Unit-test the reducer/persistence-queue logic (mock edit-client + timers).

## M3b — Editor UI (needs visual verification)

- **Edit-mode** in the slide route (dev-only toggle, e.g. an "Edit" button / `e` key) that swaps the read-only canvas for an editing surface driven by `useDeckEditor`.
- **Live preview**: render `renderDeck(editor.deck).default[index]` inside the existing `SlideCanvas`.
- **Click-to-select**: canvas click → `closest('[data-osd-block-id]')` → `select(blockId)`; selection outline overlay.
- **Properties panel**: for the selected block, editable fields per type (text/heading: text; bullets: items list; quote: text+attribution; code: code+lang; image: src/alt/fit) → `apply({kind:'update-block-props',...})`. Buttons: delete block, move up/down (`move-block`), add block to a slot (type picker → `add-block`).
- **Outline panel**: list slides (with layout); select/add/remove/duplicate/reorder slide (`add-slide`/`remove-slide`/`move-slide`); change layout (`set-slide-layout`); edit slide notes (`set-slide-notes`) and deck title (`set-deck-title`).
- **Save indicator** bound to `saveState`.

## M3c — Design panel

- Panel editing design tokens (palette colors, font strings, hero/body sizes, radius) → `apply({kind:'set-design',design})`, live preview. Reuse swatch/slider primitives if present in `components/ui`.

## Out of scope (later)
- Inline rich-text runs (bold/italic spans) — text stays plain strings.
- Undo/redo UI (the ops layer makes this addable later).
- Drag-and-drop reordering (use move up/down buttons first; DnD is an enhancement — `@dnd-kit` is already a dep).
- In-app LLM copilot (M4).

## Release
- `@open-slide/core` **minor** (additive editor + loader + tagging) + changeset.
- Biome scoped to touched files (never root `pnpm check`). Rebuild core `dist` before demo build/dev verification.
