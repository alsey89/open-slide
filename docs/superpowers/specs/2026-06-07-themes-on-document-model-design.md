# Re-founding Themes on the Document Model

**Date:** 2026-06-07
**Status:** Approved design, ready for implementation plan
**Scope:** `packages/core`, `packages/cli`, `apps/demo`

## Problem

Themes are the one part of open-slide that never made the jump to the document-model pivot. Today a "theme" is a TSX-demo bundle (`themes/<id>.md` + `themes/<id>.demo.tsx`) — a parallel authoring track, disconnected from any deck. The 4 upstream bundles in `apps/demo/themes/` render in a read-only `/themes` gallery but cannot be *applied* to a deck. Meanwhile a deck's actual look lives entirely in its design tokens (`deck.design`), and there are 12 anonymous token presets orphaned in `design-presets.ts` (with an unused `shuffleDesign`) that nothing imports.

The result: two unrelated notions of "theme", neither connected to the thing that actually controls a deck's appearance.

## Decision (settled)

A **theme is a named, reusable design-token preset** — a project file an agent writes and a human edits, that previews in the UI and applies to a deck. It replaces the TSX-demo bundles. Theming's home is the deck's design tokens (`DesignSystem`: palette `bg/surface/text/muted/accent/border`, fonts `display/body`, typeScale `hero/heading/body/caption`, `space`, `radius`, `shadow`).

Tokens-only. No fixed header/footer blocks (YAGNI — revisit only on real need).

## Goals

- A theme is a first-class project file with the same lifecycle as `deck.json` and `assets/`: discovered via a Vite virtual module, written through a dev-server endpoint, authored by a skill, edited live by a human.
- Applying a theme reskins the open deck through the existing `set-design` op pipeline (undoable, persisted).
- A human can capture the current deck's design as a new theme ("Save as theme").
- The `/themes` route survives as a **preview catalog** that previews each theme on a canned sample slide rendered through its tokens.
- Built-ins ship as seeded project files, not a separate core source list.

## Non-goals

- Fixed blocks / header-footer presets in a theme.
- Live inheritance (a deck does not stay linked to a theme; tokens are copied in).
- A "new deck from theme" creation flow (out of scope; apply happens on existing decks).
- Theme editing UI beyond "apply" and "save current as theme" (token editing already exists in the design panel; theme JSON is hand/agent-editable).

## Architecture

### Theme file format

`themes/<id>.json` — `id` derived from the filename:

```json
{
  "name": "Aurora",
  "description": "Late-night developer doc — one violet light source.",
  "design": {
    "palette": { "bg": "#0E0E0E", "accent": "#A78BFA" },
    "fonts": { "display": "\"SF Mono\", monospace" },
    "typeScale": { "hero": 116 },
    "radius": 16
  }
}
```

`design` is a `DeepPartial<DesignSystem>` — only the roles the theme cares about; `normalizeDesign()` fills the rest from `defaultDesign`. This is exactly the partial-preset convention already used by `design-presets.ts`.

### Discovery & loading (Vite virtual module)

Rewrite `packages/core/src/vite/themes-plugin.ts`:

- Glob `themes/*.json` (was `*.md`).
- For each file: `id` = basename, parse JSON, shape-check, keep `{ id, name, description, design }`.
- Emit `virtual:open-slide/themes`:
  ```js
  export const themes = [{ id, name, description, design }, ...];
  ```
  Remove `loadThemeDemo` and the `/@fs` demo-import switch entirely.
- Watcher: invalidate + full-reload on add/unlink/change of `themes/*.json` (drop the `.demo.*` cases).

Rewrite `packages/core/src/app/lib/themes.ts`:

- `type Theme = { id: string; name: string; description: string; design: DesignSystem }`.
- Re-export the virtual list, normalizing `design` at the edge (`normalizeDesign(raw.design)`).
- Keep `slidesByTheme(id)` (reads the existing `slideThemes` map from the slides plugin — unchanged).
- Drop the `hasDemo` / `body` / `loadThemeDemo` surface.

