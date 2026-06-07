# open-slide

**The presentation framework where you never hit a wall.** Decks are a structured `deck.json` document — editable by humans *and* agents. Use the built-in blocks and layouts for the common 80%; when you need something they can't do, register arbitrary React as a custom block and place it from the same JSON. A live WYSIWYG editor, present mode, and static export come built in.

```bash
npx @open-slide/cli init my-deck
cd my-deck
pnpm dev
```

## How it works

A deck is plain data, validated on load:

```
slides/<id>/deck.json = {
  schemaVersion: 1,
  meta:   { title, createdAt },
  design: DesignSystem,          // palette, fonts, type scale, spacing, radius, shadow
  slides: [ { id, layout, slots: { <slot>: Block[] }, notes? } ]
}

Block = { id, type, props }      // type resolves to a React component via the registry
```

The renderer turns that JSON into the runtime (viewer, present mode, transitions, export). Because a deck is just data:

- **Humans** edit it in a WYSIWYG editor (press **`E`** in the dev server) or by hand.
- **Agents** edit it surgically via structured ops — reliable, not "regenerate the whole slide."
- **It stays editable** after generation, by anyone.

## Blocks & layouts

**Built-in blocks:** `heading`, `text`, `bullets`, `image`, `quote`, `code`, `stat`, `callout`, `divider`.
**Built-in layouts:** `title`, `title-body`, `two-col`, `media-text`, `section`, `full-bleed`, `grid`, `blank`.

Need more? Register your own React component as a block — it's a first-class citizen, placed by `type` in `deck.json` exactly like a built-in:

```ts
// blocks/index.ts
import { registerBlock } from '@open-slide/core';
import { Timeline } from './timeline';

registerBlock('timeline', Timeline, [
  { key: 'events', type: 'string-list', label: 'Events' },
]);
```

The optional third argument is a **prop schema** — declare it and your custom block gets typed fields in the WYSIWYG editor instead of a raw-JSON editor.

## Working with an agent

The scaffolded workspace ships with agent skills (Claude Code and any agent that reads `AGENTS.md`):

- **`/create-slide`** — drafts a new deck end-to-end from a one-line prompt.
- **`/slide-authoring`** — the technical reference (deck.json contract, blocks, layouts, design tokens, custom blocks). The agent reads this before writing.
- **`/create-theme`** — authors a reusable theme bundle.

You can also drive edits over an HTTP endpoint (`POST /__deck/<id>` with edit ops) — the same surface the in-app editor uses.

## Other built-ins

- **Present mode** — fullscreen playback with keyboard nav, plus a presenter view (current/next, speaker notes, timer).
- **Static export** — one command to a self-contained HTML site or a print-ready PDF. No server.
- **Assets panel** — manage images/fonts per deck; search brand logos via [svgl](https://svgl.app/).

## Repo layout

pnpm + Turbo monorepo.

| Path | Description |
| --- | --- |
| [packages/core](packages/core) | `@open-slide/core` — runtime (viewer, present mode, WYSIWYG editor), Vite plugin, document model, and the `open-slide` dev/build/preview CLI. |
| [packages/cli](packages/cli) | `@open-slide/cli` — `npx @open-slide/cli init` scaffolder + project template. |
| [apps/demo](apps/demo) | Local workspace that consumes `@open-slide/core` via `workspace:*`. Dogfood target for developing the framework. |

## Development

```bash
pnpm install
pnpm dev          # runs the demo against the local @open-slide/core
pnpm build        # build all packages
pnpm typecheck    # tsc across the graph
pnpm check        # biome (format + lint)
pnpm test         # vitest
```

## License

MIT
