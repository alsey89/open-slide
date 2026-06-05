# open-slide workspace

Slides as structured JSON. Each deck lives under `slides/<id>/deck.json`. The `@open-slide/core` runtime handles layout, scaling, navigation, thumbnails, and fullscreen play mode.

## Getting started

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:5173/s/getting-started`, or create a new deck at `slides/<your-slide>/deck.json`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server with hot reload. |
| `pnpm build` | Build a static bundle you can deploy. |
| `pnpm preview` | Preview the built bundle locally. |

## Authoring a deck

A deck is a `deck.json` file. Each slide picks a built-in `layout` and fills named `slots` with `blocks`.

```json
{
  "schemaVersion": 1,
  "meta": { "title": "My Deck", "createdAt": "2026-01-01T00:00:00Z" },
  "design": {
    "palette": { "bg": "#0f172a", "text": "#f8fafc", "accent": "#fbbf24" },
    "fonts": { "display": "system-ui, sans-serif", "body": "system-ui, sans-serif" },
    "typeScale": { "hero": 150, "body": 40 },
    "radius": 12
  },
  "slides": [
    {
      "id": "cover",
      "layout": "title",
      "slots": {
        "title": [{ "id": "t1", "type": "heading", "props": { "text": "Hello" } }],
        "subtitle": [{ "id": "t2", "type": "text", "props": { "text": "A subtitle" } }]
      }
    }
  ]
}
```

Built-in layouts: `title`, `section`, `title-body`, `two-col`, `media-text`.

Built-in block types: `heading`, `text`, `bullets`, `image`, `quote`, `code`.

Put slide-local assets under `slides/<id>/assets/`. Global assets (logos, avatars) go in the root `assets/` folder (`@assets/...`).

Custom React blocks: register in `blocks/index.ts` via `registerBlock` from `@open-slide/core`; reference by the registered type in `deck.json`.

See [`AGENTS.md`](./AGENTS.md) for the full authoring guide.

## Navigation

- Arrow keys / PageUp / PageDown move between slides.
- `F` enters fullscreen play mode; Esc exits.
- In play mode: Space / → next, ← prev.

## Claude Code integration

This workspace ships with Claude Code skills preconfigured under `.claude/skills/` and `.agents/skills/`. Ask Claude Code to "make slides about X" and the `create-slide` skill takes over.

## Config

Optional `open-slide.config.ts` at the workspace root:

```ts
import type { OpenSlideConfig } from '@open-slide/core';

const openSlideConfig: OpenSlideConfig = {
  port: 5173,
};

export default openSlideConfig;
```

Supported fields: `slidesDir`, `port`.
