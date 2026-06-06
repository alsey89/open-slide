# Product Direction (high-level)

> Directional reference, not committed scope. Captures where this fork is headed and why. Dated 2026-06-06.

## North star

The presentation tool where you **never hit a wall**: anything the built-ins can't do, you *ask for* — and it becomes a reusable, editable part of your deck. A structured document model edited by humans and agents alike, where the agent can extend not just the *content* but the *capabilities* (new blocks/layouts) on demand.

## The core (already built)

- **`deck.json` document model** is the source of truth — slides → layouts → named slots → blocks. Plain data; validated on load.
- **Blocks/layouts are React, behind an open registry.** Built-ins ship with the framework; custom ones are arbitrary React registered by name. The renderer turns the JSON into the existing runtime (viewer/present/transitions/export).
- **Editing is layered:** a registry-aware WYSIWYG (built-ins + a generic props editor for custom blocks), a structured edit-ops library, and a `/__deck` endpoint.

Principle: **keep the core local-first, and keep blocks as plain React behind the registry.** Every future below *wraps* this core; none forks it.

## Tiers (one core, increasing reach)

1. **No agent — basic WYSIWYG + built-ins.** Anyone edits decks; we scale this by authoring more built-in blocks/layouts. (Today this still assumes the local project exists; true cold-start non-devs arrive at tier 3.)
2. **Bring your agent — extend anything.** A coding agent writes custom blocks/layouts into the project; the result is ~as flexible as hand-coded React, but structured so post-agent human tweaking works. We scale this with an **in-app agent** so users without their own agent get the same power.
3. **Packaged / hosted — cold-start for everyone.**
   - **3a. Desktop app (Tauri/Electron).** Kills setup friction (no terminal/clone), runs on the user's machine — so agent-written code is fine *without a multi-tenant sandbox*. Custom-block compilation solved in-app via `esbuild-wasm`. Likely the lower-risk first step.
   - **3b. Hosted SaaS.** Accounts, storage, in-app agent. The only tier that *requires* a sandbox (running others' blocks multi-tenant).

**Flywheel:** components the agent generates in tier 2 are the raw material for tier 1 — good ones get curated into built-ins or shared packs. Tiers feed each other.

## The keystone

The single highest-leverage artifact across every future is **one clean, authenticated automation API over the document model — ideally an MCP server** (`create_block`, `apply_ops`, `add_slide`, `render_preview`, …). It already half-exists (edit-ops + `/__deck`). It is simultaneously:

- the "endpoint for agents to build into our system,"
- what the in-app agent drives,
- what a *connect-your-own* external agent talks to,
- what the hosted tier exposes.

Build it well and the **agent-provisioning models are configs, not separate systems**:
- **we host the agent** (we pay inference; mass-market),
- **bring-your-own-key** (user pays; power users),
- **connect your own agent** (user's agent calls our API/MCP; devs, zero inference cost to us).

## Constraints that gate the bigger moves

- **Blocks are compiled code.** Solved for packaged/hosted via `esbuild-wasm` (compile in-app/in-webview), but it's real work — prototype early.
- **Sandbox is only mandatory at multi-tenant hosting (3b).** Local dev, desktop (3a), and BYO-project tiers run the user's own code — no isolation needed. Strong argument for **3a before 3b**.

## Rough sequencing (not commitments)

1. `create-block` agent workflow — makes tier-2 extensibility *reliable and repeatable* (it's just one method of the API below).
2. The **automation API / MCP server** over the doc model — the keystone.
3. Then, as demand dictates: **in-app copilot** (tier 2 → 3 bridge) and/or a **desktop shell** (3a), before committing to **hosted SaaS** (3b).

**One-liner:** bet on *"bring your agent"* now, design so you can later *"we host the agent for you,"* keep one local-first agent-native core, and let the users who show up decide whether 3b is worth it.
