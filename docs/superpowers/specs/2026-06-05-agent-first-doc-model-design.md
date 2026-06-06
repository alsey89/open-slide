# Agent-first, human-editable open-slide — Document-model pivot

**Date:** 2026-06-05
**Status:** Design — awaiting review
**Scope of this doc:** Overall direction + a detailed spec for **Milestone 1 (Foundation)**. Later milestones are sketched, not specified.

## Why

open-slide today is a *code-first* framework: the source of truth for a deck is freeform React (`slides/<id>/index.tsx`) rendered onto a fixed 1920×1080 canvas with absolute pixel positioning. That single fact is the root cause of "hard to edit once generated":

- **Not usable without a developer** — anything structural requires editing React.
- **Not freely editable** — the inspector can only poke at properties (text, color, size); it can't add/move/reorder elements or restructure a slide.
- **Only partially agent-friendly** — agents regenerate whole slides rather than edit them, because surgically rewriting arbitrary React is unreliable.

### Goals

1. **Usable without agents** — a non-developer can build and edit a deck via WYSIWYG ("PowerPoint-lite").
2. **Supercharged with agents** — an agent edits decks reliably for content and styling.
3. **Freely editable after generation** — to a reasonable degree, by humans and agents alike.

### The pivot

Flip the source of truth from **code** to a **structured document model** (JSON). A document model serves all three goals at once: humans get true WYSIWYG, agents get a structured target they can edit surgically, and "freely editable" becomes trivial because a deck is just data. The trade is giving up arbitrary per-slide code in favor of a curated block palette — with custom React blocks as an escape hatch.

## Decisions locked (from brainstorming)

| Decision | Choice |
| --- | --- |
| Source of truth | Structured JSON document model |
| Codebase strategy | **Reuse** the existing React runtime (viewer, present mode, two-window sync, transitions, scaling); build the model + renderer + editor + agent layer on top |
| Layout model | **Block/slot layout**: layout templates own alignment/spacing/reflow; content flows into named slots. Free-positioning is a future escape hatch, not the default |
| Block extensibility | **Open registry**: built-in blocks ship with the framework; a deck can register custom React blocks by `type`. The model stores only `type + props` |
| Persistence / deployment | **Local-first**: a deck is JSON + assets on disk, edited via the local dev server, git-friendly. No backend, no accounts |
| Agent interface | **File-agent first** (Claude Code + skills editing JSON through a structured edit API), then an in-app chat copilot on the same API |
| Legacy TSX decks | **Hard cut** — drop the TSX authoring path entirely and commit to the doc model |

## Overall architecture

```
deck.json (source of truth, on disk, git-friendly)
        │
        ▼
  Doc model + versioned schema          ← agents & editor both target THIS
        │
        ├──────────────┐
        ▼              ▼
  Renderer        Structured Edit API   (M2)
 (JSON → React,   (typed ops, undo/redo,
  via block        persist to deck.json)
  registry)            ▲           ▲
        │              │           │
        ▼          WYSIWYG       Agent layer
  Existing React   editor (M3)   (M2 skills →
  runtime (player,               edit API; M4
  present, trans-                in-app copilot)
  itions, scaling)
```

### Milestones

- **M1 — Foundation (specified below):** document model + versioned schema, block registry, an initial set of built-in blocks + layout templates, a JSON→React renderer that adapts to the existing `SlideModule` contract, deck discovery via `deck.json`, viewer integration, and removal of the legacy TSX authoring path. Proves the architecture end-to-end: a `deck.json` renders and navigates in the real runtime, in present mode, with transitions.
- **M2 — Structured edit API + agent skills:** typed operations layer (add/move/update/remove block, set slot content, change layout, set theme) with undo/redo, persisting to `deck.json` via the dev server; rewritten skills so an agent edits decks reliably. Delivers agent-first *editing* (M1 already allows agent *authoring* of raw JSON).
- **M3 — WYSIWYG editor:** selection, slot editing, rich text, block insert/reorder, layout switching, design panel. Delivers "usable without agents."
- **M4 — In-app copilot:** chat panel wired to an LLM that drives the same edit API.

---

# M1 — Foundation (detailed design)

## Integration strategy (the load-bearing idea)

The entire runtime already consumes a single contract:

```ts
type SlideModule = { default: Page[]; meta?; design?; notes?; transition? };
```

