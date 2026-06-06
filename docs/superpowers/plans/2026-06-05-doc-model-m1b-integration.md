# Doc-Model M1b — Integration & Legacy Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Wire the M1a doc-model engine into the live app so `deck.json` is the source of truth rendered by the real viewer/present-mode/transition runtime (Phase 1, testable checkpoint), then delete the legacy TSX authoring path + inspector/design-panel/source-edit subsystems (Phase 2).

**Architecture:** The existing `virtual:open-slide/slides` module is regenerated to discover `*/deck.json` and expose a `loadDeckJson(id)` that dynamic-imports the JSON; `app/lib/slides.ts`'s `loadSlide(id)` runs `validateDeck` + `renderDeck` (M1a engine) to produce the `SlideModule` the runtime already consumes. `registerBuiltins()` runs at app bootstrap; a new `virtual:open-slide/blocks` statically imports an optional project `blocks/` registration file (the custom-block escape hatch, bundled in dev+build). `slide.tsx` is rewritten to a read-only viewer. All write-back editing (inspector, design save, notes save, page ops) is removed — it returns in **M2** via a structured edit API over `deck.json`.

**Tech Stack:** TypeScript, React 18, Vite 5, vitest (root config: `packages/**/*.test.ts(x)`, node env). The M1a engine lives at `packages/core/src/doc/`.

**Prerequisite:** M1a merged or present on the working branch (the `packages/core/src/doc/` engine exists and its tests pass). Run from branch `feat/doc-model-m1b` (branch off the M1a branch). `pnpm install` already done.

**Biome note:** This fork has ~94 pre-existing repo-wide biome errors. NEVER run root `pnpm check`. Scope biome to touched files: `npx @biomejs/biome check --write <files>` then `npx @biomejs/biome check <files>`.

