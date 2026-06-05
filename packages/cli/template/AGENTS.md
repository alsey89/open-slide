# open-slide — Agent Guide

You are authoring **slide decks** in this repo. Every deck is a `deck.json` file validated by the framework.

## Hard rules

- A deck lives at `slides/<kebab-case-id>/deck.json`. That file is the single source of truth for the slide.
- Put slide-specific images/videos/fonts under `slides/<id>/assets/`. For assets reused across decks (logos, avatars), use the global `assets/` folder and import via `@assets/...`.
- Do **not** touch `package.json`, `open-slide.config.ts`, or other slides.
- Do not add dependencies.

## deck.json schema

```
Deck = {
  schemaVersion: 1,
  meta: { title, createdAt (ISO string), theme? },
  design: DesignSystem,
  slides: Slide[]
}

Slide = { id, layout, slots: { <slotName>: Block[] }, notes?, transition? }

Block = { id, type, props }
```

### DesignSystem shape

```json
{
  "palette": { "bg": "#...", "text": "#...", "accent": "#..." },
  "fonts": { "display": "<stack>", "body": "<stack>" },
  "typeScale": { "hero": 150, "body": 40 },
  "radius": 12
}
```

### Built-in layouts and their slots

| Layout | Slots |
| --- | --- |
| `title` | `title`, `subtitle` |
| `section` | `eyebrow`, `title` |
| `title-body` | `title`, `body` |
| `two-col` | `title`, `left`, `right` |
| `media-text` | `title`, `media`, `body` |

### Built-in block types

| Type | Props |
| --- | --- |
| `heading` | `text` |
| `text` | `text` |
| `bullets` | `items: string[]` |
| `image` | `src`, `alt`, `fit` |
| `quote` | `text`, `attribution` |
| `code` | `code`, `lang` |

## Custom blocks

Register custom React blocks in `blocks/index.ts` via `registerBlock(type, Component)` from `@open-slide/core`. Reference them by their registered `type` string in `deck.json` just like any built-in block.

## Which skill to use

- **Drafting a new deck** — use the `create-slide` skill.
- **Creating or extracting a theme** — use the `create-theme` skill. Themes live under `themes/<id>.md`.
- **Resolving "this slide" / "this element"** — consult the `current-slide` skill.
- **Any other deck edit** — read the `slide-authoring` skill for the technical reference.

Keep this file short: hard rules only. All deeper guidance lives in the skills above.

## Updating skills

The skills above are managed by `@open-slide/core`. Do not edit them in place. To pull the latest versions:

```
pnpm up @open-slide/core
pnpm sync:skills
```

`pnpm dev` will also detect drift on startup and offer to sync.
