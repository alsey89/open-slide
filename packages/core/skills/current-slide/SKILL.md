---
name: current-slide
description: Resolve which slide and page the user is currently viewing in the open-slide dev server. Consult this whenever the user references "this page", "this slide", "the slide I'm on", "the current page", or any deictic reference to slide content without naming it. Re-read `node_modules/.open-slide/current.json` at the start of every such turn — the user navigates between turns, so a value you read earlier in the conversation is almost certainly stale.
---

# Where is the user right now?

When the user says "fix this page", "tweak this slide", or "the slide I'm looking at", they almost never name the slide id or page number — they mean wherever they are in the dev viewer. Before asking "which slide?", check the file the dev server writes on every navigation.

## Re-read on every deictic turn — never reuse a prior read

`current.json` is a live cursor, not a fact about the conversation. The user moves between slides and pages freely between your turns — including while you were doing other work. **Read the file fresh at the start of every new turn that uses a deictic reference**, even if:

- you already read it earlier in this same conversation,
- you just finished editing the slide it pointed to,
- the user's new message sounds like a continuation ("now make it bigger", "also fix this one", "keep going").

A "continue editing" follow-up is exactly the case where the user has likely just navigated to a different slide. Trusting your last read here will silently edit the wrong file. Re-read, compare `slideId` / `pageIndex` against what you used last time, and act on the new values.

## How to read it

```
node_modules/.open-slide/current.json
```

Path is relative to the project root (the user's `cwd`, the directory that contains `slides/` and `package.json`). Use the `Read` tool. The file is JSON.

## What you get

```json
{
  "slideId": "q2-roadmap",
  "pageIndex": 2,
  "pageNumber": 3,
  "totalPages": 8,
  "slideTitle": "Q2 Roadmap",
  "view": "slides",
  "pagePath": "slides/q2-roadmap/deck.json",
  "updatedAt": "2026-05-09T14:32:11.123Z"
}
```

- `slideId` — folder name under `slides/`. Use as-is for any `/__slides/<id>/...` API or as the URL segment.
- `pageIndex` — 0-based slide index within the deck's `slides` array.
- `pageNumber` — 1-based, for use in messages to the user ("page 3 of 8") and for the URL `?p=N`.
- `pagePath` — the deck file to edit: `slides/<id>/deck.json`.
- `view` — `"slides"` (canvas view) or `"assets"` (asset manager). If `"assets"`, the user is browsing files for that slide rather than viewing a page.
- `updatedAt` — ISO timestamp of the last navigation. Use it to detect staleness.

## Element-level references ("this heading", "this block")

The deck viewer reports the current **slide and page**, not which block on it the user is pointing at. When the user references a specific element ("this heading", "make this bigger", "change the color of this"):

1. Use `current.json` to pin down the slide (`slideId` + `pageIndex`).
2. Open `slides/<slideId>/deck.json` and find that slide.
3. Identify the block from what the user described — its slot (`title`, `body`, `media`…), type (`heading`, `bullets`, `image`…), or text content.
4. If the slide has several plausible blocks and the reference is ambiguous, ask which one rather than guessing.

## When to use this

- The user references the current slide/page deictically: "this", "here", "the page I'm on", "the slide I'm looking at", "what I'm working on".
- Before asking "which slide?" as a clarifying question — check this file first.
- Before guessing from `git log`, recently-edited files, or the most recent slide folder.

## When NOT to use this

- The user names a slide explicitly ("edit `q2-roadmap`") — use that name directly.
- For listing or discovering slides — read `slides/` directly.

## Staleness — verify before acting

`updatedAt` is the last time the user navigated. Treat it like a cache:

- **Fresh (under ~5 minutes old)**: trust it. Open `slides/<slideId>/deck.json`, do the work.
- **Older than ~5 minutes, or older than your last interaction with the user**: confirm with the user before editing. The dev server may not be running; the user may have switched contexts.
- **Hours/days old**: ignore it. Ask the user which slide they mean.

A *newer* `updatedAt` than the one you saw last turn is the normal signal that the user has moved — switch to the new `slideId` / `pageIndex` without asking.

## When the file is missing

- The dev server hasn't been opened on a slide yet, or has never run.
- Don't create the file or guess. Ask the user which slide they mean, or suggest they open the slide in the dev server first.

## Example — page-level reference

User: "tighten the spacing on this page"

1. Read `node_modules/.open-slide/current.json`.
2. Check `updatedAt` is recent.
3. Open `slides/<slideId>/deck.json`.
4. Find the slide at `pageIndex` in the `slides` array.
5. Consult the `slide-authoring` skill for the schema, then edit that slide's blocks in place.

If `current.json` is missing or stale, ask: "Which slide and page should I tighten? The dev server hasn't published a current page recently."

## Example — element-level reference

User: "make this bigger"

1. Read `node_modules/.open-slide/current.json` and pin down the slide (`slideId` + `pageIndex`).
2. Open `slides/<slideId>/deck.json` and find that slide.
3. Identify the block the user means from their description (slot, type, or text). If it's ambiguous, ask which block.
4. Consult `slide-authoring` for schema and block rules, then edit the block's props in place.
