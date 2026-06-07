# @open-slide/cli

Scaffold a workspace for **open-slide** — a presentation framework where decks are a structured `deck.json` document, with agent skills preconfigured.

## Usage

```bash
npx @open-slide/cli init my-slide
cd my-slide
pnpm install
pnpm dev
```

This creates a workspace containing:

- `slides/getting-started/deck.json` — a starter deck you can edit or delete.
- `blocks/index.ts` — where you register custom React blocks (ships with a commented example).
- `package.json` — depends on `@open-slide/core`, which provides the runtime (home page, slide viewer, WYSIWYG editor, present mode) and the `open-slide` CLI.
- `open-slide.config.ts` — optional typed config (slidesDir, port).
- `.claude/skills/` and `.agents/skills/` — agent skills (`create-slide`, `slide-authoring`, `create-theme`, `current-slide`).
- `CLAUDE.md` — agent guide for authoring decks.

You won't see any Vite, React, or tsconfig files in the workspace. They live inside `@open-slide/core` and you never touch them.

## Commands

| Command | Description |
| --- | --- |
| `open-slide init [dir]` | Scaffold a new workspace in `dir` (defaults to current dir). |
| `open-slide init --force` | Scaffold into a non-empty directory. |
| `open-slide init --name <name>` | Override the generated `package.json` name. |

(Once installed in the workspace, `@open-slide/core` provides `open-slide dev`, `open-slide build`, and `open-slide preview` via its own bin.)

## Authoring

Inside the scaffolded workspace, decks live under `slides/<kebab-case-id>/deck.json` — structured data validated and rendered by the framework. Edit them in the WYSIWYG editor (press `E` in the dev server), by hand, or via an agent. Each slide renders into a fixed 1920×1080 canvas; the framework handles scaling.

Ask your agent to "make slides about X" and the `create-slide` skill will take it from there.
