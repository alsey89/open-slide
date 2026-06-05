---
name: create-slide
description: Use this skill when the user wants to create, draft, author, or generate new slides / a presentation in this open-slide repo using the deck.json format. Triggers on phrases like "make slides about X", "create a presentation", "draft slides for", "new slide", or when the user asks to add content under `slides/`. Do NOT use for editing the framework itself — only for authoring content inside `slides/<id>/`.
---

# Create a slide in open-slide

> A richer authoring + edit-operations guide is coming in a later release.

This skill owns the **workflow** for drafting a new deck. The technical reference — schema, built-in layouts/blocks, design tokens, assets, custom blocks — lives in the **`slide-authoring`** skill. Read that skill for details on the deck.json contract.

You only write files under `slides/<id>/`. Never modify `package.json`, `open-slide.config.ts`, or existing slides.

## Deck format

Decks are `deck.json` files, not TSX. See the `slide-authoring` skill for the full schema. Key points:

- File lives at `slides/<kebab-case-id>/deck.json`.
- `slides` array: each entry picks a built-in `layout` and fills named `slots` with `blocks`.
- Built-in layouts: `title`, `section`, `title-body`, `two-col`, `media-text`.
- Built-in block types: `heading`, `text`, `bullets`, `image`, `quote`, `code`.
- `design` object sets palette, fonts, typeScale, and radius.

## Workflow

1. Clarify the topic, audience, and rough page count if not already clear.
2. Pick a slide id (kebab-case, short, descriptive — e.g. `q2-roadmap`, `team-offsite-2026`). Check `slides/` to avoid collisions.
3. Draft the deck structure as a list of slide roles before writing JSON.
4. Write `slides/<id>/deck.json` following the schema in `slide-authoring`.
5. Tell the user the slide id and that the dev server will hot-reload: `http://localhost:5173/s/<id>`.
