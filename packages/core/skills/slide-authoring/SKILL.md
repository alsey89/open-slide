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
  palette: { bg, surface, text, muted, accent, border },
  fonts: { display, body },
  typeScale: { hero, heading, body, caption },   // all px numbers
  space (px number),                              // base spacing unit
  radius (px number),
  shadow (CSS box-shadow string)
}
```

**Every `design` field is optional** — omitted tokens are filled from defaults at load. You can write `design: {}` or specify only the roles you care about (e.g. `design: { palette: { accent: "#f00" } }`).

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
| `full-bleed` | `media` (fills the slide), `content` (overlaid, bottom-anchored) |
| `grid` | `title`, `items` (auto-fit N-up grid of blocks) |
| `blank` | `content` (single centered freeform slot) |

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
| `stat` | `value` (string, e.g. `"98%"`), `label`? (string), `caption`? (string) |
| `callout` | `text` (string), `variant`? (`'accent'`, `'surface'`, or `'outline'`) |
| `divider` | *(none)* — a hairline rule using the `border` token |

An unknown `type` renders a visible fallback, not a crash. Only use the types listed above unless you have registered a custom block.

## Design tokens (DesignSystem)

```json
{
  "palette": {
    "bg": "#0f1115",
    "surface": "#1a1d24",
    "text": "#f5f5f4",
    "muted": "#9aa0ab",
    "accent": "#7c9cff",
    "border": "#2b2f38"
  },
  "fonts": {
    "display": "Georgia, serif",
    "body": "-apple-system, system-ui, sans-serif"
  },
  "typeScale": { "hero": 150, "heading": 56, "body": 40, "caption": 22 },
  "space": 8,
  "radius": 12,
  "shadow": "0 8px 24px rgba(0,0,0,0.12)"
}
```

Blocks read these as CSS vars: `--osd-bg`, `--osd-surface`, `--osd-text`, `--osd-muted`, `--osd-accent`, `--osd-border`, `--osd-font-display`, `--osd-font-body`, `--osd-size-hero`, `--osd-size-heading`, `--osd-size-body`, `--osd-size-caption`, `--osd-space`, `--osd-radius`, `--osd-shadow`. Custom blocks should style themselves with these vars so they inherit the deck's theme.

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

To get **typed editor fields** for a custom block (instead of the generic JSON editor), pass an optional prop schema as the third argument:

```ts
registerBlock('mytype', Component, [
  { key: 'title', type: 'text', label: 'Title' },
  { key: 'body', type: 'textarea', label: 'Body' },
  { key: 'count', type: 'number', label: 'Count' },
  { key: 'pinned', type: 'boolean', label: 'Pinned' },
  { key: 'size', type: 'select', label: 'Size', options: ['sm', 'lg'] },
  { key: 'tags', type: 'string-list', label: 'Tags' },
]);
```

Field types: `text`, `textarea`, `number`, `boolean`, `select` (needs `options`), `color`, `string-list`. Blocks without a schema fall back to a raw-JSON props editor.

### In-place editing (`data-osd-text`)

The editor also lets a user **double-click a block's text to edit it directly on the slide**. Make a custom block's text in-place-editable by tagging the element that renders it with `data-osd-text="<propKey>"`, where that element's text is **exactly** `String(block.props[propKey] ?? '')`. On commit the editor writes the new text back to `props[propKey]` as one undo step. **Always add this when authoring custom blocks** so they edit as fluidly as the built-ins.

- Tag the **innermost** element that holds only that one prop's text — no labels, punctuation, or sibling content mixed in (the edit captures the element's entire text). If the text is decorated (e.g. wrapped in quote marks or an icon), wrap just the text in a tagged `<span>` and keep the decoration outside it.
- One tag per text value; a block with several text props gets several tags (`data-osd-text="title"`, `data-osd-text="eyebrow"`, …).
- The value can be a **dot-path** into `props`, not just a top-level key — so array items and nested object fields edit in place too: `data-osd-text="points.0"` (array item), `data-osd-text="figure.value"` (nested field), `data-osd-text="steps.1.title"` (array of objects). Inside a `.map`, tag each item with its index: `points.map((pt, i) => <span data-osd-text={`points.${i}`}>{pt}</span>)`. The tagged element's text must still be exactly the string at that path.
- Tag **one element per path.** If a value renders twice (e.g. a chart and a legend), tag only one — otherwise the editor targets the wrong element. Don't tag SVG `<text>` (`contentEditable` is unreliable there); those edit through the schema / JSON fallback. Numbers and enums (counts, `variant` flags) also stay in the schema, not in place.

```tsx
function Hero({ block }: { block: Block }) {
  const p = block.props;
  return (
    <section>
      <span data-osd-text="eyebrow">{String(p.eyebrow ?? '')}</span>
      <h1 data-osd-text="title">{String(p.title ?? '')}</h1>
      <p data-osd-text="sub">{String(p.sub ?? '')}</p>
    </section>
  );
}
```

For arrays and nested fields, tag each rendered value with its path:

```tsx
function Stats({ block }: { block: Block }) {
  const p = block.props;
  const stats = (p.stats ?? []) as Array<{ value?: string; label?: string }>;
  return (
    <ul>
      {stats.map((s, i) => (
        <li key={i}>
          <span data-osd-text={`stats.${i}.value`}>{String(s.value ?? '')}</span>
          <span data-osd-text={`stats.${i}.label`}>{String(s.label ?? '')}</span>
        </li>
      ))}
    </ul>
  );
}
```

The prop schema (typed inspector fields for **all** props) and `data-osd-text` (in-place WYSIWYG for scalar text) are complementary — provide both.

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