`slide.tsx`, `player.tsx`, `presenter.tsx`, the transition layer, and `useSlideModule` all work off this. **The renderer's job is to produce a `SlideModule` from a `deck.json`.** Each slide in the JSON becomes a zero-prop `Page` component that renders its layout template + blocks via the registry. We change only:

1. **How `loadSlide(id)` produces the module** — build it from parsed JSON + renderer instead of `import()`-ing a `.tsx` file.
2. **How decks are discovered** — glob `deck.json` instead of `index.{tsx,jsx,ts,js}`.

Everything downstream (navigation, present mode, two-window sync, transitions, canvas scaling, page-number hook) is reused as-is.

### Deck ↔ runtime mapping

- A directory `slides/<id>/` contains one `deck.json` = one presentation. (Directory name kept as `slides/` to minimize churn in routing/discovery; route stays `/s/<id>`. Renaming to `decks/` is a cosmetic follow-up, out of scope for M1.)
- Slide-local assets stay at `slides/<id>/assets/`; global assets at root `assets/` via the `@assets` alias (unchanged).
- A deck's `slides[]` map to the module's `default: Page[]` (each JSON slide → one rendered page/canvas). `meta`, `design`, `transition` map onto the existing module fields. **`notes` aggregation:** each slide's optional `notes?: string` is collected, in slide order, into the module's index-aligned `notes?: (string | undefined)[]` that the presenter window already reads.
- **`createdAt` transform:** discovery must replicate the existing `parseCreatedAtMs` (ISO → ms epoch) so the browser's slide-list sort keeps working — read it from JSON instead of the current regex-on-TSX.

## Build & deploy path (works in dev AND in a built bundle)

This is a first-class requirement, not just a dev concern. M1's success criterion (present mode, sharing) implies a production build, and that is the path that differs most from dev.

Today `loadSlide(id)` is a generated virtual module that emits one `import()` per slide, which Rollup statically bundles for production. The doc-model equivalent:

- The generated `virtual:open-slide/slides` emits, per deck, an `import('<abs>/deck.json')`. Rollup/Vite import JSON natively as a data module, so the deck's data is bundled (or code-split) like any asset — no dev server required at runtime.
- The **renderer and block registry are ordinary client-side code already shipped in the `@open-slide/core` app bundle.** `loadSlide(id)` becomes: import the JSON → validate → run the renderer → return a `SlideModule`. Data lives in the bundle; rendering logic lives in the bundle. Nothing is server-side.
- Therefore a `pnpm build` of a deck produces a static bundle that renders, navigates, presents, and animates with no backend — identical behavior to dev minus HMR.

## Document model & schema

A first-cut shape (TypeScript types; the on-disk form is JSON). Final field names are reviewable.

```ts
type Deck = {
  schemaVersion: 1;
  meta: { title?: string; createdAt: string; theme?: string };
  // createdAt: ISO 8601 string literal. theme: optional NAMED reference, used only
  // by the browser's theme-grouping / /themes/<id> UI (same role as today's meta.theme).
  design: DesignSystem;       // the actual design tokens; reuse existing DesignSystem for M1
  slides: Slide[];
};

type Slide = {
  id: string;                 // stable, unique within the deck; addressed by edit API / agents
  layout: string;             // layout template type, resolved via registry
  slots: Record<string, Block[]>;   // keyed by slot name defined by the layout
  notes?: string;
  transition?: SlideTransition;     // reuse existing type
};

type Block = {
  id: string;                 // stable, unique within the deck
  type: string;               // resolved via block registry
  props: Record<string, unknown>;
};
```

Notes:
- `design` reuses the existing `DesignSystem` (palette/fonts/typeScale/radius), applied via the existing `designToCssVars`. Extending the token set is a later concern. Theme tokens are **inline** in M1; `meta.theme` remains an optional *named* string purely for the existing browser grouping UI — model and discovery agree on this split.
- `schemaVersion` is mandatory and gates future migrations.
- **No `children` on `Block`** (dropped per YAGNI — layouts express structure via slots; no container block ships in M1). Consequence: the block tree is flat (deck → slides → slots → blocks), which keeps the hand-written validator tractable.
- **Stable ids** on slides and blocks so the M2 edit API and agents can address nodes without positional fragility. Ids are minted by whoever creates the node (agent, editor, or hand-author), short and url-safe (e.g. `s1`, `b3`, or a slug). Validation enforces **uniqueness within a deck** and rejects duplicates with a clear error — agents will rely on addressing by id.