### Built-ins as seeded files

Convert the 12 presets in `packages/core/src/app/lib/design-presets.ts` into named `themes/*.json` seed files. Give each a `name` + short `description`. Ship them in:

- `packages/cli/template/themes/` — new projects open with a populated gallery.
- `apps/demo/themes/` — replacing the 4 TSX bundles (dogfood target).

Delete `packages/core/src/app/lib/design-presets.ts` and the unused `shuffleDesign` (the named picker supersedes the anonymous shuffle).

### Apply flow — design panel (primary surface)

In `packages/core/src/app/components/editor/design-panel.tsx`, add a "Themes" section above the existing token controls:

- A grid of named swatches (a few palette dots + the theme name), read from `lib/themes`.
- Click a swatch → `onChange(normalizeDesign(theme.design))`. This flows through the panel's existing `onChange` → `OutlinePanel.onDesignChange` → `editor.apply({ kind: 'set-design', design })` → `OpFlusher` → `POST /__deck/:id`. Undoable and persisted via the existing pipeline; no new op needed.
- Applying also stamps provenance: `meta.theme = theme.id`. The current op set has no `set-deck-meta`/`set-theme` op, so add a minimal op for this:
  - `{ kind: 'set-deck-theme'; theme?: string }` in `packages/core/src/doc/ops.ts` (`mutate` sets `deck.meta.theme = op.theme` or deletes it when undefined). Applying a theme dispatches `[{ set-design }, { set-deck-theme }]` together.
- "Save current design as a theme" control: prompt for a name → `POST /__themes { name, design: currentDesign }`. On success the watcher reloads and the theme appears in the gallery/picker.

The design panel currently receives `design` + `onChange`. It will additionally need: the deck's current `design` for the save action (already has it), and an `onApplyTheme(theme)` callback (so the parent can dispatch both ops atomically) rather than reusing bare `onChange`. Thread `onApplyTheme` from `DeckEditor` → `OutlinePanel` → `DesignPanel`.

### `/themes` catalog route (kept, re-founded)

`packages/core/src/app/routes/themes.tsx`, `components/themes/themes-gallery.tsx`, `components/themes/theme-detail.tsx`:

- **Gallery card**: render one shared **canned sample slide** through the theme's tokens. The sample is a small built-in `Slide`/blocks structure (hero heading, body copy, a stat/accent element, caption) rendered in a scaled, non-interactive `SlideCanvas` with `style={{ ...designToCssVars(normalizeDesign(theme.design)) }}`. One sample, re-rendered per theme. Card shows name + description.
- **Detail page**: larger sample preview + a token readout (palette swatches, fonts, type scale) derived from `normalizeDesign(theme.design)` + the existing "Used by" list (`slidesByTheme`). Remove markdown-body rendering, arrow-key demo paging, and `useThemeDemo`/`loadThemeDemo`.
- Routes stay registered in `app.tsx` (`/themes`, `/themes/:themeId`), gated by `showSlideBrowser` as today. Home-card 🎨 chip (`home.tsx` ~482) is unchanged — it already links to `/themes/:id` from `meta.theme`.

The shared sample slide lives as a constant in core (e.g. `app/lib/theme-sample.ts`), rendered via the existing block renderer.

### Server route — `POST /__themes`

New `packages/core/src/vite/routes/themes.ts`, `registerThemeRoutes(server, ctx)`, wired into `api-plugin.ts` after the other routes. Mirrors `folders.ts`:

- `POST /__themes { name, design }`:
  - `validateMutationRequest(req, { requireJsonBody: true })`.
  - Validate `name` (non-empty string); slugify → `id` (kebab, `[a-z0-9-]`), guard path traversal, ensure uniqueness (suffix `-2` etc. if taken).
  - Validate `design` is an object; `normalizeDesign` it (forgiving — fills defaults).
  - Write `themes/<id>.json` (pretty-printed, trailing newline) under `ctx.userCwd`'s themes dir (resolve from config `themesDir ?? 'themes'`, create dir if missing).
  - Return `{ id, name }`.
