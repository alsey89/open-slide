# M1a — Editor Foundation (Thin Thread) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the new direct-manipulation editor's spine — a host-agnostic `DeckHost` boundary, a framework-agnostic editor store with inverse-op undo/redo and debounced persistence, and a minimal shell that renders a real deck and threads one edit end-to-end (select → delete → save → undo) — mounted in the dev-server host behind a flag, with the legacy editor untouched.

**Architecture:** A new self-contained subtree at `packages/core/src/app/editor/` (NOT the legacy `app/components/editor/`). It depends only on an injected `DeckHost` (the spec's host-agnostic seam) plus core's already-tested doc layer and renderer. Pure logic (`deck-host`, `memory-host`, `history`, `editor-store`) is React-free and node-tested under vitest; the React/browser layer (`dev-host`, `use-editor`, `editor-canvas`, `editor-shell`, `editor-root`) is guarded by `tsc` and a real-browser pass. The editor lives under the Vite root (`src/app`) deliberately — the dev server's `server.fs.allow` and `@` alias are scoped to `src/app`, so a top-level `src/editor` would be unservable in dev. It is structured package-shaped (own barrel, host injection) so a later physical extraction to `@open-slide/editor` (M3) is mechanical.

**Tech Stack:** TypeScript, React 18 (`useSyncExternalStore`), Vitest (node env, co-located `*.test.ts`), Biome (`pnpm check`), Changesets. Reuses M0's `applyOpWithInverse`/`invertOp`, the existing `op-flusher` (debounce + backoff), `renderDeck`, and `SlideCanvas`.

**Branch:** Implement on a fresh branch off `main` (e.g. `feat/m1a-editor-foundation`). If using worktrees, create it via superpowers:using-git-worktrees first.

**Conventions:** Biome must pass before each commit (`pnpm check`). Every commit message ends with the trailer:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```
(Omitted from the commands below for brevity — add it to each.)

**Test-env constraint (read once):** vitest runs in `node` and has **no `@` path alias**. So every node-tested module (`deck-host.ts`, `memory-host.ts`, `history.ts`, `editor-store.ts`) MUST import only via relative paths and stay React-free. The `@/...` alias and `.tsx` imports are allowed **only** in the browser-only files (`dev-host.ts`, `use-editor.ts`, `editor-canvas.tsx`, `editor-shell.tsx`, `editor-root.tsx`), which are never imported by a node test — they are covered by `pnpm core typecheck` and the Task 10 browser pass. Task 6 adds a boundary guard that enforces this.

---

## File Structure

**Created (all under `packages/core/src/app/editor/`):**
- `deck-host.ts` — the `DeckHost` interface + `BlockModule`/`ThemeRef` types. Pure, React-free.
- `memory-host.ts` — in-memory `DeckHost` impl (the test fixture + first contract target). Pure.
- `memory-host.test.ts` — DeckHost contract tests.
- `history.ts` — pure undo/redo over `applyOpWithInverse`. Pure.
- `history.test.ts` — history round-trip tests.
- `editor-store.ts` — framework-agnostic store: optimistic apply, undo/redo, debounced persist, selection, external-change adoption. Pure.
- `editor-store.test.ts` — store behavior tests (fake timers).
- `pure.boundary.test.ts` — static guard: the four pure modules import no React/`@`/`.tsx`.
- `dev-host.ts` — dev-server `DeckHost` impl (fetch `/__deck`, load via virtual module). Browser-only.
- `use-editor.ts` — React hook bridging the store via `useSyncExternalStore`. Browser-only.
- `editor-canvas.tsx` — renders the current slide via `renderDeck` + `SlideCanvas`, click-to-select. Browser-only.
- `editor-shell.tsx` — minimal shell (title, save-state, undo/redo, slide rail, canvas, keybindings). Browser-only.
- `editor-root.tsx` — wires the dev host + shell for a slide id. Browser-only.
- `index.ts` — barrel (`EditorRoot`, `DeckHost`).
- `.changeset/m1a-editor-foundation.md` — changeset.

**Modified:**
- `packages/core/src/vite/routes/deck.ts` — `POST /__deck/:id` returns the applied canonical deck (`{ ok: true, deck }`).
- `packages/core/src/vite/routes/deck.test.ts` — add `applyOpsToDeck` test.
- `packages/core/src/app/routes/slide.tsx` — mount `<EditorRoot>` when `import.meta.env.DEV && ?editor=next`; legacy `E` editor untouched.

**Relative-path cheat-sheet (from `src/app/editor/`):** doc layer = `../../doc/...`; op-flusher = `../lib/editor/op-flusher.ts`; slides loader = `../lib/slides.ts`; `@/...` resolves to `src/app/...` (browser/tsc only).

---

## Task 1: Dev server returns the canonical deck

The spec's `DeckHost.applyOps` must "persist + return canonical." Today `POST /__deck/:id` returns `{ ok: true }` and discards the applied deck. Return it so the dev host satisfies the contract with no extra round-trip. The change is additive — the legacy editor ignores the response body.

**Files:**
- Modify: `packages/core/src/vite/routes/deck.ts:1-14,52-54`
- Modify: `packages/core/src/vite/routes/deck.test.ts`

- [ ] **Step 1: Add a failing test for `applyOpsToDeck`**

In `packages/core/src/vite/routes/deck.test.ts`, change the import line and append a test:
```ts
import { applyOpsToDeck, applyOpsToJson } from './deck.ts';
```
```ts
test('applyOpsToDeck returns the applied deck object', () => {
  const deck = applyOpsToDeck(RAW, [{ kind: 'set-deck-title', title: 'C' }]);
  expect(deck.meta.title).toBe('C');
  expect(deck.slides).toHaveLength(1);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run packages/core/src/vite/routes/deck.test.ts`
Expected: FAIL — `applyOpsToDeck` is not exported.

- [ ] **Step 3: Implement `applyOpsToDeck` and reuse it from `applyOpsToJson`**

In `packages/core/src/vite/routes/deck.ts`, add the `Deck` type import after line 5 (`import { validateDeck } ...`):
```ts
import type { Deck } from '../../doc/model.ts';
```
Replace the existing `applyOpsToJson` function (lines 12-14) with:
```ts
export function applyOpsToDeck(raw: string, ops: EditOp[]): Deck {
  return applyOps(validateDeck(JSON.parse(raw)), ops);
}

export function applyOpsToJson(raw: string, ops: EditOp[]): string {
  return `${JSON.stringify(applyOpsToDeck(raw, ops), null, 2)}\n`;
}
```

- [ ] **Step 4: Return the deck from the route**

In `packages/core/src/vite/routes/deck.ts`, replace the success block (lines 52-54):
```ts
        const updated = applyOpsToJson(raw, body.ops as EditOp[]);
        await fs.writeFile(deckPath, updated, 'utf8');
        return json(res, 200, { ok: true });
```
with:
```ts
        const deck = applyOpsToDeck(raw, body.ops as EditOp[]);
        await fs.writeFile(deckPath, `${JSON.stringify(deck, null, 2)}\n`, 'utf8');
        return json(res, 200, { ok: true, deck });
```

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm exec vitest run packages/core/src/vite/routes/deck.test.ts && pnpm core typecheck`
Expected: PASS — both the existing `applyOpsToJson` tests and the new `applyOpsToDeck` test.

- [ ] **Step 6: Biome + commit**

```bash
pnpm check
git add packages/core/src/vite/routes/deck.ts packages/core/src/vite/routes/deck.test.ts
git commit -m "feat(core): return the applied deck from POST /__deck/:id"
```

---

## Task 2: `DeckHost` interface

The host-agnostic seam. Pure types only — no test of its own (exercised by Task 3's memory host and guarded by Task 6's boundary test).

**Files:**
- Create: `packages/core/src/app/editor/deck-host.ts`

- [ ] **Step 1: Create the interface**

Create `packages/core/src/app/editor/deck-host.ts`:
```ts
import type { DesignSystem } from '../../doc/design.ts';
import type { Deck } from '../../doc/model.ts';
import type { EditOp } from '../../doc/ops.ts';

export type BlockModule = Record<string, unknown>;

export type ThemeRef = { id: string; name: string; design: DesignSystem };

export type DeckHost = {
  loadDeck(id: string): Promise<Deck>;
  /** Persist `ops` and return the canonical deck after they are applied. */
  applyOps(id: string, ops: EditOp[]): Promise<{ deck: Deck }>;
  /** Notify when a different writer (e.g. an agent) changes the deck. Returns an unsubscribe. */
  subscribe(id: string, onExternalChange: (deck: Deck, ops?: EditOp[]) => void): () => void;
  resolveAsset(ref: string): Promise<string>;
  compileBlock?(source: string): Promise<BlockModule>;
  listThemes?(): Promise<ThemeRef[]>;
  saveTheme?(theme: ThemeRef): Promise<{ id: string }>;
};
```

- [ ] **Step 2: Typecheck + biome + commit**

Run: `pnpm core typecheck && pnpm check`
Expected: PASS.
```bash
git add packages/core/src/app/editor/deck-host.ts
git commit -m "feat(core): add host-agnostic DeckHost interface for the new editor"
```

---

## Task 3: In-memory `DeckHost` (contract fixture)

A node-testable `DeckHost`. It is both the store's test double and the first concrete contract target the spec (§6.6) asks for. `applyOps` is the editor's own write and does **not** echo to subscribers; `emitExternalOps` simulates a different writer and does.

**Files:**
- Create: `packages/core/src/app/editor/memory-host.ts`
- Create: `packages/core/src/app/editor/memory-host.test.ts`

- [ ] **Step 1: Write the failing contract test**

Create `packages/core/src/app/editor/memory-host.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { defaultDesign } from '../../doc/design.ts';
import type { Deck } from '../../doc/model.ts';
import { createMemoryHost } from './memory-host.ts';

function makeDeck(): Deck {
  return {
    schemaVersion: 1,
    meta: { title: 'Original', createdAt: '2026-01-01T00:00:00.000Z' },
    design: defaultDesign,
    slides: [{ id: 's1', layout: 'blank', slots: { content: [] } }],
  };
}

describe('memory host implements the DeckHost contract', () => {
  it('loads the deck', async () => {
    const host = createMemoryHost('s1', makeDeck());
    expect((await host.loadDeck('s1')).meta.title).toBe('Original');
  });

  it('applyOps persists and returns the canonical deck', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const { deck } = await host.applyOps('s1', [{ kind: 'set-deck-title', title: 'X' }]);
    expect(deck.meta.title).toBe('X');
    expect((await host.loadDeck('s1')).meta.title).toBe('X');
  });

  it('applyOps does not echo to subscribers; emitExternalOps does', async () => {
    const host = createMemoryHost('s1', makeDeck());
    let received: Deck | null = null;
    const off = host.subscribe('s1', (d) => {
      received = d;
    });
    await host.applyOps('s1', [{ kind: 'set-deck-title', title: 'Self' }]);
    expect(received).toBeNull();
    host.emitExternalOps([{ kind: 'set-deck-title', title: 'Ext' }]);
    expect((received as Deck | null)?.meta.title).toBe('Ext');
    off();
  });

  it('rejects an unknown deck id', async () => {
    const host = createMemoryHost('s1', makeDeck());
    await expect(host.loadDeck('nope')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run packages/core/src/app/editor/memory-host.test.ts`
Expected: FAIL — `./memory-host.ts` does not exist.

- [ ] **Step 3: Implement the memory host**

Create `packages/core/src/app/editor/memory-host.ts`:
```ts
import type { Deck } from '../../doc/model.ts';
import { applyOps, type EditOp } from '../../doc/ops.ts';
import type { DeckHost } from './deck-host.ts';

export type MemoryHost = DeckHost & { emitExternalOps: (ops: EditOp[]) => void };

export function createMemoryHost(deckId: string, initial: Deck): MemoryHost {
  let deck = initial;
  const subscribers = new Set<(deck: Deck, ops?: EditOp[]) => void>();

  return {
    async loadDeck(id) {
      if (id !== deckId) throw new Error(`unknown deck: ${id}`);
      return deck;
    },
    async applyOps(id, ops) {
      if (id !== deckId) throw new Error(`unknown deck: ${id}`);
      deck = applyOps(deck, ops);
      return { deck };
    },
    subscribe(id, onExternalChange) {
      if (id !== deckId) return () => {};
      subscribers.add(onExternalChange);
      return () => subscribers.delete(onExternalChange);
    },
    async resolveAsset(ref) {
      return ref;
    },
    emitExternalOps(ops) {
      deck = applyOps(deck, ops);
      for (const fn of subscribers) fn(deck, ops);
    },
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm exec vitest run packages/core/src/app/editor/memory-host.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + biome + commit**

Run: `pnpm core typecheck && pnpm check`
```bash
git add packages/core/src/app/editor/memory-host.ts packages/core/src/app/editor/memory-host.test.ts
git commit -m "feat(core): in-memory DeckHost for editor contract tests"
```

---

## Task 4: Undo/redo history

Pure linear history over M0's `applyOpWithInverse`. Each entry stores the forward op and its inverse, so undo applies the inverse and redo re-applies the forward (recomputing a fresh inverse). This is the shared history both human and agent edits land in.

**Files:**
- Create: `packages/core/src/app/editor/history.ts`
- Create: `packages/core/src/app/editor/history.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/app/editor/history.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { defaultDesign } from '../../doc/design.ts';
import type { Deck } from '../../doc/model.ts';
import { canRedo, canUndo, initHistory, pushOp, redo, undo } from './history.ts';

function makeDeck(): Deck {
  return {
    schemaVersion: 1,
    meta: { title: 'A', createdAt: '2026-01-01T00:00:00.000Z' },
    design: defaultDesign,
    slides: [
      {
        id: 's1',
        layout: 'blank',
        slots: { content: [{ id: 'b1', type: 'text', props: { text: 'x' } }] },
      },
    ],
  };
}

describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const h = initHistory(makeDeck());
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });

  it('pushOp applies forward and enables undo', () => {
    const h = pushOp(initHistory(makeDeck()), { kind: 'set-deck-title', title: 'B' });
    expect(h.deck.meta.title).toBe('B');
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);
  });

  it('undo restores and redo re-applies', () => {
    const h1 = pushOp(initHistory(makeDeck()), { kind: 'set-deck-title', title: 'B' });
    const h2 = undo(h1);
    expect(h2.deck.meta.title).toBe('A');
    expect(canRedo(h2)).toBe(true);
    const h3 = redo(h2);
    expect(h3.deck.meta.title).toBe('B');
  });

  it('pushing after undo clears the redo stack', () => {
    const h1 = pushOp(initHistory(makeDeck()), { kind: 'set-deck-title', title: 'B' });
    const h2 = undo(h1);
    const h3 = pushOp(h2, { kind: 'set-deck-theme', theme: 'coral' });
    expect(canRedo(h3)).toBe(false);
    expect(h3.deck.meta.title).toBe('A');
    expect(h3.deck.meta.theme).toBe('coral');
  });

  it('round-trips a remove-block op', () => {
    const h1 = pushOp(initHistory(makeDeck()), { kind: 'remove-block', blockId: 'b1' });
    expect(h1.deck.slides[0].slots.content).toHaveLength(0);
    const h2 = undo(h1);
    expect(h2.deck.slides[0].slots.content).toHaveLength(1);
    expect(h2.deck.slides[0].slots.content[0].id).toBe('b1');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run packages/core/src/app/editor/history.test.ts`
Expected: FAIL — `./history.ts` does not exist.

- [ ] **Step 3: Implement the history**

Create `packages/core/src/app/editor/history.ts`:
```ts
import { applyOpWithInverse } from '../../doc/inverse.ts';
import type { Deck } from '../../doc/model.ts';
import { applyOp, type EditOp } from '../../doc/ops.ts';

export type HistoryEntry = { forward: EditOp; inverse: EditOp };

export type History = {
  deck: Deck;
  past: HistoryEntry[];
  future: HistoryEntry[];
};

export function initHistory(deck: Deck): History {
  return { deck, past: [], future: [] };
}

export function canUndo(h: History): boolean {
  return h.past.length > 0;
}

export function canRedo(h: History): boolean {
  return h.future.length > 0;
}

/** Apply a forward op, recording its inverse for undo. Clears the redo stack. */
export function pushOp(h: History, op: EditOp): History {
  const { deck, inverse } = applyOpWithInverse(h.deck, op);
  return { deck, past: [...h.past, { forward: op, inverse }], future: [] };
}

export function undo(h: History): History {
  const entry = h.past[h.past.length - 1];
  if (!entry) return h;
  return {
    deck: applyOp(h.deck, entry.inverse),
    past: h.past.slice(0, -1),
    future: [...h.future, entry],
  };
}

export function redo(h: History): History {
  const entry = h.future[h.future.length - 1];
  if (!entry) return h;
  // Recompute the inverse against the current deck so a later undo is exact.
  const { deck, inverse } = applyOpWithInverse(h.deck, entry.forward);
  return {
    deck,
    past: [...h.past, { forward: entry.forward, inverse }],
    future: h.future.slice(0, -1),
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm exec vitest run packages/core/src/app/editor/history.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + biome + commit**

Run: `pnpm core typecheck && pnpm check`
```bash
git add packages/core/src/app/editor/history.ts packages/core/src/app/editor/history.test.ts
git commit -m "feat(core): inverse-op undo/redo history for the editor"
```

---

## Task 5: Editor store

The heart: a framework-agnostic store both human and agent edits drive. It applies ops optimistically (instant), records undo history, debounce-persists via `host.applyOps` (reusing the existing `op-flusher` for backoff), tracks selection + save state, and adopts external changes (v1 last-writer-wins: replace deck, reset local history).

**Files:**
- Create: `packages/core/src/app/editor/editor-store.ts`
- Create: `packages/core/src/app/editor/editor-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/app/editor/editor-store.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultDesign } from '../../doc/design.ts';
import type { Deck } from '../../doc/model.ts';
import { createEditorStore } from './editor-store.ts';
import { createMemoryHost } from './memory-host.ts';

function makeDeck(): Deck {
  return {
    schemaVersion: 1,
    meta: { title: 'Original', createdAt: '2026-01-01T00:00:00.000Z' },
    design: defaultDesign,
    slides: [
      {
        id: 's1',
        layout: 'title-body',
        slots: { title: [{ id: 'b1', type: 'heading', props: { text: 'Hi' } }], body: [] },
      },
    ],
  };
}

describe('createEditorStore', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('applies an op optimistically and persists it', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: await host.loadDeck('s1') });
    store.apply({ kind: 'set-deck-title', title: 'Changed' });
    expect(store.getState().deck.meta.title).toBe('Changed');
    expect(store.getState().canUndo).toBe(true);
    await vi.runAllTimersAsync();
    expect((await host.loadDeck('s1')).meta.title).toBe('Changed');
    expect(store.getState().saveState).toBe('idle');
    store.dispose();
  });

  it('undo restores and redo re-applies, persisting each', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: await host.loadDeck('s1') });
    store.apply({ kind: 'remove-block', blockId: 'b1' });
    await vi.runAllTimersAsync();
    expect(store.getState().deck.slides[0].slots.title).toHaveLength(0);
    store.undo();
    expect(store.getState().deck.slides[0].slots.title).toHaveLength(1);
    expect(store.getState().canRedo).toBe(true);
    await vi.runAllTimersAsync();
    expect((await host.loadDeck('s1')).slides[0].slots.title).toHaveLength(1);
    store.redo();
    expect(store.getState().deck.slides[0].slots.title).toHaveLength(0);
    await vi.runAllTimersAsync();
    expect((await host.loadDeck('s1')).slides[0].slots.title).toHaveLength(0);
    store.dispose();
  });

  it('adopts external changes and resets local history', async () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: await host.loadDeck('s1') });
    store.apply({ kind: 'set-deck-title', title: 'Local' });
    expect(store.getState().canUndo).toBe(true);
    host.emitExternalOps([{ kind: 'set-deck-title', title: 'External' }]);
    expect(store.getState().deck.meta.title).toBe('External');
    expect(store.getState().canUndo).toBe(false);
    store.dispose();
  });

  it('notifies subscribers and tracks selection', () => {
    const host = createMemoryHost('s1', makeDeck());
    const store = createEditorStore({ host, deckId: 's1', deck: makeDeck() });
    let calls = 0;
    const off = store.subscribe(() => {
      calls += 1;
    });
    store.select('b1');
    expect(calls).toBe(1);
    expect(store.getState().selectedBlockId).toBe('b1');
    off();
    store.dispose();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run packages/core/src/app/editor/editor-store.test.ts`
Expected: FAIL — `./editor-store.ts` does not exist.

- [ ] **Step 3: Implement the store**

Create `packages/core/src/app/editor/editor-store.ts`:
```ts
import type { Deck } from '../../doc/model.ts';
import type { EditOp } from '../../doc/ops.ts';
import { createOpFlusher, type FlushState } from '../lib/editor/op-flusher.ts';
import type { DeckHost } from './deck-host.ts';
import { canRedo, canUndo, type History, initHistory, pushOp, redo, undo } from './history.ts';

export type EditorState = {
  deck: Deck;
  selectedBlockId: string | null;
  saveState: FlushState;
  error: string | null;
  canUndo: boolean;
  canRedo: boolean;
};

export type EditorStore = {
  getState: () => EditorState;
  subscribe: (listener: () => void) => () => void;
  apply: (ops: EditOp | EditOp[]) => void;
  select: (blockId: string | null) => void;
  undo: () => void;
  redo: () => void;
  flushNow: () => void;
  dispose: () => void;
};

export type CreateEditorStoreOptions = {
  host: DeckHost;
  deckId: string;
  deck: Deck;
  flusherDelayMs?: number;
};

export function createEditorStore(opts: CreateEditorStoreOptions): EditorStore {
  let history = initHistory(opts.deck);
  let selectedBlockId: string | null = null;
  let saveState: FlushState = 'idle';
  let error: string | null = null;
  const listeners = new Set<() => void>();

  const snapshot = (): EditorState => ({
    deck: history.deck,
    selectedBlockId,
    saveState,
    error,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
  });

  let current = snapshot();

  const emit = () => {
    current = snapshot();
    for (const l of listeners) l();
  };

  const flusher = createOpFlusher({
    flush: (ops) => opts.host.applyOps(opts.deckId, ops).then(() => undefined),
    onState: (s, e) => {
      saveState = s;
      error = s === 'error' ? (e ?? 'save failed') : null;
      emit();
    },
    delayMs: opts.flusherDelayMs,
  });

  const unsubscribeHost = opts.host.subscribe(opts.deckId, (deck) => {
    // v1 last-writer-wins: an external writer (e.g. an agent via the ops API)
    // changed the deck, so adopt it and reset local history. Surfacing the diff
    // (flash + cross-edit undo) is M1d.
    history = initHistory(deck);
    selectedBlockId = null;
    emit();
  });

  return {
    getState: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    apply(ops) {
      const list = Array.isArray(ops) ? ops : [ops];
      if (list.length === 0) return;
      try {
        for (const op of list) history = pushOp(history, op);
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        emit();
        return;
      }
      flusher.enqueue(list);
      emit();
    },
    select(blockId) {
      if (blockId === selectedBlockId) return;
      selectedBlockId = blockId;
      emit();
    },
    undo() {
      const entry = history.past[history.past.length - 1];
      if (!entry) return;
      history = undo(history);
      flusher.enqueue([entry.inverse]);
      emit();
    },
    redo() {
      const entry = history.future[history.future.length - 1];
      if (!entry) return;
      history = redo(history);
      flusher.enqueue([entry.forward]);
      emit();
    },
    flushNow: () => flusher.flushNow(),
    dispose() {
      unsubscribeHost();
      flusher.dispose();
      listeners.clear();
    },
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm exec vitest run packages/core/src/app/editor/editor-store.test.ts`
Expected: PASS (all four cases).

- [ ] **Step 5: Typecheck + biome + commit**

Run: `pnpm core typecheck && pnpm check`
```bash
git add packages/core/src/app/editor/editor-store.ts packages/core/src/app/editor/editor-store.test.ts
git commit -m "feat(core): editor store (optimistic apply, undo/redo, debounced persist)"
```

---

## Task 6: Pure-boundary guard

Mirror M0's `doc/pure.boundary.test.ts`: statically assert the four node-tested editor modules import no React, no `@` alias, and no `.tsx`. All four files now exist, so this commits green.

**Files:**
- Create: `packages/core/src/app/editor/pure.boundary.test.ts`

- [ ] **Step 1: Write the guard**

Create `packages/core/src/app/editor/pure.boundary.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const editorDir = dirname(fileURLToPath(import.meta.url));

// These modules are node-tested under vitest (no `@` alias, node env), so they
// MUST stay React-free and alias-free. The browser-only files (dev-host,
// use-editor, *.tsx) are exempt — they are covered by tsc + the browser pass.
const PURE_MODULES = ['deck-host.ts', 'memory-host.ts', 'history.ts', 'editor-store.ts'];

function runtimeImports(src: string): string[] {
  const re = /^\s*import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/gm;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

describe('editor pure boundary', () => {
  for (const file of PURE_MODULES) {
    it(`${file} has no runtime react/alias/tsx imports`, () => {
      const src = readFileSync(join(editorDir, file), 'utf8');
      for (const spec of runtimeImports(src)) {
        expect(spec, `${file} runtime-imports ${spec}`).not.toBe('react');
        expect(spec, `${file} runtime-imports ${spec}`).not.toBe('react-dom');
        expect(spec.startsWith('@/'), `${file} runtime-imports alias ${spec}`).toBe(false);
        expect(spec.endsWith('.tsx'), `${file} runtime-imports tsx ${spec}`).toBe(false);
      }
    });
  }
});
```

- [ ] **Step 2: Run it to verify it passes**

Run: `pnpm exec vitest run packages/core/src/app/editor/pure.boundary.test.ts`
Expected: PASS — all four modules clean.

- [ ] **Step 3: Biome + commit**

```bash
pnpm check
git add packages/core/src/app/editor/pure.boundary.test.ts
git commit -m "test(core): guard the editor's node-safe modules"
```

---

## Task 7: Dev-server `DeckHost`

The browser host. `applyOps` POSTs to `/__deck/:id` and returns the canonical deck (Task 1). `subscribe` is a documented no-op for M1a — the dev server emits one HMR event per deck.json write, including the editor's own saves, so wiring it without self-echo suppression would reset local history on every save. That suppression + flash is M1d. Browser-only; verified by tsc + Task 10.

**Files:**
- Create: `packages/core/src/app/editor/dev-host.ts`

- [ ] **Step 1: Create the dev host**

Create `packages/core/src/app/editor/dev-host.ts`:
```ts
import type { Deck } from '../../doc/model.ts';
import type { EditOp } from '../../doc/ops.ts';
import { loadDeckRaw } from '../lib/slides.ts';
import type { DeckHost } from './deck-host.ts';

async function persistOps(id: string, ops: EditOp[]): Promise<Deck> {
  const res = await fetch(`/__deck/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ops }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(detail.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { deck: Deck };
  return data.deck;
}

export function createDevHost(): DeckHost {
  return {
    loadDeck: (id) => loadDeckRaw(id),
    async applyOps(id, ops) {
      return { deck: await persistOps(id, ops) };
    },
    // The dev server fires one HMR event for every deck.json write — including
    // the editor's own saves — so live external-change wiring needs self-echo
    // suppression. Deferred to M1d (with flash); a no-op keeps M1a loop-free.
    subscribe() {
      return () => {};
    },
    async resolveAsset(ref) {
      return ref;
    },
  };
}
```

- [ ] **Step 2: Typecheck + biome + commit**

Run: `pnpm core typecheck && pnpm check`
Expected: PASS.
```bash
git add packages/core/src/app/editor/dev-host.ts
git commit -m "feat(core): dev-server DeckHost implementation"
```

---

## Task 8: React layer (hook + canvas + shell + root + barrel)

The browser UI. No unit tests (vitest is node-only; interaction tests via testing-library are M1b). Guarded by `pnpm core typecheck` here and the real-browser pass in Task 10.

**Files:**
- Create: `packages/core/src/app/editor/use-editor.ts`
- Create: `packages/core/src/app/editor/editor-canvas.tsx`
- Create: `packages/core/src/app/editor/editor-shell.tsx`
- Create: `packages/core/src/app/editor/editor-root.tsx`
- Create: `packages/core/src/app/editor/index.ts`

- [ ] **Step 1: Create the hook**

Create `packages/core/src/app/editor/use-editor.ts`:
```ts
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { DeckHost } from './deck-host.ts';
import { createEditorStore, type EditorState, type EditorStore } from './editor-store.ts';

const NOOP_SUBSCRIBE = (_listener: () => void) => () => {};
const NULL_SNAPSHOT = (): EditorState | null => null;

export function useEditor(
  host: DeckHost,
  deckId: string,
): { store: EditorStore | null; state: EditorState | null; loadError: string | null } {
  const [store, setStore] = useState<EditorStore | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: EditorStore | null = null;
    setStore(null);
    setLoadError(null);
    host
      .loadDeck(deckId)
      .then((deck) => {
        if (cancelled) return;
        created = createEditorStore({ host, deckId, deck });
        setStore(created);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, [host, deckId]);

  const state = useSyncExternalStore<EditorState | null>(
    store ? store.subscribe : NOOP_SUBSCRIBE,
    store ? store.getState : NULL_SNAPSHOT,
  );

  return { store, state, loadError };
}
```

- [ ] **Step 2: Create the canvas**

Create `packages/core/src/app/editor/editor-canvas.tsx`:
```tsx
import { type MouseEvent, useEffect, useMemo, useRef } from 'react';
import { SlideCanvas } from '@/components/slide-canvas';
import { renderDeck } from '../../doc/render.tsx';
import type { EditorState, EditorStore } from './editor-store.ts';

export function EditorCanvas({
  store,
  state,
  index,
}: {
  store: EditorStore;
  state: EditorState;
  index: number;
}) {
  const mod = useMemo(() => renderDeck(state.deck), [state.deck]);
  const Page = mod.default[index];
  const rootRef = useRef<HTMLDivElement>(null);

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest('[data-osd-block-id]');
    store.select(el?.getAttribute('data-osd-block-id') ?? null);
  };

  // Block wrappers are `display:contents`, so the visible box is their child —
  // outline the firstElementChild to show a basic selection ring (M1b replaces
  // this with a real selection ring + toolbar).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    for (const el of root.querySelectorAll('[data-osd-block-id]')) {
      const selected = el.getAttribute('data-osd-block-id') === state.selectedBlockId;
      const target = (el.firstElementChild as HTMLElement | null) ?? (el as HTMLElement);
      target.style.outline = selected ? '2px solid var(--osd-accent, #4f7cff)' : '';
      target.style.outlineOffset = selected ? '2px' : '';
    }
  }, [state.selectedBlockId, state.deck, index]);

  return (
    <SlideCanvas design={mod.design}>
      <div ref={rootRef} onClick={onClick} style={{ width: '100%', height: '100%' }}>
        {Page ? <Page /> : null}
      </div>
    </SlideCanvas>
  );
}
```

- [ ] **Step 3: Create the shell**

Create `packages/core/src/app/editor/editor-shell.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { DeckHost } from './deck-host.ts';
import { EditorCanvas } from './editor-canvas.tsx';
import { useEditor } from './use-editor.ts';

