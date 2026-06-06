---
name: create-slide
description: Workflow for drafting a new deck in open-slide — clarify topic and aesthetics, plan slides, write slides/<id>/deck.json. Use when the user wants to create, draft, author, or generate new slides or a presentation. Triggers on phrases like "make slides about X", "create a presentation", "draft slides for", "new slide", or when the user asks to add content under `slides/`. Do NOT use for editing the framework itself — only for authoring content inside `slides/<id>/`.
---

# Create a slide in open-slide

This skill owns the **workflow** for drafting a new deck. The technical contract — schema, layouts, blocks, design tokens, assets, custom blocks — lives in the **`slide-authoring`** skill. Read that skill before writing JSON; this skill assumes you will consult it.

You only write files under `slides/<id>/`. Never modify `package.json`, `open-slide.config.ts`, or existing slides.

## Step 1 — Clarify requirements

Before writing any JSON, lock in:

- **Topic and audience** — what is the deck about, who will see it? If the user's request is thin ("make me a deck"), ask before proceeding.
- **Page count** — rough length: 3–5 (short), 6–10 (standard), 11–20 (deep dive).
- **Visual direction** — propose 2–3 concrete options based on the topic. Each option should name a vibe + palette cue (e.g. "dark editorial — near-black bg, amber accent, serif display" or "clean corporate — off-white bg, single blue accent, generous whitespace"). Mark the best fit as "(Recommended)".

Restate assumptions before writing so the user can correct course.

## Step 2 — Pick a slide id

Use **kebab-case**, short, descriptive. Examples: `rust-intro`, `q2-roadmap`, `team-offsite-2026`. Check `slides/` to avoid collisions.

## Step 3 — Plan the slide structure

Sketch the deck as a list of slide roles before writing JSON. Common roles:

| Role | Layout to use |
| --- | --- |
| Cover (title + subtitle) | `title` |
| Section divider (big label) | `section` |
| Heading + bullets or paragraph | `title-body` |
| Two-column comparison | `two-col` |
| Image with caption text | `media-text` |

**Rule of thumb**: one idea per slide. If you are tempted to put two, split them. The canvas is 1920×1080 and layouts handle spacing — content auto-fits, but focused slides read better.

## Step 4 — Get the current timestamp

**Immediately before writing the file**, run:

```bash
node -e "console.log(new Date().toISOString())"
```

Paste the exact output as `meta.createdAt`. Do not invent a timestamp from memory.

## Step 5 — Write `slides/<id>/deck.json`

Follow the schema in `slide-authoring` exactly:

- `schemaVersion: 1`
- `meta` with `title` and the `createdAt` value from Step 4
- `design` with palette, fonts, typeScale, and radius that match the chosen visual direction
- `slides` array: each entry picks a layout, fills its named slots with blocks

**ID uniqueness** — every `slide.id` and every `block.id` must be unique across the whole deck. Use short descriptive ids like `cover`, `cover-title`, `agenda-bullets`.

Use only the built-in layout names and slot names from the `slide-authoring` tables. For image blocks, put assets under `slides/<id>/assets/` and reference them as relative paths.

## Step 6 — Tell the user

- The slide id and file path you created (`slides/<id>/deck.json`).
- That the dev server hot-reloads — they can open `http://localhost:5173/s/<id>` immediately.
- If the dev server isn't running: `pnpm dev` from the repo root.

Do not start the dev server yourself unless asked.