- `ApiContext` needs the themes root; add `themesRoot` to `context.ts` (resolved like `slidesRoot`) or resolve inline from `userCwd` + config.

Server-side validation reuses `normalizeDesign` from `app/lib/design.ts` (pure, no React — safe node-side, same as the plugin importing it). If types/normalize later want a neutral home, lift them to `doc/`; not required for this work.

### Skill rewrite — `create-theme`

`packages/core/skills/create-theme/SKILL.md`: author a single `themes/<id>.json` preset.

- Input: images / text / an existing deck's tokens.
- Output: one JSON file with `name`, `description`, and a `design` `DeepPartial<DesignSystem>` (document the token roles + sensible ranges: hero ~120–220px, etc.).
- Drop all `.md` frontmatter + `.demo.tsx` instructions, fixed-component TSX, motion sections.
- Re-sync the distributions: the symlink at `apps/demo/.agents/skills/create-theme` (points at core) and the copy at `packages/cli/template/.agents/skills/create-theme`.
- Update `slide-authoring` skill's theme references (`meta.theme` semantics: provenance stamp set on apply) to match.

## Data flow (apply a theme)

```
DesignPanel swatch click
  → onApplyTheme(theme)
  → DeckEditor: editor.apply([{kind:'set-design', design: normalizeDesign(theme.design)}, {kind:'set-deck-theme', theme: theme.id}])
  → applyOps (local state, validated) + OpFlusher.enqueue
  → POST /__deck/:id { ops }
  → applyOpsToJson → write deck.json   (deck.design replaced, meta.theme stamped)
  → SlideCanvas re-renders via designToCssVars(deck.design)
```

## Data flow (save current design as theme)

```
DesignPanel "Save as theme" → prompt name
  → POST /__themes { name, design: deck.design }
  → write themes/<id>.json
  → themes-plugin watcher invalidates virtual module → full reload
  → theme appears in picker + /themes gallery
```

## Removals

- `apps/demo/themes/{aurora,bright-sans,replit,sticker-pop}.{md,demo.tsx}` (8 files).
- `loadThemeDemo` path + `.demo.*` handling in `themes-plugin.ts`.
- `packages/core/src/app/lib/design-presets.ts` + `shuffleDesign`.
- Markdown-body / TSX-demo rendering in `themes-gallery.tsx` + `theme-detail.tsx` (`useThemeDemo`, demo paging).
- `.md` frontmatter parsing in the themes plugin.

## Testing & verification

- **Unit (vitest):** `set-deck-theme` op application; themes-plugin module generation from JSON fixtures; `POST /__themes` slugify/uniqueness/normalize (route-level if testable, else extracted helper); theme JSON shape validation.
- **Typecheck + biome:** clean across the graph.
- **Browser (after `pnpm core build`, hard-refresh / clear `.vite` if dual-React error):**
  - `/themes` gallery renders sample-slide previews for each seeded theme.
  - Theme detail shows preview + token readout + "Used by".
  - Applying a theme from the design panel reskins the open deck live and persists to `deck.json` (`design` replaced, `meta.theme` stamped); 🎨 chip updates on home.
  - "Save as theme" writes `themes/<id>.json`, which reappears in the gallery/picker without restart.

## Changesets

`packages/core` (minor — new theme model, route, op, design-panel apply/save) and `packages/cli` (minor — template seeds + skill). Short, present-tense, user-facing one-liners per repo convention. `apps/demo` needs none.

## Open implementation notes

- Atomic apply: dispatch `set-design` + `set-deck-theme` in a single `editor.apply([...])` so one server round-trip persists both.
- The home-card chip already handles a missing theme gracefully; no change needed there.
- Keep `slideThemes` (slides plugin) as-is — `meta.theme` still feeds it.
- Optional follow-up (not in scope): a "Surprise me" that applies a random theme, reusing the old shuffle idea over the named set.
