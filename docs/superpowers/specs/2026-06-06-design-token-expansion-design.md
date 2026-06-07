# Expanded design-token model (WS1)

**Date:** 2026-06-06
**Status:** Design — approved
**Scope of this doc:** WS1 only — expand the `DesignSystem` token vocabulary. Part of a larger build plan (WS2 = new blocks/layouts, WS3 = registry prop-schema) specified separately.

## Why

A no-agent (tier-1) user only has the built-in tokens to theme a deck. Today that is **8 tokens**: 3 colors (`bg`/`text`/`accent`), 2 fonts, 2 type sizes (`hero`/`body`), 1 radius. This is the binding constraint on how good *any* block can look — built-in or custom — because it's the entire styling vocabulary a block can inherit.

Evidence it bites: the demo custom-block pack hardcodes `box-shadow`/`rgba(...)` overlays ~16 times and `letterSpacing` 3×, because there are no tokens for surface colors, borders, or elevation. Custom blocks bypass the token system rather than inherit it.

Expanding the vocabulary makes the existing 6 built-in blocks look better for free and gives custom/agent blocks a real palette to inherit. This is higher leverage than adding more blocks.

## Decisions locked (from brainstorming)

| Decision | Choice |
| --- | --- |
| Token scope | **Balanced additive** — 15 tokens total (was 8) |
| Retrofit existing blocks? | **No** — purely additive; existing block rendering untouched |
| Naming | Keep existing names (`hero`, `body`, `bg`, etc.); do **not** rename `hero`→`display` |
| Partial designs | **All design fields optional**; `normalizeDesign` fills defaults at load |
| Backward compat | Not a user concern (no users); normalize is for ergonomics/robustness, and the 3 demo decks keep working as a free side effect |

## The token model

Additive to `DesignSystem`. New fields in **bold**.

| Group | Token | CSS var | Default (light) |
| --- | --- | --- | --- |
| palette | `bg` | `--osd-bg` | `#f7f5f0` |
| | **`surface`** | `--osd-surface` | `#ffffff` |
| | `text` | `--osd-text` | `#1a1814` |
| | **`muted`** | `--osd-muted` | `#6b6358` |
| | `accent` | `--osd-accent` | `#6d4cff` |
| | **`border`** | `--osd-border` | `#e0d9cc` |
| fonts | `display`, `body` | `--osd-font-display`, `--osd-font-body` | *(unchanged)* |
| typeScale | `hero` | `--osd-size-hero` | `168` |
| | **`heading`** | `--osd-size-heading` | `64` |
| | `body` | `--osd-size-body` | `36` |
| | **`caption`** | `--osd-size-caption` | `20` |
| spacing | **`space`** | `--osd-space` | `8` |
| radius | `radius` | `--osd-radius` | `12` *(unchanged)* |
| elevation | **`shadow`** | `--osd-shadow` | `0 8px 24px rgba(0,0,0,0.12)` |

`space` is a single base unit (px); blocks derive rhythm from it (e.g. `calc(var(--osd-space) * 2)`). Numeric tokens (`hero`/`heading`/`body`/`caption`/`space`/`radius`) emit as `${n}px`; `shadow` is a raw CSS string.

## Components changed

All in `packages/core`.

### `src/app/lib/design.ts`
- Extend `DesignPalette` (+`surface`, +`muted`, +`border`), `DesignTypeScale` (+`heading`, +`caption`), `DesignSystem` (+`space: number`, +`shadow: string`).
- `designToCssVars` emits the 7 new vars (total 15).
- `defaultDesign` provides values for every field (table above).
- **New** `normalizeDesign(partial: DeepPartial<DesignSystem>): DesignSystem` — deep-merges a partial design over `defaultDesign` (per-group merge so a partial `palette` keeps provided keys and fills the rest). This is the single source of "fill the gaps."

### `src/doc/validate.ts`
- `validateDesign` becomes lenient: every field is **optional**; when a field *is* present it must be the right type (string for colors/fonts/shadow, number for sizes/space/radius). Wrong type still fails; absence never fails.

### `src/doc/render.tsx` (the normalize boundary)
- `renderDeck` currently passes `design: deck.design` into the rendered module (render.tsx:37). Change to `design: normalizeDesign(deck.design)`. This is the single runtime boundary where `deck.design` becomes render state, so normalizing here guarantees `SlideCanvas` / `designToCssVars` always receive a complete `DesignSystem`. (The `Deck` model type keeps `design` as the full `DesignSystem`; partials live only in on-disk JSON until load.)

### `src/app/components/editor/design-panel.tsx`
- Add editor controls for the new tokens: color inputs for `surface`/`muted`/`border`; number inputs for `heading`/`caption`/`space`; a text input for `shadow`. Follow the existing control patterns in the panel.

## Data flow

```
deck.json (may be partial design)
   → validateDeck            (shape ok; partial design allowed)
   → renderDeck
       → normalizeDesign(deck.design)   ← gaps filled to full DesignSystem
       → SlideModule.design (complete)
   → SlideCanvas → designToCssVars → 15 CSS vars on the slide root
   → blocks read var(--osd-*)
```

## Testing

- `src/app/lib/design.test.ts` (new or extended):
  - `normalizeDesign({})` deep-equals `defaultDesign`.
  - Partial merge: `normalizeDesign({ palette: { accent: '#f00' } })` keeps `#f00` and fills the other 5 palette roles + all other groups from defaults.
  - `designToCssVars(defaultDesign)` contains all 15 `--osd-*` keys.
- `src/doc/validate.test.ts` (extended):
  - `design: {}` and `design: { palette: { accent: '#f00' } }` pass `validateDeck`.
  - A wrong-type field (e.g. `palette.bg: 123`, `space: "x"`) still fails.

## Also ships
- A `minor` changeset for `@open-slide/core` (new public token API).
- One-line additions to the `create-theme` / `slide-authoring` skills listing the new tokens so agents know they exist.

## Out of scope (deferred)
- Retrofitting built-in blocks to *use* the new scale (Heading still renders at `hero`).
- Registry prop-schema (WS3).
- New blocks / layouts (WS2).

WS1 only makes the tokens **available, validated, normalized, and editable**.
