---
name: create-theme
description: Use this skill when the user wants to create, draft, author, or extract a slide theme in this open-slide repo. Triggers on phrases like "create a theme", "make a theme called X", "extract a theme from <slide>", "build a theme from these images". Produces one file under `themes/` — `<id>.json`, a named design-token preset that previews in the /themes gallery and applies to a deck from the design panel. Do NOT use for editing real slides — only for authoring the theme preset.
---

# Create a slide theme

A **theme** is a named design-token preset: a single JSON file under `themes/` that captures a reusable visual identity (palette, fonts, type scale, shape). It is *not* code and not a demo slide — it is the same `design` tokens a deck carries, packaged with a name so it can be browsed in the `/themes` gallery and applied to any deck from the deck editor's design panel.

## What you produce

One file: `themes/<id>.json`, where `<id>` is a kebab-case slug derived from the name.

```json
{
  "name": "Midnight",
  "description": "Dark slate with a cool blue accent and a serif display.",
  "design": {
    "palette": { "bg": "#0f1115", "surface": "#1a1d24", "text": "#f5f3ee", "muted": "#9aa0ab", "accent": "#7cc4ff", "border": "#2b2f38" },
    "fonts": { "display": "Georgia, \"Times New Roman\", serif", "body": "-apple-system, system-ui, sans-serif" },
    "typeScale": { "hero": 192, "heading": 64, "body": 32, "caption": 20 },
    "radius": 6,
    "shadow": "0 10px 30px rgba(0,0,0,0.45)"
  }
}
```

- `name` — display name (required). `description` — one short sentence (optional but recommended).
- `design` — a **partial** of the deck design system. Specify only the roles your theme cares about; every omitted role inherits the framework default (`normalizeDesign` fills the gaps). A minimal theme can be `"design": {}` (inherits everything).

## The design tokens

`design` may include any of:

| Group | Fields | Notes |
| --- | --- | --- |
| `palette` | `bg`, `surface`, `text`, `muted`, `accent`, `border` | CSS color strings. `bg` is the slide background; `surface` is card/panel fill; `text` is primary copy; `muted` is secondary copy; `accent` is the one highlight color; `border` is hairlines. |
| `fonts` | `display`, `body` | CSS font-family stacks. `display` = headings/hero; `body` = paragraph copy. |
| `typeScale` | `hero`, `heading`, `body`, `caption` | px numbers. Sensible ranges: hero 120–220, heading 48–80, body 28–36, caption 18–22. |
| `space` | number | base spacing unit in px (default 8). |
| `radius` | number | corner radius in px (0 = sharp, 24 = very round). |
| `shadow` | string | CSS box-shadow for elevated surfaces. |

## Process

1. **Gather intent.** Inputs may be: a written description ("warm, editorial, serif"), reference images, or an existing deck. Ask only what you need to pick a coherent palette + type pairing.
2. **From an existing deck:** read `slides/<id>/deck.json` and lift its `design` block as the starting point — then refine.
3. **From images:** sample the dominant background, primary text color, and the single strongest accent. Pick a font pairing that matches the mood.
4. **Choose an id + name.** Kebab-case the name for the filename (`Midnight Blue` → `midnight-blue.json`).
5. **Write `themes/<id>.json`** with `name`, `description`, and the partial `design`. Only include roles that differ from a default you'd be happy inheriting.
6. **Verify contrast.** `text` on `bg`, and `bg`/`text` on `accent` (the sample card renders text on the accent), should be legible.

## Guidance

- **Keep it a partial.** Don't restate defaults you don't care about — fewer keys is clearer and lets the framework evolve defaults under you.
- **One accent.** Themes read best with a single accent color; the sample preview uses `accent` for the eyebrow and a filled card.
- **No code.** There are no fixed components, no motion, no demo slide — just tokens. If a user asks for a custom header/footer block, that belongs in a deck's custom blocks, not a theme.

## After authoring

- The theme appears automatically in the `/themes` gallery (the dev server watches `themes/*.json`), previewed by rendering a sample slide through your tokens.
- A user applies it from a deck editor's **design panel → Themes**: clicking it copies the tokens into the deck's `design` and stamps `meta.theme` with your id as a provenance label.
- "Save as theme…" in that same panel is the human-side equivalent — it writes a new `themes/<id>.json` from the deck's current design.

## Do not

- Do not edit files under `slides/`, `packages/`, or `package.json`.
- Do not write `.md` or `.demo.tsx` theme files — the theme is the single JSON preset.