### Validation

- A hand-written validator parses `deck.json` at load — **zero new runtime deps** per the "don't inflate install size" rule. The flat block tree (no `children`) keeps this tractable: validate `schemaVersion`, required `meta.createdAt`, `design`, each slide's `layout`/`slots`, each block's `type`/`props`, and **id uniqueness** across the deck.
- Validation runs both at dev load and as part of the build (so a malformed deck fails the build, not just the dev preview).
- On invalid JSON or schema mismatch, surface a readable error through the **existing** error path (`useSlideModule` already exposes `error`), rendered as a clear failure card — never a blank screen or crash.
- Fallback if error messages get painful by hand: a **dev/build-only** validator using a heavier schema dep, tree-shaken out of the runtime bundle. Not adopted unless needed.

## Block registry

```ts
type BlockRenderer = ComponentType<{ block: Block; ctx: RenderCtx }>;
type LayoutRenderer = ComponentType<{ slide: Slide; ctx: RenderCtx; renderSlot: (name: string) => ReactNode }>;

registerBlock(type: string, renderer: BlockRenderer, schema?: BlockPropsSchema): void;
registerLayout(type: string, renderer: LayoutRenderer, slots: string[]): void;
```

- Built-ins are registered by the framework at startup.
- **Custom block registration must survive a production build** (the escape hatch is worthless if it only works in dev). Mechanism: a new generated module `virtual:open-slide/blocks` that **statically imports** the project's block-registration file (a conventional/configurable path, e.g. `blocks/index.ts`) and is part of the app entry graph in *both* dev and build. Because the import is static, Rollup bundles the custom blocks into the deployed deck — no dev server at runtime. The registration file calls `registerBlock(...)`/`registerLayout(...)` at import time. This is specified here (not deferred) because it is coupled to the build path above and load-bearing for the escape-hatch promise.
- **Unknown `type`** → render a visible "unknown block: X" placeholder card, not a crash. Keeps decks resilient and makes missing custom blocks obvious in both dev and built decks.

## Built-in blocks & layouts (initial set)

Layout templates (each defines named slots; owns alignment, padding, reflow within the 1920×1080 canvas, honoring the existing type-scale/spacing discipline):

- `title` — centered hero (slots: `title`, `subtitle`)
- `title-body` — heading + content (slots: `title`, `body`)
- `two-col` — heading + two content columns (slots: `title`, `left`, `right`)
- `media-text` — media beside text (slots: `title`, `media`, `body`)
- `section` — section divider (slots: `title`, `eyebrow`)

Content blocks:

- `heading` — title/heading text
- `text` — paragraph
- `bullets` — bulleted list (props: `items: string[]`)
- `image` — image from slide-local/global asset (props: `src`, `alt`, `fit`)
- `quote` — pull quote (props: `text`, `attribution`)
- `code` — code block (props: `code`, `lang`)

Rich text within a text/heading block: **M1 keeps it simple** — plain string props. Inline runs (bold/italic/color spans) are deferred to M2/M3 where the editor needs them.

Out of scope for M1 blocks: charts, tables, free-positioned elements, stepped reveals (`<Steps>`/`<Step>`). Stepped reveals re-enter later as a block/slot reveal property.

## Discovery & dev-server changes

- Vite plugin: change the discovery glob to find `slides/*/deck.json`; build `slideIds`, and read `meta.theme`/`createdAt` from JSON (replacing the current regex-on-TSX approach — JSON parse is cleaner and more reliable).
- `loadSlide(id)`: read + validate `deck.json`, run it through the renderer to produce a `SlideModule`.
- HMR: watch `slides/**/deck.json`; on change, invalidate and re-emit `open-slide:slide-changed` (the existing client handler in `useSlideModule` already reloads on this event — reused as-is).
- `.folders.json` organization and the home/browser UI continue to work against `slideIds`.

## Removing the legacy TSX path

