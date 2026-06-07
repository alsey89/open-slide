# @open-slide/core

Runtime and CLI for **open-slide** — a presentation framework where a deck is a structured `deck.json` document, edited by humans and agents alike. This package handles the Vite/React stack, the document model + renderer, the WYSIWYG editor, navigation, hot reload, present mode, and static export.

## Install

```bash
pnpm add @open-slide/core
```

Most users get this installed automatically by running `npx @open-slide/cli init`. Use this package directly only if you're wiring up an existing workspace by hand.

## What's inside

- **Document model** — `deck.json` is validated and rendered into the runtime. Built-in blocks and layouts, plus an open registry for custom React blocks.
- **Runtime** — home page, slide viewer, thumbnail rail, keyboard navigation, present + presenter mode, and a WYSIWYG editor (press **`E`** in the dev server). Every slide renders into a fixed **1920×1080** canvas; the framework scales it.
- **Vite plugin** — discovers `slides/<id>/deck.json`, exposes decks and the custom-block registry via virtual modules, and reloads on change. Serves the edit endpoint (`POST /__deck/<id>`).
- **CLI** — `open-slide dev | build | preview` so workspaces never touch Vite, React, or tsconfig directly.

## CLI

| Command | Description |
| --- | --- |
| `open-slide dev` | Start the dev server. Flags: `-p, --port <port>`, `--host [host]`, `--open`. |
| `open-slide build` | Build a static site. Flags: `--out-dir <dir>` (defaults to `dist`). |
| `open-slide preview` | Preview the production build. Flags: `-p, --port <port>`, `--host [host]`, `--open`. |

## Config

Create `open-slide.config.ts` in the workspace root (all fields optional):

```ts
import type { OpenSlideConfig } from '@open-slide/core';

const openSlideConfig: OpenSlideConfig = {
  slidesDir: 'slides',
  port: 5173,
};

export default openSlideConfig;
```

## Authoring decks

Decks live under `slides/<kebab-case-id>/deck.json`:

```json
{
  "schemaVersion": 1,
  "meta": { "title": "Hello", "createdAt": "2026-01-01T00:00:00.000Z" },
  "design": { "palette": { "accent": "#6d4cff" } },
  "slides": [
    {
      "id": "cover",
      "layout": "title",
      "slots": {
        "title": [{ "id": "h", "type": "heading", "props": { "text": "Hello, open-slide" } }],
        "subtitle": [{ "id": "s", "type": "text", "props": { "text": "A deck is just data." } }]
      }
    }
  ]
}
```

All `design` fields are optional — omitted tokens fill from defaults. See the `slide-authoring` skill (shipped under `skills/`) for the full contract: layouts, slots, block props, and design tokens.

## Custom blocks

Register any React component as a block, then place it by `type` in `deck.json`:

```ts
import { registerBlock } from '@open-slide/core';

registerBlock('timeline', Timeline, [
  { key: 'events', type: 'string-list', label: 'Events' },
]);
```

The optional third argument is a prop schema; declare it and the block gets typed fields in the WYSIWYG editor.

## Exports

```ts
import {
  // document model
  type Deck, type Slide, type Block, type DeckMeta,
  validateDeck, renderDeck, applyOp, applyOps, type EditOp,
  // registry
  registerBlock, registerLayout, getBlock, getLayout, getBlockSchema,
  listBlockTypes, listLayouts,
  type BlockComponent, type LayoutComponent, type BlockPropSchema, type PropField,
  // design tokens
  type DesignSystem, defaultDesign, normalizeDesign, designToCssVars,
  // canvas
  CANVAS_WIDTH, CANVAS_HEIGHT,
  type OpenSlideConfig,
} from '@open-slide/core';
```

The Vite plugin is exposed under a subpath for advanced setups:

```ts
import { createViteConfig } from '@open-slide/core/vite';
```

## License

MIT
