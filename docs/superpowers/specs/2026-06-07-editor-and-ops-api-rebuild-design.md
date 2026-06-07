# open-slide — Editor + Ops API Rebuild (Design)

> Status: approved design, ready for planning. Dated 2026-06-07.
> Scope of this spec: **M0 + M1 in implementation depth; M2–M6 as a detailed roadmap** with enough context to be picked up cold. Each later milestone gets its own spec when started.

## 1. Problem

open-slide's thesis is strong: a structured `deck.json` document model, edited by **both** humans (WYSIWYG) and agents (surgical ops), with an escape hatch to arbitrary React blocks — "the presentation tool where you never hit a wall."

The engine delivers on this. The **document model, edit-ops library, registry, renderer, viewer/present mode, and export are real, tested, and coherent.** But two things hold it back from being *useful*:

1. **The human editing surface is rudimentary.** The current WYSIWYG is a panel bolted onto the Vite dev server (`E` in dev mode): plain text buttons, no visual block selection, no drag, no in-place editing, no layout previews. It was built as a dev-tool affordance, not a product's editing surface — and it can't be polished into one because of where it lives.
2. **There is no front door and no keystone.** Everything requires a terminal, a clone, `pnpm dev`, and the user's own coding agent (tier 2). The "anyone can edit" promise (tier 1) and the cold-start non-dev path (tier 3) don't exist. The product-direction "keystone" — one clean authenticated automation API / MCP over the document model — is not built (only an ad-hoc `POST /__deck`).

This is also a **fork of another author's project** that the team intends to develop as its own product, so reworking the front end is expected.

## 2. Goals / Non-goals

**Goals**
- Rebuild the human editing experience so it is **as intuitive as the agent path** — direct manipulation that still respects the structured slot/block model.
- Make the **human and the agent drive the exact same edit-ops** over one document — neither privileged. The agent's "good way to control the internals" *is* the same ops API the editor uses.
- Establish the **keystone**: one ops API surface, exposed in-process, over HTTP, and as MCP, designed so the three agent-provisioning models (connect-your-own / bring-your-own-key / we-host) are thin wrappers, not separate systems.
- Architect so the same editor serves **three hosts** (dev-server, Tauri desktop, hosted web) without rewrites.

**Non-goals (for M0+M1)**
- Freeform canvas editing (arbitrary x/y). This would break agent reliability — see §5.
- Real-time multi-user collaboration / CRDT. v1 sync is single-user last-writer-wins.
- Multi-tenant hosting / sandbox. Deferred to M6.
- Rewriting the core (model/ops/registry/renderer/present/export). It is the asset; we reuse it.

**Success criteria**
- A human can build a polished deck intuitively in the new editor without touching an agent.
- An agent editing via `/__deck` (today) or MCP (M2) produces edits that surface in the open editor as discrete, undoable ops with a visible highlight.
- The editor codebase is host-agnostic: adding the Tauri host (M3) requires a new `DeckHost` implementation, not editor changes.

## 3. Keep / Formalize / Rebuild boundary

| Band | Components | Decision |
| --- | --- | --- |
| **Keep (green)** | `deck.json` model + validation, edit-ops library (16 ops, ~30 tests), block/layout registry, renderer + fit-to-slot, viewer/present mode, export (HTML/PDF/PPTX) | Reuse. Well-tested, coherent. A from-scratch rewrite would throw this away. |
| **Formalize (amber)** | Ops API — today only `POST /__deck`, no MCP | Extract into the canonical keystone surface (in-process + HTTP + MCP). |
| **Rebuild (red)** | The dev-server WYSIWYG editor panel | Replace with a new, host-agnostic editor client package. |

**Confirmed:** rebuild the red, formalize the amber, reuse the green. Not a full rewrite.

## 4. Sequencing strategy

Chosen strategy: **hybrid thin-thread (C)** — co-design the ops API *with its first real consumer* (the editor), thread one thin slice through every layer early to kill the scary unknowns, then thicken each layer. This avoids the two failure modes: building the editor against a throwaway API (would force rework), and building the API blind without a demanding consumer (would design it wrong).

Horizon: **serious, multi-month.** Each milestone is shippable/dogfoodable.
Agent provisioning target: **all three, API-first** — design the ops surface so connect-your-own / BYO-key / we-host are configs over one API.

### Milestone overview

