---
name: slide-authoring
description: Technical reference for authoring or editing open-slide decks in deck.json format — schema, built-in layouts/blocks, design tokens, custom blocks, and file location. Consult this whenever you are about to write or modify any file under `slides/<id>/`. Triggers on phrases like "edit slide", "tweak this deck", "fix the layout", "change the palette", "how do slides work here".
---

# Authoring open-slide decks

> A richer authoring + edit-operations guide is coming in a later release.

Decks are **structured JSON files** (`slides/<id>/deck.json`), not TSX. The framework validates and renders them — you don't write React code for slides.

## Schema

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

## DesignSystem

```json
{
  "palette": { "bg": "#...", "text": "#...", "accent": "#..." },
  "fonts": { "display": "<stack>", "body": "<stack>" },
  "typeScale": { "hero": 150, "body": 40 },
  "radius": 12
}
```

## Built-in layouts and slots

| Layout | Slots |
| --- | --- |
| `title` | `title`, `subtitle` |
| `section` | `eyebrow`, `title` |
| `title-body` | `title`, `body` |
| `two-col` | `title`, `left`, `right` |
| `media-text` | `title`, `media`, `body` |

## Built-in block types

| Type | Props |
| --- | --- |
| `heading` | `text` |
| `text` | `text` |
| `bullets` | `items: string[]` |
| `image` | `src`, `alt`, `fit` |
| `quote` | `text`, `attribution` |
| `code` | `code`, `lang` |

## Assets

Slide-local assets live under `slides/<id>/assets/`. Reference them as relative paths in block `props`. Global assets (reused across decks) live under the root `assets/` folder (`@assets/...`).

## Custom blocks

Register custom React blocks in `blocks/index.ts` using `registerBlock(type, Component)` from `@open-slide/core`. Reference them by their registered `type` string in `deck.json` exactly like built-in blocks.

## Workflow

This skill is the **technical reference** for deck.json authoring. It does not own a workflow:

- `create-slide` owns "draft a new deck" — it asks scoping questions, then delegates the *how* to this skill.
- `current-slide` resolves deictic references ("this deck", "the slide I'm on") — consult it first when the user references the current slide without naming it.
- Any ad-hoc deck edit should also consult this skill before touching the file.

## Hard rules

- A deck lives at `slides/<kebab-case-id>/deck.json`.
- Put slide-local assets under `slides/<id>/assets/`. Global assets go under root `assets/` (`@assets/...`).
- Do **not** touch `package.json`, `open-slide.config.ts`, or other slides.
- Do not add dependencies.