Hard cut:
- Remove TSX slide discovery/compilation and the `index.tsx` contract from the plugin.
- Remove or repurpose the AST-based inspector write-back (`editing/edit-ops.ts`, `/__edit` routes) — these targeted TSX source; they're superseded by the M2 edit API over JSON. For M1, the inspector/edit endpoints may be disabled/stubbed rather than deleted wholesale if that reduces churn, but the TSX *authoring* and *discovery* path goes away.
- Update the `@open-slide/core` public API (`index.ts`): the `Page[]`/`SlideModule` author-facing exports change meaning (now internal to the renderer, not authored by hand). Public surface for M1 centers on the document-model types, the registry API, and `DesignSystem`.
- Update bundled skills (`slide-authoring`, `create-slide`, etc.) — at minimum mark them stale / point them at the new JSON contract. Full skill rewrite is M2, but they must not instruct authoring of the now-removed TSX path.
- Update the CLI template (`packages/cli/template`) to scaffold a `deck.json`-based example instead of `index.tsx`.

## Error handling

- Invalid/missing `deck.json` → readable error via existing `error` channel + failure card.
- Unknown block/layout `type` → visible placeholder card, deck still renders.
- Asset not found → existing image-error behavior; placeholder where applicable.

## Testing

- **Unit (vitest):** schema validation (valid passes, malformed/missing-version/unknown-field cases produce clear errors); renderer maps a sample `deck.json` to a `SlideModule` with the expected pages; unknown block type renders the placeholder rather than throwing.
- **Render (RTL):** render a representative deck; assert each layout's slots render their blocks; assert design tokens apply as CSS vars.
- **Build path (required, not optional):** `pnpm build` the demo, then serve `dist/` and confirm the example deck renders, navigates, enters present mode + the presenter window, and animates a declared transition — with **no dev server running**. This exercises the JSON-import + client-side-render path that differs most from dev. A custom block in the example must also render in the built output (proves `virtual:open-slide/blocks` bundling).
- **Integration (manual, `pnpm dev`):** same checks under HMR.
- A committed **example `deck.json`** under `slides/` doubles as a fixture and a dogfood deck in `apps/demo`.

## Out of scope for M1 (explicit)

- Structured edit API + undo/redo (M2)
- Agent skill rewrite + in-app copilot (M2/M4)
- WYSIWYG editor (M3)
- Rich-text inline runs, charts, tables, free-positioning, stepped reveals
- TSX → doc-model migration (hard cut; not building a converter)

## Overflow / reflow strategy

The genuinely hard part of slot layout on a fixed 1920×1080 canvas is content that doesn't fit (long titles, tall bullet lists, varying image aspect ratios). Hand-tuned TSX solved this per-slide; templates must solve it generically.

**M1 default: measure-and-scale-to-fit per slot.** Content lays out at its natural size; if it exceeds the slot, the slot scales it down to fit, within a sensible minimum (below which it stops shrinking and the overflow becomes visible rather than illegibly tiny). Images honor an explicit `fit` prop (`cover`/`contain`). No silent hard-clipping. A visible overflow signal for editors is an M3 concern. (Alternatives considered: hard clip — rejected, silently loses content; constrain-and-reject — rejected, too rigid for agent/blind authoring.)

## Demo migration

Hard cut means every `apps/demo/slides/*/index.tsx` stops working. Scope: **delete the demo TSX decks and replace them with one (or a few) example `deck.json` decks** that exercise each built-in layout/block plus one custom block. No TSX→JSON converter is built. The `Steps`/`Step` *authoring* primitive (#164) is retired until it returns as a block-level reveal property; viewer/present features such as the keyboard shortcuts (#203) are runtime and are unaffected.

## Risks / open questions

- **Layout quality bar:** block/slot templates must look as good as today's hand-tuned slides. Mitigation: port the type-scale/spacing discipline from the `slide-authoring` reference into the layout templates themselves, and lean on the overflow strategy above.
- **Editing-regression valley:** between M1 (inspector removed) and M3 (WYSIWYG), the only editing path is an agent editing raw JSON — non-developers cannot edit at all. This is an **accepted, temporary** inversion of goal #1 for the duration of M2. Revisit if the valley proves too costly (e.g. bring a minimal editor forward).
- **Public API churn:** dropping the TSX contract is a breaking change to `@open-slide/core` → **major** version bump + changeset.
- **Directory naming** (`slides/` vs `decks/`): kept as `slides/` for M1 to minimize churn; revisit.

## Release / repo hygiene

- Changes touch `packages/core` (and `packages/cli` template) → **changeset required**, **major** bump (breaking: TSX authoring removed).
- Biome must pass (`pnpm check`).
- No new runtime dependencies in `core` without strong justification (validation done by hand).