- **M0 — Core boundary + API design spike.** Carve `core/doc` (pure) from `core/runtime` (React); define the one ops surface; **spike esbuild-wasm custom-block compile**. No UI.
- **M1 — New editor client, direct-manipulation.** The heart. Standalone `@open-slide/editor` package, mounted in the dev-server host. Ships the "editing feels great" win.
- **M2 — MCP server / keystone hardened.** Promote the ops surface to the real product API + the three provisioning adapters.
- **M3 — Tauri desktop shell.** Wrap the editor; local files, runs user's own block code (no sandbox), esbuild-wasm compile. The cold-start front door.
- **M4 — In-app copilot.** Chat UI + ⌘K over the same ops API; human + agent share the live substrate.
- **M5 — `/create-block` reliability + curated block packs.** The flywheel.
- **M6 — Hosted web (3b).** Accounts, storage, sandbox. Demand-gated, last.

---

## 5. Architecture (M0) — the technical spine

### 5.1 Packaging — one editor, three hosts

- **`core/doc` (pure, zero React):** model, validation, ops, inverse-ops, registry *types*. The API/MCP imports this without pulling in React.
- **`core/runtime` (React):** renderer, fit-to-slot, viewer, present mode, export. (Drawn as a hard internal boundary within `@open-slide/core`; a later package split is possible but not required for M0.)
- **`@open-slide/editor` (NEW package):** the shell, canvas-editing, inspector, copilot dock, ⌘K. One codebase, embedded by every host. We do **not** rebuild the editor per host.
- **`DeckHost` interface:** the editor never touches files/HTTP directly. It depends on:

```ts
interface DeckHost {
  loadDeck(id: string): Promise<Deck>;
  applyOps(id: string, ops: EditOp[]): Promise<{ deck: Deck }>;   // persist + return canonical
  subscribe(id: string, onExternalChange: (deck: Deck, ops?: EditOp[]) => void): () => void;
  resolveAsset(ref: string): Promise<string>;     // -> URL
  compileBlock?(source: string): Promise<BlockModule>;  // esbuild-wasm hosts only
  listThemes?(): Promise<Theme[]>;
  saveTheme?(theme: Theme): Promise<{ id: string }>;
}
```

Three implementations across the roadmap: **dev-server** (Vite plugin + `/__deck` + file-watch→SSE), **Tauri** (local fs + esbuild-wasm), **hosted** (HTTP + storage + sandbox). M0+M1 build only the dev-server host.

### 5.2 State & mutation — one path for human and agent

The editor holds the deck in memory. Any action — human drag, in-place text edit, or agent op — produces `EditOp[]`, runs through core's `applyOp` (optimistic, instant, validated), then debounced-persists via `host.applyOps`. **There is exactly one mutation path.** This is the thesis made concrete.

### 5.3 Undo/redo — shared linear history

Every op carries an inverse (capture-before-state for complex ops). Human and agent edits land in the **same** history stack, so "Undo" on an agent edit is the same machinery as Cmd-Z on a human edit. v1 is single-user linear history; OT/CRDT deferred to M6.

### 5.4 Live human↔agent sync

`host.subscribe` surfaces external changes (an agent wrote via MCP/`/__deck` while the editor is open). Transport per host: file-watch→SSE (dev/Tauri), websocket (hosted). v1 conflict policy: **last-writer-wins with op-replay** — acceptable because ops are granular and persistence is debounced. The same-machine multi-window case can reuse the existing `BroadcastChannel` pattern.

### 5.5 The keystone API surface (designed M0, server built M2)

One operation vocabulary = existing `EditOp` set + a few convenience ops (`add_slide_from_layout`, `create_block`). Exposed three ways from **one implementation** in `core/doc`:

- **In-process** — the editor.
- **HTTP/JSON-RPC** — evolve `POST /__deck/:id` → versioned `POST /api/decks/:id/ops`, plus `get_deck`, `render_preview`, `list_blocks_layouts`.
- **MCP server (M2)** — stdio transport for local connect-your-own agents (Claude Code); HTTP/SSE for remote. Tools: `get_deck`, `apply_ops`, `add_slide`, `update_block`, `create_block`, `render_preview`, `list_blocks_layouts`.

The three provisioning models are thin auth+inference wrappers over this **identical** ops surface:
- **connect-your-own** — user's agent calls MCP/HTTP; zero inference cost to us.
- **bring-your-own-key** — in-app copilot calls Anthropic with the user's key, then calls the ops API.
- **we-host** — server proxies inference; same ops API underneath.

### 5.6 Custom-block compilation — the M0 spike

