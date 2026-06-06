---
name: slide-authoring
description: Technical reference for authoring or editing open-slide decks — deck.json file contract, built-in layouts/slots, built-in blocks/props, design tokens, id-uniqueness rules, assets, custom blocks, editing existing decks, and validation behavior. Consult this whenever you are about to write or modify any file under `slides/<id>/`, including from inside the `create-slide` workflow or for any ad-hoc deck edit. Triggers on phrases like "edit slide", "tweak this deck", "fix the layout", "change the palette", "investigate the slide framework", "how do slides work here".
---

# Authoring open-slide decks

This skill is the **technical reference** for everything inside `slides/<id>/deck.json`. It does not own a workflow:

- `create-slide` owns "draft a new deck" — it asks scoping questions, then delegates the *how* to this skill.
- `current-slide` resolves deictic references ("this slide", "the slide I'm on") — consult it first when the user references the current slide without naming it, then come back here to edit.
- Any ad-hoc deck edit should also consult this skill before touching the file.

Decks are **structured JSON files**, not TSX. The framework validates and renders them — you do not write React code for slides.

## File location

```
slides/<kebab-case-id>/deck.json
```

The slide id is the kebab-case folder name. It must be unique across the project. Slide-local assets go under `slides/<id>/assets/`. Global assets (reused across decks) live under the root `assets/` folder and are referenced by path.

## deck.json shape

```
Deck = {
  schemaVersion: 1,
  meta: { title?, createdAt (ISO 8601 string), theme? },
  design: DesignSystem,
  slides: Slide[]
}

Slide = { id, layout, slots: { <slotName>: Block[] }, notes?, transition? }

Block = { id, type, props }

DesignSystem = {
  palette: { bg, text, accent },
  fonts: { display, body },
  typeScale: { hero (px number), body (px number) },
  radius (px number)
}
```

### ID uniqueness

Every `slide.id` and every `block.id` must be **unique across the entire deck** — not just within their slide. Duplicate ids will fail validation. Use short, descriptive strings (`cover`, `cover-title`, `agenda-bullets`).

### meta.createdAt

Must be an ISO 8601 string literal. Always set it when creating a new deck — **immediately before writing the file, run `node -e "console.log(new Date().toISOString())"` and paste the exact output**. Do not invent a timestamp from memory.

## Built-in layouts and their slots

| Layout | Slots |
| --- | --- |
| `title` | `title`, `subtitle` |
| `section` | `eyebrow`, `title` |
| `title-body` | `title`, `body` |
| `two-col` | `title`, `left`, `right` |
| `media-text` | `title`, `media`, `body` |

Only use slot names listed for the chosen layout. Extra slot names are ignored at render time.

## Built-in block types and their props

| Type | Props |
| --- | --- |
| `heading` | `text` (string) |
| `text` | `text` (string) |
| `bullets` | `items` (string[]) |
| `image` | `src` (path/URL), `alt` (string), `fit`? (`'cover'` or `'contain'`) |
| `quote` | `text` (string), `attribution`? (string) |
| `code` | `code` (string), `lang`? (string) |

An unknown `type` renders a visible fallback, not a crash. Only use the types listed above unless you have registered a custom block.

## Design tokens (DesignSystem)

```json
{
  "palette": { "bg": "#0f1115", "text": "#f5f5f4", "accent": "#7c9cff" },
  "fonts": {
    "display": "Georgia, serif",
    "body": "-apple-system, system-ui, sans-serif"
  },
  "typeScale": { "hero": 150, "body": 40 },
  "radius": 12
}
```

The canvas is **1920×1080**. Layouts handle spacing and positioning — you do not set pixel positions. Content auto-fits its slot (scales down if necessary). Keep slides focused: one idea per slide.

## Assets

Slide-local assets live under `slides/<id>/assets/`. Reference them as relative paths in block `props`:

```json
{ "id": "hero-img", "type": "image", "props": { "src": "assets/hero.jpg", "alt": "Hero" } }
```

Global assets reused across decks live under the root `assets/` folder. Reference them by path in `props`.

## Custom blocks

To use a block type not in the built-in list:

1. Create `blocks/index.ts` in the project root (if it doesn't exist).
2. Call `registerBlock('mytype', Component)` — `registerBlock` is imported from `@open-slide/core`.
3. Use `"type": "mytype"` in `deck.json` exactly like a built-in block.

## Editing existing decks

Edit `slides/<id>/deck.json` directly — it hot-reloads in the dev server. For programmatic or batch edits you can also POST to the dev server:

```
POST /__deck/<id>
Body: { "ops": EditOp[] }
```

Op kinds: `set-deck-title`, `set-design`, `add-slide`, `remove-slide`, `move-slide`, `set-slide-layout`, `set-slide-notes`, `set-slot-blocks`, `add-block`, `remove-block`, `update-block-props`.

For a coding agent, **editing the JSON file directly is the normal path**. The API is available for tooling.

## Validation

The framework validates `deck.json` on load. If the file is malformed, the viewer shows an error with the reason. Common causes: duplicate ids, unknown required field, slots not matching the layout's expected names.

## Hard rules

- Do **not** touch `package.json`, `open-slide.config.ts`, or other slides.
- Do not add dependencies.
- Keep every `slide.id` and `block.id` unique across the whole deck.
- Use only built-in layout names and slot names (or custom registered ones).

## Worked example

```json
{
  "schemaVersion": 1,
  "meta": {
    "title": "Q2 Roadmap",
    "createdAt": "2026-06-05T10:00:00.000Z"
  },
  "design": {
    "palette": { "bg": "#0f172a", "text": "#f8fafc", "accent": "#fbbf24" },
    "fonts": {
      "display": "system-ui, -apple-system, sans-serif",
      "body": "system-ui, -apple-system, sans-serif"
    },
    "typeScale": { "hero": 160, "body": 38 },
    "radius": 8
  },
  "slides": [
    {
      "id": "cover",
      "layout": "title",
      "slots": {
        "title": [
          { "id": "cover-title", "type": "heading", "props": { "text": "Q2 Roadmap" } }
        ],
        "subtitle": [
          { "id": "cover-sub", "type": "text", "props": { "text": "Engineering · April – June 2026" } }
        ]
      },
      "notes": "Opening slide — keep it brief."
    },
    {
      "id": "themes",
      "layout": "title-body",
      "slots": {
        "title": [
          { "id": "themes-title", "type": "heading", "props": { "text": "Three themes this quarter" } }
        ],
        "body": [
          {
            "id": "themes-bullets",
            "type": "bullets",
            "props": { "items": ["Ship the doc model", "Tighten performance", "Improve onboarding"] }
          }
        ]
      }
    },
    {
      "id": "highlight",
      "layout": "section",
      "slots": {
        "eyebrow": [
          { "id": "highlight-eye", "type": "text", "props": { "text": "MILESTONE" } }
        ],
        "title": [
          { "id": "highlight-title", "type": "heading", "props": { "text": "Doc model ships in M2" } }
        ]
      }
    }
  ]
}
```

Note: every `id` is unique across the deck (`cover`, `themes`, `highlight` for slides; `cover-title`, `cover-sub`, `themes-title`, `themes-bullets`, `highlight-eye`, `highlight-title` for blocks). Slot names match their layout's table exactly.