export function EditorShell({ host, deckId }: { host: DeckHost; deckId: string }) {
  const { store, state, loadError } = useEditor(host, deckId);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!store) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || !!target?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (!typing && (e.key === 'Delete' || e.key === 'Backspace')) {
        const id = store.getState().selectedBlockId;
        if (id) {
          e.preventDefault();
          store.apply({ kind: 'remove-block', blockId: id });
          store.select(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-8 py-16">
        <p className="text-sm font-medium text-destructive">Could not load deck</p>
        <pre className="mt-3 overflow-auto rounded-md border border-border bg-card p-4 text-xs whitespace-pre-wrap">
          {loadError}
        </pre>
      </div>
    );
  }

  if (!store || !state) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const slideCount = state.deck.slides.length;
  const safeIndex = Math.min(index, Math.max(0, slideCount - 1));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-2">
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
          value={state.deck.meta.title ?? ''}
          placeholder="Untitled deck"
          onChange={(e) => store.apply({ kind: 'set-deck-title', title: e.target.value })}
        />
        <span className="text-xs text-muted-foreground" data-osd-save-state={state.saveState}>
          {state.saveState === 'saving' ? 'Saving…' : state.saveState === 'error' ? 'Save failed' : 'Saved'}
        </span>
        <Button size="sm" variant="ghost" disabled={!state.canUndo} onClick={() => store.undo()}>
          Undo
        </Button>
        <Button size="sm" variant="ghost" disabled={!state.canRedo} onClick={() => store.redo()}>
          Redo
        </Button>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="w-40 shrink-0 overflow-y-auto border-r border-border p-2">
          {state.deck.slides.map((slide, i) => (
            <button
              type="button"
              key={slide.id}
              onClick={() => setIndex(i)}
              className={`mb-1 block w-full rounded-md px-2 py-1 text-left text-xs ${
                i === safeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
              }`}
            >
              {i + 1}. {slide.layout}
            </button>
          ))}
        </nav>
        <main className="paper relative min-h-0 min-w-0 flex-1 bg-canvas p-6">
          <EditorCanvas store={store} state={state} index={safeIndex} />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the root**

Create `packages/core/src/app/editor/editor-root.tsx`:
```tsx
import { useMemo } from 'react';
import { createDevHost } from './dev-host.ts';
import { EditorShell } from './editor-shell.tsx';

export function EditorRoot({ slideId }: { slideId: string }) {
  const host = useMemo(() => createDevHost(), []);
  return <EditorShell host={host} deckId={slideId} />;
}
```

- [ ] **Step 5: Create the barrel**

Create `packages/core/src/app/editor/index.ts`:
```ts
export type { DeckHost } from './deck-host.ts';
export { EditorRoot } from './editor-root.tsx';
```

- [ ] **Step 6: Typecheck + biome + commit**

Run: `pnpm core typecheck && pnpm check`
Expected: PASS — `@/` aliases and `.tsx` imports resolve under tsc's `paths`/`jsx` config.
```bash
git add packages/core/src/app/editor/use-editor.ts packages/core/src/app/editor/editor-canvas.tsx packages/core/src/app/editor/editor-shell.tsx packages/core/src/app/editor/editor-root.tsx packages/core/src/app/editor/index.ts
git commit -m "feat(core): minimal editor shell, canvas, and React store bridge"
```

---

## Task 9: Mount the new editor behind `?editor=next`

Add a dev-only branch so the new editor renders when the URL has `?editor=next`, leaving the legacy `E` editor and viewer paths untouched (keeps every existing path green).

**Files:**
- Modify: `packages/core/src/app/routes/slide.tsx`

- [ ] **Step 1: Import `EditorRoot`**

In `packages/core/src/app/routes/slide.tsx`, add after the existing `DeckEditor` import (line 38):
```ts
import { EditorRoot } from '../editor';
```

- [ ] **Step 2: Derive the flag**

In `packages/core/src/app/routes/slide.tsx`, add immediately after the line `const [searchParams, setSearchParams] = useSearchParams();` (line 56):
```ts
  const nextEditor = import.meta.env.DEV && searchParams.get('editor') === 'next';
```

- [ ] **Step 3: Add the render branch**

In `packages/core/src/app/routes/slide.tsx`, find the body-render ternary that begins with this exact line (the asset view, ~line 531):
```tsx
      {view === 'assets' ? (
```
Insert a new leading branch so it becomes:
```tsx
      {nextEditor ? (
        <EditorRoot slideId={slideId} />
      ) : view === 'assets' ? (
```
(Leave the rest of the ternary — the assets branch, the legacy `editing` branch, and the viewer branch — exactly as-is.)

- [ ] **Step 4: Typecheck + biome**

Run: `pnpm core typecheck && pnpm check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/app/routes/slide.tsx
git commit -m "feat(core): mount the new editor in the dev host behind ?editor=next"
```

---

## Task 10: Green gate, real-browser verification, changeset

**Files:**
- Create: `.changeset/m1a-editor-foundation.md`

- [ ] **Step 1: Full green gate across the graph**

Run: `pnpm exec vitest run && pnpm core typecheck && pnpm core build && pnpm check`
Expected: all PASS — tests green (incl. the new editor history/store/host/boundary suites), typecheck clean, build emits `dist`, biome clean.

- [ ] **Step 2: Rebuild core dist, then start the demo**

The demo build/dev consumes core's `dist`; rebuild it before dogfooding (src-based gates can be green while `dist` is stale — see the `demo-build-requires-core-dist-rebuild` note).
```bash
pnpm core build
pnpm dev
```

- [ ] **Step 3: Real-browser verification (required, not optional)**

A `curl`/200 only proves the SPA shell; client-side React crashes need a real browser. Open in a browser:
```
http://localhost:5173/s/blocks-showcase?editor=next
```
Confirm, with the devtools console open (zero errors — especially no "invalid hook call"/dual-React):
  1. The deck renders in the canvas; the slide rail lists every slide; clicking a rail item changes the slide.
  2. Clicking a block shows the selection ring; clicking empty canvas clears it.
  3. With a block selected, pressing **Delete** removes it and the indicator flips **Saving… → Saved**.
  4. **Cmd/Ctrl-Z** restores the deleted block (Undo enabled); **Cmd/Ctrl-Shift-Z** re-deletes it (Redo).
  5. Editing the title field persists — confirm `apps/demo/slides/blocks-showcase/deck.json` on disk reflects the new title and the removed/restored block.
  6. The legacy editor still works: at `http://localhost:5173/s/blocks-showcase` press **E** and confirm the old editor opens unchanged.

If any check fails, treat it as a bug to fix before proceeding (systematic-debugging), not a plan step to skip.

- [ ] **Step 4: Write the changeset**

Create `.changeset/m1a-editor-foundation.md` (match the terse one-line style of existing changesets):
```md
---
'@open-slide/core': minor
---

Add the new direct-manipulation editor foundation (dev preview, behind `?editor=next`): a host-agnostic DeckHost boundary, an editor store with inverse-op undo/redo and debounced save, and a minimal shell. `POST /__deck/:id` now returns the applied deck.
```

- [ ] **Step 5: Commit**

```bash
git add .changeset/m1a-editor-foundation.md
git commit -m "chore: changeset for M1a editor foundation"
```

---

## Self-Review (completed during authoring)

- **Spec coverage (M1a slice of §6.4 "Data layer" + "Edit-surfacing groundwork"):** dev-server `DeckHost` → Tasks 2/7; optimistic apply + debounced save + save-state → Task 5 (reuses `op-flusher`); inverse-op undo/redo → Tasks 4/5; external-op `subscribe` groundwork → interface (Task 2) + store wiring + memory-host contract (Tasks 3/5); minimal shell + canvas select/delete (thin thread) → Task 8; mounted in dev host → Task 9; real-browser verification (§6.6) → Task 10. **Deferred to later M1 sub-plans (correctly out of this slice):** in-place text edit, drag-reorder, slot drop zones, add-block picker, full inspector, slide management, design/assets reskin, live flash + ⌘K/copilot dock — these are M1b–M1d.
- **Placeholder scan:** no TBD/TODO in shipped code. The two inline comments (dev-host `subscribe` no-op rationale; canvas `display:contents` outline) document non-obvious WHYs per the repo's comment rule. The `subscribe` no-op is an intentional, documented M1a scope boundary, not a stub of broken behavior.
- **Type consistency:** `DeckHost`, `EditOp`, `Deck`, `EditorState`, `EditorStore`, `History`/`HistoryEntry`, `createMemoryHost`, `createEditorStore`, `createDevHost`, `useEditor`, `EditorRoot` are referenced with identical names/signatures across interface, impl, tests, and consumers. `applyOpsToDeck` is added in Task 1 and used by Tasks 1 and 7's host path. `op-flusher`'s existing `{ flush, onState, delayMs }` shape is used unchanged.
- **Green at every commit:** the boundary guard (Task 6) is created only after all four pure modules exist (Tasks 2–5), so it never references a missing file — matching the M0 green-gate discipline. The new editor is purely additive behind a dev flag; no existing path changes behavior except `/__deck` adding a field to its response (legacy editor ignores the body).
- **Node/React boundary:** every node-tested module imports only relative paths and is React-free (enforced by Task 6); `@/` and `.tsx` appear only in browser-only files covered by `tsc` + the Task 10 browser pass — consistent with vitest's node env having no `@` alias.