Today Vite compiles `blocks/index.tsx` via the virtual module (dev/build only). For Tauri/hosted there is no Vite at edit time, so **esbuild-wasm** compiles agent/user-authored block TSX in-app into an ES module registered at runtime. This is the riskiest unknown → **prove it in M0** so it can't ambush M3. Security: local/desktop runs the user's own code (no sandbox); multi-tenant hosting needs iframe/sandbox isolation, deferred to M6.

### 5.7 Editor tech

React, reusing `core/runtime`'s renderer/viewer/present and the design-token system. `dnd-kit` for slot-scoped drag, **in the editor package only** (keeps `core`'s install size lean). In-place text editing = `contenteditable` on the rendered block, committing `update-block-props` on blur/commit.

---

## 6. Editor UX (M1)

### 6.1 Shell — three-pane base + structure-tree toggle

Approved: **classic three-pane as the base** (familiar, lowest learning curve for non-devs) **with the structure tree available on a toggle** (mirrors `deck.json`: slide → slot → block; also where agent edits highlight).

```
┌────────────────────────────────────────────────────────────┐
│  Deck title          [Present] [Export] [Theme]   [⌘K] [◇]  │  top bar
├──────────┬──────────────────────────────────┬──────────────┤
│ slides   │                                   │  Inspector   │
│ rail     │           CANVAS                  │  (selected   │
│ □ 1 ◀    │      ┌───────────────────┐        │   block      │
│ □ 2      │      │   16:9 slide      │        │   props)     │
│ □ 3      │      └───────────────────┘        │              │
│ [+]      │                                   │  + Add block │
└──────────┴──────────────────────────────────┴──────────────┘
   ▲ toggle: slides rail  ⇄  structure tree (slide→slot→block)
```

### 6.2 Interaction grammar — hybrid direct manipulation

Approved: **hybrid** — direct where users spend 80% of their time (typing), structured everywhere else.

- **Single-click a block → select**: selection ring + contextual toolbar (drag grip, ↑, ↓, duplicate, delete).
- **Double-click text → edit in place** with real typography (heading/text/bullets/quote/code/stat/callout text).
- **Drag the grip → reorder**, but only **within valid slots** (the structural guardrail).
- **Empty slots are visible drop targets** ("+ Add block to <slot>"). You add **into slots, never arbitrary x/y** — this is what keeps the agent reliable.
- **Inspector** handles structured props (variant, image fit, colors) and add/move; typed fields for built-ins, schema-driven for custom blocks, JSON fallback.

Rejected: full freeform canvas (breaks the structured model the agent depends on) and inspector-only editing (not direct enough).

### 6.3 Copilot placement + edit surfacing

Approved: **right dock** (persistent copilot alongside the inspector) **+ ⌘K summon** (lightweight "change this slide" without opening the full panel). In M1 the dock space is reserved and the ⌘K shell exists; the chat UI + inference is **M4**.

**How edits surface (built in M1 because connect-your-own agents already write via `/__deck`):** affected blocks **flash** on the canvas and light up in the structure tree; each agent edit is a discrete op in shared history with **one-click Undo** — identical to a human edit. No "regenerated the whole slide" surprises.

### 6.4 M1 cut

**Ships in M1** (mounted in the dev-server host):
- Shell: three-pane + structure-tree toggle + top bar (title, present, export, theme).
- Canvas editing: select, in-place text edit, drag-reorder within slots, slot drop zones, add-block picker, duplicate/delete.
- Inspector: typed (built-ins), schema-driven (custom), JSON fallback.
- Slide management: add (layout picker), delete, reorder, duplicate, notes, set-layout with slot remap.
- Design panel + assets: reuse existing logic, re-skinned to the new shell.
- Data layer: dev-server `DeckHost` + optimistic apply + debounced save + save-state indicator + inverse-op undo/redo.
- Edit-surfacing groundwork: external-op `subscribe` + flash + shared-history undo.
- Copilot dock space reserved + ⌘K shell (no inference yet).

**Deferred:** MCP server (M2), Tauri + in-product esbuild-wasm (M3), copilot chat/provisioning (M4), `/create-block` reliability (M5), hosting/sandbox (M6).

### 6.5 Error handling

- **Invalid deck on load** → friendly error screen with the precise validation path message + "edit raw JSON" escape hatch.
- **Op apply failure** → toast, revert the optimistic change, editor stays stable.
- **Persist failure** → existing retry+backoff, surfaced in save-state, in-memory state never lost.
- **Custom block missing/throws** → existing `UnknownBlock` + per-block error boundary so one bad block can't crash the deck/editor.
- **External-op conflict** → last-writer-wins + a non-destructive "reloaded latest" notice.