**Manual verification is central here** (it's an integration), so several tasks end with a dev-server / build check, not just unit tests.

---

## PHASE 1 — Integration (ends at a testable read-only viewer on deck.json)

### Task 1: deck.json discovery in the Vite plugin

**Files:**
- Modify: `packages/core/src/vite/open-slide-plugin.ts`
- Test: `packages/core/src/vite/open-slide-plugin.test.ts` (create)

Replace TSX-glob discovery + regex meta extraction with `deck.json` discovery + JSON meta read. Keep `slideIds`/`slideThemes`/`slideCreatedAt` exports and the HMR event contract identical.

- [ ] **Step 1: Write failing tests** for the pure helpers. Create `open-slide-plugin.test.ts`:

```ts
import { expect, test } from 'vitest';
import { __test } from './open-slide-plugin.ts';

test('toId returns the deck folder name', () => {
  expect(__test.toId('/proj/slides/intro/deck.json', '/proj/slides')).toBe('intro');
});

test('slideIdForEntry matches only slides/<id>/deck.json', () => {
  expect(__test.slideIdForEntry('/proj/slides/intro/deck.json', '/proj/slides')).toBe('intro');
  expect(__test.slideIdForEntry('/proj/slides/intro/index.tsx', '/proj/slides')).toBeNull();
  expect(__test.slideIdForEntry('/proj/slides/intro/assets/x.png', '/proj/slides')).toBeNull();
});

test('readDeckMetaFromJson extracts theme and createdAt', () => {
  const json = JSON.stringify({ meta: { createdAt: '2026-06-05T12:00:00Z', theme: 'acme' } });
  expect(__test.readDeckMetaFromJson(json)).toEqual({ theme: 'acme', createdAt: '2026-06-05T12:00:00Z' });
});

test('readDeckMetaFromJson tolerates missing meta', () => {
  expect(__test.readDeckMetaFromJson('{}')).toEqual({ theme: null, createdAt: null });
  expect(__test.readDeckMetaFromJson('not json')).toEqual({ theme: null, createdAt: null });
});
```

- [ ] **Step 2: Run, expect FAIL:** `pnpm exec vitest run packages/core/src/vite/open-slide-plugin.test.ts`.

- [ ] **Step 3: Modify the plugin.** In `packages/core/src/vite/open-slide-plugin.ts`:

  (a) Change the glob in `findSlides` from `'*/index.{tsx,jsx,ts,js}'` to `'*/deck.json'`.

  (b) Replace `extractMeta`/`readSlideMeta` (the regex meta extractor, ~lines 66-109) with a JSON reader:
```ts
type ExtractedMeta = { theme: string | null; createdAt: string | null };

function readDeckMetaFromJson(raw: string): ExtractedMeta {
  try {
    const parsed = JSON.parse(raw) as { meta?: { theme?: unknown; createdAt?: unknown } };
    const meta = parsed?.meta ?? {};
    return {
      theme: typeof meta.theme === 'string' ? meta.theme : null,
      createdAt: typeof meta.createdAt === 'string' ? meta.createdAt : null,
    };
  } catch {
    return { theme: null, createdAt: null };
  }
}

async function readSlideMeta(abs: string): Promise<ExtractedMeta> {
  try {
    return readDeckMetaFromJson(await fs.readFile(abs, 'utf8'));
  } catch {
    return { theme: null, createdAt: null };
  }
}
```

  (c) In `slideIdForEntry` (~line 186), change the basename check from `/^index\.(tsx|jsx|ts|js)$/` to `=== 'deck.json'`.

  (d) In `generateSlidesModule`, change what the virtual module exports. Each `loadSlide` case currently returns the slide module via `import()`. Replace the exported function with `loadDeckJson` returning the parsed JSON. The import path is the `deck.json` file. Keep the dev HMR-token cache-busting. Concretely, the generated module body becomes:
```js
// virtual:open-slide/slides — generated
export const slideIds = <ids>;
export const slideThemes = <themesJson>;
export const slideCreatedAt = <createdAtJson>;
<devRuntime>   // unchanged: slideImportTokens + open-slide:slide-changed handler

export async function loadDeckJson(id) {
  switch (id) {
<cases>        // each: case 'intro': return (await import(<jsonPath>)).default;
    default: throw new Error('Deck not found: ' + id);
  }
}
```
  where each case (dev) is `case "intro": return (await import(/* @vite-ignore */ "<importPath>?t=" + slideImportTokens["intro"])).default;` and (build) `case "intro": return (await import("<importPath>")).default;`. (Vite imports JSON with the object on `.default`.)

  (e) Export the pure helpers for testing at the bottom of the file:
```ts
export const __test = { toId, slideIdForEntry, readDeckMetaFromJson };
```
  Note `slideIdForEntry` is currently a closure inside `openSlidePlugin`; lift it to a module-level `function slideIdForEntry(p: string, slidesRoot: string): string | null` and call it with `slidesRoot` from inside the plugin. `toId` is already module-level.

- [ ] **Step 4: Run, expect PASS (4 tests):** `pnpm exec vitest run packages/core/src/vite/open-slide-plugin.test.ts`.

- [ ] **Step 5: Format + commit:**
```bash
npx @biomejs/biome check --write packages/core/src/vite/open-slide-plugin.ts packages/core/src/vite/open-slide-plugin.test.ts
npx @biomejs/biome check packages/core/src/vite/open-slide-plugin.ts packages/core/src/vite/open-slide-plugin.test.ts
git add packages/core/src/vite/open-slide-plugin.ts packages/core/src/vite/open-slide-plugin.test.ts
git commit -m "feat(core): discover deck.json instead of index.tsx"
```

---

### Task 2: `loadSlide` adapter — JSON → validate → render

**Files:**
- Modify: `packages/core/src/app/lib/slides.ts`

`virtual:open-slide/slides` now exports `loadDeckJson` (parsed JSON) instead of `loadSlide`. Make `app/lib/slides.ts` run the engine.

- [ ] **Step 1: Rewrite `slides.ts`:**
```ts
import {
  slideCreatedAt as createdAt,
  slideIds as ids,
  loadDeckJson as load,
  slideThemes as themes,
} from 'virtual:open-slide/slides';
import { renderDeck } from '../../doc/render.tsx';
import { validateDeck } from '../../doc/validate.ts';
import type { SlideModule } from './sdk';

export const slideIds: string[] = ids;
export const slideThemes: Record<string, string> = themes;
export const slideCreatedAt: Record<string, number> = createdAt;

export function slidesByTheme(themeId: string): string[] {
  return slideIds.filter((id) => slideThemes[id] === themeId);
}

export async function loadSlide(id: string): Promise<SlideModule> {
  const json = await load(id);
  return renderDeck(validateDeck(json));
}

export function slideChangeIncludes(data: unknown, slideId: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const payload = data as { slideId?: unknown; slideIds?: unknown };
  if (payload.slideId === slideId) return true;
  return Array.isArray(payload.slideIds) && payload.slideIds.includes(slideId);
}
```

- [ ] **Step 2: Update the virtual module type declaration.** Find the ambient module declaration for `virtual:open-slide/slides` (search: `grep -rn "virtual:open-slide/slides" packages/core/src --include=*.d.ts`). Update the declared export from `loadSlide` to `loadDeckJson(id: string): Promise<unknown>` (keep `slideIds`/`slideThemes`/`slideCreatedAt`). If the declaration lives in `packages/core/env.d.ts` or `src/app/vite-env.d.ts`, edit there.

- [ ] **Step 3: Typecheck:** `pnpm core typecheck` — confirm no new errors in `slides.ts` (validateDeck/renderDeck resolve). Report any.

- [ ] **Step 4: Format + commit:**
```bash
npx @biomejs/biome check --write packages/core/src/app/lib/slides.ts
npx @biomejs/biome check packages/core/src/app/lib/slides.ts
git add packages/core/src/app/lib/slides.ts packages/core/env.d.ts packages/core/src/app/*.d.ts 2>/dev/null
git commit -m "feat(core): loadSlide renders deck.json via the doc engine"
```

---

### Task 3: Register built-ins at bootstrap + custom-block virtual module

**Files:**
- Modify: `packages/core/src/app/main.tsx`
- Modify: `packages/core/src/vite/open-slide-plugin.ts` (add `virtual:open-slide/blocks`)
- Modify: the virtual-module type declaration file (add `virtual:open-slide/blocks`)

- [ ] **Step 1: Add the blocks virtual module to the plugin.** In `open-slide-plugin.ts`:
  - Add constant `const BLOCKS_VMOD = 'virtual:open-slide/blocks';`
  - In `resolveId`, claim it: `if (id === BLOCKS_VMOD) return resolved(BLOCKS_VMOD);`
  - In `load`, handle it: detect an optional project blocks entry and emit a static import if present, else an empty module:
```ts
if (id === resolved(BLOCKS_VMOD)) {
  const candidates = ['blocks/index.ts', 'blocks/index.tsx', 'blocks/index.js', 'blocks/index.jsx'];
  for (const rel of candidates) {
    const abs = path.resolve(userCwd, rel);
    if (existsSync(abs)) {
      const importPath = isDev ? `/@fs/${abs.replace(/^\/+/, '')}` : abs;
      return `import ${JSON.stringify(importPath)};\n`;
    }
  }
  return 'export {};\n';
}
```

- [ ] **Step 2: Wire bootstrap.** In `packages/core/src/app/main.tsx`, before `createRoot(...)`:
```ts
import { registerBuiltins } from './doc/index.ts';
import 'virtual:open-slide/blocks';

registerBuiltins();
```
  (The static `import 'virtual:open-slide/blocks'` ensures custom blocks register at init and bundle in production.)

- [ ] **Step 3: Add the type declaration** for `virtual:open-slide/blocks` (a side-effect module) next to the `virtual:open-slide/slides` declaration:
```ts
declare module 'virtual:open-slide/blocks';
```

- [ ] **Step 4: Typecheck + format + commit:**
```bash
pnpm core typecheck
npx @biomejs/biome check --write packages/core/src/app/main.tsx packages/core/src/vite/open-slide-plugin.ts
npx @biomejs/biome check packages/core/src/app/main.tsx packages/core/src/vite/open-slide-plugin.ts
git add -A
git commit -m "feat(core): register built-in + project custom blocks at app init"
```

---

### Task 4: Rewrite `slide.tsx` as a read-only viewer

**Files:**
- Modify (rewrite): `packages/core/src/app/routes/slide.tsx`

This is the highest-judgment task. Goal: a clean read-only viewer with NO editing. **Read the current `slide.tsx` in full first.**

**KEEP (must still work):**
- `useSlideModule(slideId)`; error / loading / empty / `!showSlideUi` (bare `Player`) / `playMode` (`Player` with controls) states.
- The `open-slide:current` HMR send effect (slideId/pageIndex/totalPages/title/view) — skills depend on it. (Drop only the `selection` reporter.)
- Keyboard nav (arrows/space/PageUp/PageDown) and present shortcuts (`f`, Enter, `p`). REMOVE the `d` design-panel shortcut.
- Toolbar: home link, **read-only** title (plain `<h1>`, drop `InlineTitleEditor`/rename), copy-link, the export dropdown (HTML/PDF/PPTX — unchanged), Present split-button, assets `Tabs` (view), `AgentConnectedBadge`.
- Main canvas: `SlideCanvas` + `SlideTransitionLayer`, the thumbnail rail (read-only — pass NO `onReorder`/`actions`), `SlideViewportNavigation` (wheel/click nav), `ResizableRail`.
- `NotesDrawer` MAY remain but **read-only** (display `slide.notes?.[index]`); if its component requires editing wiring, omit it for M1b (notes editing is M2).

**REMOVE entirely (imports + usage):**
- `InspectorProvider`, `InspectToggleButton`, `useInspector`, `InspectOverlay`, `InspectorPanel`, `SaveBar`, `CommentWidget`, `SelectionReporter`.
- `DesignProvider`, `DesignPanel`, `DesignToggleButton`, `designOpen` state, `HistoryProvider`.
- `reorderPage`, `duplicatePage`, `deletePage`, `thumbnailActions`, `remapNotesSessionCacheAfterReorder`, `InlineTitleEditor`, the `/__slides/...` fetches.

- [ ] **Step 1:** Read `packages/core/src/app/routes/slide.tsx` fully.
- [ ] **Step 2:** Rewrite it per the KEEP/REMOVE lists above. Keep `ResizableRail`, `AgentConnectedBadge`, `SlideViewportNavigation` helper components (drop their inspector/`useInspector` dependencies — `SlideViewportNavigation` uses `useInspector().active` to disable nav while inspecting; replace with `enabled: true` / always-on nav). The `DesignProvider` wrapper around the canvas goes away — `SlideCanvas`/rail take `design={slide.design}` directly (already do).
- [ ] **Step 3: Typecheck:** `pnpm core typecheck`. Resolve any references to removed symbols. Report new errors only.
- [ ] **Step 4: Format:** `npx @biomejs/biome check --write packages/core/src/app/routes/slide.tsx` then `npx @biomejs/biome check packages/core/src/app/routes/slide.tsx` (clean).
- [ ] **Step 5: Commit:**
```bash
git add packages/core/src/app/routes/slide.tsx
git commit -m "feat(core): rewrite slide route as a read-only viewer"
```

**Note:** typecheck may still fail because deleted-later files (inspector/design) are imported elsewhere — that's fine for this task as long as `slide.tsx` itself has no references to removed symbols and no NEW errors originate in `slide.tsx`. Full green comes after Phase 2.

---

### Task 5: Sample deck.json + custom block in the demo (testable checkpoint)

**Files:**
- Create: `apps/demo/slides/doc-model-demo/deck.json`
- Create: `apps/demo/blocks/index.ts` (+ a `Callout` custom block) — exercises the escape hatch
- (Leave existing TSX demo decks in place for now; Phase 2 removes them.)

- [ ] **Step 1: Create the custom-block registration** `apps/demo/blocks/index.ts`:
```ts
import { registerBlock } from '@open-slide/core';
import { createElement } from 'react';

registerBlock('callout', ({ block }) =>
  createElement(
    'div',
    {
      style: {
        border: '2px solid var(--osd-accent)',
        borderRadius: 'var(--osd-radius)',
        padding: 32,
        fontFamily: 'var(--osd-font-body)',
        fontSize: 'var(--osd-size-body)',
        color: 'var(--osd-text)',
      },
    },
    String(block.props.text ?? ''),
  ),
);
```

- [ ] **Step 2: Create `apps/demo/slides/doc-model-demo/deck.json`** exercising every built-in layout + several blocks + the custom `callout`:
```json
{
  "schemaVersion": 1,
  "meta": { "title": "Doc Model Demo", "createdAt": "2026-06-05T12:00:00Z" },
  "design": {
    "palette": { "bg": "#0f1115", "text": "#f5f5f4", "accent": "#7c9cff" },
    "fonts": { "display": "Georgia, serif", "body": "-apple-system, system-ui, sans-serif" },
    "typeScale": { "hero": 150, "body": 40 },
    "radius": 12
  },
  "slides": [
    { "id": "s-cover", "layout": "title", "slots": {
      "title": [{ "id": "b1", "type": "heading", "props": { "text": "Doc Model Demo" } }],
      "subtitle": [{ "id": "b2", "type": "text", "props": { "text": "A deck rendered from deck.json" } }]
    }, "notes": "Welcome — this whole deck is structured data." },
    { "id": "s-section", "layout": "section", "slots": {
      "eyebrow": [{ "id": "b3", "type": "text", "props": { "text": "Part One" } }],
      "title": [{ "id": "b4", "type": "heading", "props": { "text": "Layouts" } }]
    } },
    { "id": "s-bullets", "layout": "title-body", "slots": {
      "title": [{ "id": "b5", "type": "heading", "props": { "text": "What works" } }],
      "body": [{ "id": "b6", "type": "bullets", "props": { "items": ["Block/slot layout", "Auto-fit overflow", "Custom blocks"] } }]
    } },
    { "id": "s-two", "layout": "two-col", "slots": {
      "title": [{ "id": "b7", "type": "heading", "props": { "text": "Two columns" } }],
      "left": [{ "id": "b8", "type": "text", "props": { "text": "Left column copy." } }],
      "right": [{ "id": "b9", "type": "quote", "props": { "text": "Structure beats freeform.", "attribution": "open-slide" } }]
    } },
    { "id": "s-custom", "layout": "title-body", "slots": {
      "title": [{ "id": "b10", "type": "heading", "props": { "text": "Custom block" } }],
      "body": [{ "id": "b11", "type": "callout", "props": { "text": "This callout is a project-registered custom block." } }]
    } }
  ]
}
```

- [ ] **Step 3: Manual dev verification.** Run `pnpm dev` (from repo root) and open `http://localhost:5173/s/doc-model-demo`. Confirm:
  - All 5 slides render; arrow keys navigate; the custom `callout` renders (proves `virtual:open-slide/blocks`).
  - `F` enters present mode; `P` opens the presenter window with the cover slide's notes.
  - No inspector/design UI appears; no console errors about `/__edit`, `/__design`.
  Stop the dev server. Record what you observed.

- [ ] **Step 4: Commit:**
```bash
git add apps/demo/slides/doc-model-demo/deck.json apps/demo/blocks/index.ts
git commit -m "test(demo): add deck.json sample exercising layouts + custom block"
```

**End of Phase 1 — the framework now renders and presents a `deck.json` in the real runtime. This is the user's testable checkpoint.**

---

## PHASE 2 — Legacy removal & cleanup (full green)

### Task 6: Remove the inspector & design-panel UI + their libs

**Files (DELETE):**
- `packages/core/src/app/components/inspector/` (entire dir)
- `packages/core/src/app/components/style-panel/` (entire dir)
- `packages/core/src/app/lib/inspector/fiber.ts`, `fiber.test.ts`, `use-editor.ts`, `use-comments.ts` (KEEP `use-notes.ts`)

- [ ] **Step 1:** `git rm -r` the inspector + style-panel component dirs and the four inspector libs (NOT `use-notes.ts`).
- [ ] **Step 2:** `grep -rn "components/inspector\|style-panel\|lib/inspector/fiber\|use-editor\|use-comments" packages/core/src` — fix any remaining importers (there should be none after Task 4 except possibly `home`/thumbnail components; resolve them). `use-notes.ts` may import from `fiber`/`use-editor` — if so, trim those imports to what notes-display needs, or note as concern.
- [ ] **Step 3:** `pnpm core typecheck` — report remaining errors (some expected until Tasks 7-8 remove plugins/routes).
- [ ] **Step 4: Commit:**
```bash
git add -A
git commit -m "refactor(core): remove inspector and design-panel UI"
```

---

### Task 7: Remove legacy Vite plugins (loc-tags, design) + the editing/ AST modules

**Files (DELETE):** `packages/core/src/vite/loc-tags-plugin.ts`, `packages/core/src/vite/design-plugin.ts`, `packages/core/src/editing/edit-ops.ts`, `editing/comments.ts`, `editing/revert-asset.ts`. **Conditionally** delete `editing/babel-walk.ts` if `grep -rn "babel-walk" packages/core/src` shows no remaining importers.
**Files (MODIFY):** `packages/core/src/vite/config.ts` — remove `locTagsPlugin` and `designPlugin` from imports and the `plugins` array.

- [ ] **Step 1:** Remove the two plugin lines from `config.ts` plugins array + their imports (lines ~10, ~59, ~64).
- [ ] **Step 2:** `git rm` the listed `vite/*.ts` and `editing/*.ts` files (check `babel-walk.ts` usage first; `slide-ops.ts` is handled in Task 8 — keep for now).
- [ ] **Step 3:** `grep -rn "loc-tags-plugin\|design-plugin\|editing/edit-ops\|editing/comments\|editing/revert-asset" packages/core/src` — confirm no importers remain.
- [ ] **Step 4: Commit:**
```bash
git add -A
git commit -m "refactor(core): remove loc-tags/design plugins and JSX edit AST ops"
```

---

### Task 8: Prune dev-server edit/comment routes

**Files (MODIFY):** `packages/core/src/vite/api-plugin.ts`, `packages/core/src/vite/routes/slides.ts`
**Files (DELETE):** `packages/core/src/vite/routes/edit.ts`, `packages/core/src/vite/routes/comments.ts`

- [ ] **Step 1:** In `api-plugin.ts` remove imports + registration calls for `registerEditRoutes` and `registerCommentRoutes`. Keep watchers, slides, assets, svgl, folders, update.
- [ ] **Step 2:** `git rm packages/core/src/vite/routes/edit.ts packages/core/src/vite/routes/comments.ts`.
- [ ] **Step 3:** In `routes/slides.ts`, remove the TSX-source-mutation endpoints (reorder, page duplicate/delete, slide duplicate/rename/delete) since those are TSX edits superseded by M2. If removing the whole file leaves `registerSlideRoutes` referenced, instead reduce it to a no-op registration (`export function registerSlideRoutes() {}`) OR remove its import+call from `api-plugin.ts` and `git rm` it. Verify `editing/slide-ops.ts` then has no importers; if so `git rm` it too.
- [ ] **Step 4:** Also remove the now-dead `notes-plugin.ts` write path? NO — notes display still reads from deck.json via the rendered module; the `/__notes` write endpoint is editing (M2). Remove `notesPlugin` from `config.ts` plugins + its import, and `git rm packages/core/src/vite/notes-plugin.ts`, ONLY IF nothing else imports it. (Notes are carried in deck.json and rendered; saving them is M2.) If `NotesDrawer` in `slide.tsx` still imports `useNotes` for editing, ensure Task 4 left it display-only or removed.
- [ ] **Step 5:** `grep -rn "routes/edit\|routes/comments\|registerEditRoutes\|registerCommentRoutes" packages/core/src` — confirm clean.
- [ ] **Step 6: Commit:**
```bash
git add -A
git commit -m "refactor(core): remove TSX source-edit dev-server routes"
```

---

### Task 9: Update package public exports + full green

**Files (MODIFY):** `packages/core/src/index.ts`

- [ ] **Step 1:** `grep` the public `index.ts` for any export that pointed at now-deleted modules (inspector/design components or edit ops). Remove those export lines ONLY. Keep the doc-model exports (from M1a) and all surviving runtime exports (`ImagePlaceholder`, `Page`/`SlideMeta`/`SlideModule`, `DesignSystem` helpers, `useSlidePageNumber`, `Step`/`Steps`, transition types, config type, locale types).
- [ ] **Step 2: Full gates:**
  - `pnpm core typecheck` — MUST be clean now (zero errors).
  - `pnpm test` — MUST pass (engine tests + plugin tests; remove/replace any tests that referenced deleted modules, e.g. `fiber.test.ts` was deleted in Task 6 — confirm no orphaned test imports remain).
  - `npx @biomejs/biome check packages/core/src` — scope to core src; report count. (Pre-existing repo-wide errors outside `packages/core/src` are out of scope.)
- [ ] **Step 3:** If typecheck surfaces a straggler importer of a deleted module, fix it. Re-run until green.
- [ ] **Step 4: Commit:**
```bash
git add -A
git commit -m "refactor(core): prune public exports of removed editing surface"
```

---

### Task 10: Remove legacy TSX demo decks + add deck.json examples

**Files:**
- DELETE: every `apps/demo/slides/*/index.tsx` deck (the existing TSX demo decks).
- The `doc-model-demo/deck.json` from Task 5 stays; OPTIONALLY add 1-2 more `deck.json` decks for variety.
- Update `apps/demo/.folders.json` if it references removed slide ids (keep valid).

- [ ] **Step 1:** `ls apps/demo/slides` to list current decks. `git rm -r` each `apps/demo/slides/<id>/` that contains an `index.tsx` (legacy). Keep `doc-model-demo/`, `.folders.json`, and any `assets/`.
- [ ] **Step 2:** Edit `apps/demo/.folders.json` so `assignments` only references existing deck ids (remove stale entries).
- [ ] **Step 3: Manual verify:** `pnpm dev`, open home `/` — confirm the deck list shows only the deck.json deck(s), each opens and renders. Stop server.
- [ ] **Step 4: Commit:**
```bash
git add -A
git commit -m "test(demo): drop legacy TSX decks; deck.json only"
```

---

### Task 11: Production build verification (REQUIRED — the path that differs most)

- [ ] **Step 1:** From `apps/demo`, run the production build: `pnpm --filter demo build` (or `cd apps/demo && pnpm build`). Confirm it completes with no errors and emits `apps/demo/dist`.
- [ ] **Step 2:** Preview the build: `pnpm --filter demo preview` (serves `dist`). Open the served URL with **no dev server running**. Confirm: the deck.json deck renders, navigates, enters present mode, animates a transition if declared, AND the custom `callout` block renders (proves `virtual:open-slide/blocks` bundled into the static output).
- [ ] **Step 3:** Stop preview. Record results. If the build fails to include the JSON or the custom block, STOP and report — this is the load-bearing build-path requirement from the spec.
- [ ] **Step 4:** (No commit unless build config needed a fix.)

---

### Task 12: CLI template + skills + AGENTS.md (point at deck.json)

**Files:**
- `packages/cli/template/slides/getting-started/index.tsx` → replace with `packages/cli/template/slides/getting-started/deck.json` (+ a starter `blocks/` is optional).
- `packages/cli/template/AGENTS.md`, `README.md` → update authoring instructions to deck.json.
- `packages/cli/template/.agents/skills/` → at MINIMUM make the skills NOT instruct the removed TSX path. Full skill rewrite (the rich deck.json authoring guide) is owned by **M2 Task “agent skills”**; here, replace `slide-authoring`/`create-slide` bodies with a short, correct deck.json contract stub and mark the deep guide as M2. DELETE `apply-comments` (comments are gone). Keep `current-slide` (still valid). `create-theme` — leave or stub.

- [ ] **Step 1:** Replace the template's `getting-started/index.tsx` with a minimal valid `deck.json` (2-3 slides, same schema as the demo). `git rm` the index.tsx.
- [ ] **Step 2:** Rewrite `AGENTS.md` + `README.md` hard rules: a deck lives at `slides/<id>/deck.json`; it's structured JSON validated by the framework; custom React blocks under `blocks/`. Remove all TSX/`index.tsx`/`export default Page[]` references.
- [ ] **Step 3:** Replace `slide-authoring/SKILL.md` and `create-slide/SKILL.md` with short correct stubs describing the deck.json schema (deck → slides → layout + slots → blocks; built-in layout/block names; the design token object). Add a line: “Full authoring guide + edit operations: see M2.” `git rm` the `apply-comments` skill.
- [ ] **Step 4:** `grep -rn "index.tsx\|export default \[" packages/cli/template` — confirm no stale TSX instructions remain.
- [ ] **Step 5: Commit:**
```bash
git add -A
git commit -m "feat(cli): scaffold deck.json projects; update agent docs"
```

---

### Task 13: Major changeset

**Files:** `.changeset/<name>.md`

- [ ] **Step 1:** Create `.changeset/doc-model-source-of-truth.md`:
```md
---
'@open-slide/core': major
'@open-slide/cli': major
---

Make deck.json the source of truth. Slides are authored as a structured document model rendered by a block/layout engine; the TSX authoring path, inspector, and design panel are removed. Editing returns via the structured edit API.
```
  (Confirm `@open-slide/cli` is the correct package name in `packages/cli/package.json`; adjust if different.)
- [ ] **Step 2: Commit:**
```bash
git add .changeset
git commit -m "chore: changeset for deck.json source-of-truth (major)"
```

---

## Self-Review

**Spec coverage (M1b portion of the design spec):**
- Vite plugin discovery → `deck.json`, meta from JSON, `parseCreatedAtMs` reused → Task 1 ✓
- `loadSlide` runs validate+render (notes aggregation/design passthrough via M1a `renderDeck`) → Task 2 ✓
- `virtual:open-slide/blocks` static import (bundles in dev+build), `registerBuiltins` at init → Task 3 ✓
- Read-only viewer; editing deferred to M2 → Task 4 ✓
- Sample deck.json + custom block (escape hatch) → Task 5 ✓
- Remove inspector/design/loc-tags/edit-ops/comments/edit-routes (hard cut) → Tasks 6-9 ✓
- Demo migration (drop TSX decks) → Task 10 ✓
- Production build verification (required) → Task 11 ✓
- CLI template + skills off the TSX path → Task 12 ✓
- Major version bump + changeset → Task 13 ✓

**Deferred to M2 (by design):** structured edit API + undo/redo; notes/title/page-op editing over deck.json; the full deck.json authoring skill rewrite; in-app copilot (M4).

**Risks / watch items:**
- The virtual-module `.d.ts` declaration must be updated for `loadDeckJson` + `blocks` or typecheck/build breaks (Tasks 2-3).
- `slide.tsx` rewrite (Task 4) is the judgment-heavy step — verify the kept `open-slide:current` send and present/nav still work in the Task 5 manual check.
- `use-notes.ts` may import deleted inspector libs — Task 6 trims or the import breaks typecheck (caught in Task 9 green gate).
- Build path (Task 11) is the real proof; do not skip it.

**Placeholder scan:** code-bearing steps include real code; refactor/removal steps give exact files + grep verification commands. No "TBD".