### 6.6 Testing

- **Unit:** extend ops tests to cover inverse-ops; `DeckHost` contract tests against each implementation.
- **Interaction:** editor behaviors (select → in-place edit → commit → op; drag; add/delete) via testing-library.
- **Real-browser visual verification is required**, not optional — the prior editor was built without it and needs a human pass; a curl/200 only proves the SPA shell, so client-side crashes need a real browser.
- **Export regression:** confirm HTML/PDF/PPTX still work after the renderer is reused by the new editor.

---

## 7. Roadmap appendix (M2–M6) — context to pick up cold

### M2 — MCP server / keystone hardened
**Goal:** promote the M0-designed ops surface into the real product API.
**Scope:** versioned HTTP API (`/api/decks/:id/ops`, `get_deck`, `render_preview`, `list_blocks_layouts`); an MCP server over the same `core/doc` implementation (stdio for local agents like Claude Code; HTTP/SSE for remote); auth layer; the three provisioning adapters (connect-your-own, BYO-key, we-host) as thin wrappers. **Editor already speaks this surface → zero editor rework.**
**Why now:** unblocks connect-your-own agents cleanly and is the substrate M4 drives.
**Risks:** MCP tool schema design (keep it = the ops vocabulary + a few convenience ops); auth model for local vs remote.

### M3 — Tauri desktop shell
**Goal:** the cold-start front door for non-devs — no terminal, no clone.
**Scope:** Tauri (not Electron, per product-direction: smaller, Rust shell, native fs) wrapping the M1 editor bundle; a Tauri `DeckHost` (local filesystem read/write, asset management, file-watch); **esbuild-wasm** custom-block compile in the webview (productizing the M0 spike); app packaging/signing.
**Why Tauri before hosted:** local/desktop runs the user's *own* block code, so **no multi-tenant sandbox is needed** — lower risk than 3b.
**Risks:** esbuild-wasm bundle size + compile latency; native fs permissions; auto-update.

### M4 — In-app copilot
**Goal:** users without their own agent get the same power; human + agent share the live substrate.
**Scope:** the chat UI in the reserved right dock + ⌘K quick-ask; wire to the M2 API; implement all three provisioning models (connect-your-own already works via MCP; BYO-key calls Anthropic with the user's key then the ops API; we-host proxies inference). Live edit-surfacing (flash/undo) already built in M1.
**Risks:** inference cost model for we-host; streaming op application UX; prompt/skill quality for surgical edits.

### M5 — `/create-block` reliability + curated block packs
**Goal:** make "never hit a wall" reliable and repeatable — the differentiator.
**Scope:** a hardened `create_block` workflow (the convenience op + an agent skill) with a **validation loop**: generate block TSX → compile (esbuild-wasm) → render in a test deck → verify it builds and renders before committing. Curate good agent-generated blocks into shared packs / built-ins (the flywheel feeding tier 1).
**Risks:** validating arbitrary generated React safely; prop-schema inference for the inspector.

### M6 — Hosted web (3b)
**Goal:** accounts + storage + in-app agent for everyone; the only tier that *requires* a sandbox.
**Scope:** hosted `DeckHost` (storage backend, websocket sync); accounts/auth/billing; **multi-tenant sandbox** for running others' custom blocks (iframe/worker isolation); collaborative editing (revisit the v1 last-writer-wins → OT/CRDT).
**Why last:** highest commitment and the only tier needing the sandbox; demand-gated — let the users who show up decide if it's worth it.
**Risks:** sandbox security for arbitrary block code; concurrent-edit conflict resolution; cost.

---

## 8. Open questions / risks to watch

- **esbuild-wasm viability** (bundle size, compile latency in-webview) — the M0 spike must resolve this before committing to M3's approach.
- **`core/doc` ↔ `core/runtime` split** — moderate import refactor; ensure the API/MCP can import the pure doc layer without React.
- **In-place `contenteditable` on styled blocks** — committing clean text back to `update-block-props` without HTML cruft; needs care per block type.
- **Conflict UX** when an agent and human edit the same deck concurrently — v1 last-writer-wins; watch whether it's good enough in practice or needs to move up.

## 9. Flywheel (cross-cutting)

Components the agent generates in tier 2 (M4/M5) are the raw material for tier 1: good custom blocks get curated into built-ins or shared packs. Each tier feeds the next. The single highest-leverage artifact across all of them is the **one ops API surface** — build it well (M0/M2) and every provisioning model and host is a config, not a separate system.
