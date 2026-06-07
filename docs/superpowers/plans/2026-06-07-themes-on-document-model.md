# Themes-on-Document-Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the TSX-demo "themes" system with named design-token presets (`themes/<id>.json`) that preview in a re-founded `/themes` catalog and apply to a deck from the design panel.

**Architecture:** A theme is a project JSON file `{ name, description?, design: DeepPartial<DesignSystem> }`, discovered via the existing `virtual:open-slide/themes` Vite module (now JSON-based) and written through a new `POST /__themes` dev endpoint. Applying a theme dispatches `set-design` + a new `set-deck-theme` op through the existing edit pipeline. Gallery/detail preview each theme by rendering one shared sample slide through `designToCssVars(normalizeDesign(theme.design))`.

**Tech Stack:** TypeScript, React 18, Vite plugin/dev-middleware, Vitest, Biome, pnpm + Turbo.

Spec: `docs/superpowers/specs/2026-06-07-themes-on-document-model-design.md`

---

## File map

**Create**
- `packages/core/src/app/lib/theme-sample.tsx` — shared sample slide (token-driven JSX).
- `packages/core/src/vite/routes/themes.ts` — `POST /__themes` + slugify/validate helpers.
- `apps/demo/themes/<id>.json` × 12 + `packages/cli/template/themes/<id>.json` × 12 — seed presets.
- `.changeset/*.md` × 2.

**Modify**
- `packages/core/src/app/lib/design.ts` — export `DeepPartial`.
- `packages/core/src/doc/ops.ts` — add `set-deck-theme` op.
- `packages/core/src/vite/themes-plugin.ts` — glob `*.json`, emit `{id,name,description,design}`.
- `packages/core/src/app/lib/themes.ts` — `Theme` = normalized tokens; drop demo API.
- `packages/core/src/app/components/themes/themes-gallery.tsx` — token preview.
- `packages/core/src/app/components/themes/theme-detail.tsx` — token preview + readout, drop demo/markdown.
- `packages/core/src/app/components/editor/design-panel.tsx` — Themes section (apply + save).
- `packages/core/src/app/components/editor/outline-panel.tsx` — thread `onApplyTheme`/`onSaveTheme`.
- `packages/core/src/app/components/editor/deck-editor.tsx` — dispatch two-op apply, POST save.
- `packages/core/src/vite/routes/context.ts` — add `themesRoot`.
- `packages/core/src/vite/api-plugin.ts` — register theme routes.
- `packages/core/src/locale/{types,en,ja,zh-cn,zh-tw}.ts` — theme strings.
- `packages/core/skills/create-theme/SKILL.md` + template copy — author JSON preset.

**Delete**
- `packages/core/src/app/lib/design-presets.ts`.
- `apps/demo/themes/{aurora,bright-sans,replit,sticker-pop}.{md,demo.tsx}` (8 files).

---

## Task 1: Export `DeepPartial` from design.ts

**Files:** Modify `packages/core/src/app/lib/design.ts:81`

- [ ] **Step 1: Export the type**

Change `type DeepPartial<T> = {` (line 81) to:

```ts
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm core typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/app/lib/design.ts
git commit -m "refactor(core): export DeepPartial for theme presets"
```

---

## Task 2: Add `set-deck-theme` edit op (TDD)

**Files:**
- Modify `packages/core/src/doc/ops.ts:4-15` (union) and `:36` (mutate)
- Test: `packages/core/src/doc/ops.test.ts` (create or append)

- [ ] **Step 1: Write failing test**

Append to (or create) `packages/core/src/doc/ops.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyOp } from './ops.ts';
import type { Deck } from './model.ts';

function baseDeck(): Deck {
  return {
    schemaVersion: 1,
    meta: { createdAt: '2026-01-01T00:00:00.000Z' },
    design: {
      palette: { bg: '#fff', surface: '#fff', text: '#000', muted: '#666', accent: '#06f', border: '#ccc' },
      fonts: { display: 'serif', body: 'sans-serif' },
      typeScale: { hero: 168, heading: 64, body: 36, caption: 20 },
      space: 8, radius: 12, shadow: 'none',
    },
    slides: [{ id: 's1', layout: 'blank', slots: {} }],
  };
}

describe('set-deck-theme', () => {
  it('stamps meta.theme', () => {
    const next = applyOp(baseDeck(), { kind: 'set-deck-theme', theme: 'midnight' });
    expect(next.meta.theme).toBe('midnight');
  });
  it('clears meta.theme when theme is undefined', () => {
    const d = applyOp(baseDeck(), { kind: 'set-deck-theme', theme: 'midnight' });
    const next = applyOp(d, { kind: 'set-deck-theme' });
    expect(next.meta.theme).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `pnpm core test -- ops.test`
Expected: FAIL (type/`set-deck-theme` not handled)

- [ ] **Step 3: Add op to union**

In `packages/core/src/doc/ops.ts`, after line 5 (`set-deck-title`) add:

```ts
  | { kind: 'set-deck-theme'; theme?: string }
```

- [ ] **Step 4: Handle in mutate**

In `mutate`, after the `set-deck-title` case (line 38-40) add:

```ts
    case 'set-deck-theme':
      if (op.theme === undefined) delete deck.meta.theme;
      else deck.meta.theme = op.theme;
      return;
```

- [ ] **Step 5: Run — expect pass**

Run: `pnpm core test -- ops.test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/doc/ops.ts packages/core/src/doc/ops.test.ts
git commit -m "feat(core): add set-deck-theme edit op"
```

---

## Task 3: Rewrite themes-plugin.ts to load JSON (TDD on module generation)

**Files:**
- Modify `packages/core/src/vite/themes-plugin.ts` (full rewrite of parsing/generation/watch)
- Test: `packages/core/src/vite/themes-plugin.test.ts` (create)

- [ ] **Step 1: Write failing test for the pure generator**

Create `packages/core/src/vite/themes-plugin.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generateThemesModule, parseThemeFile } from './themes-plugin.ts';

describe('parseThemeFile', () => {
  it('reads id/name/description/design from json', () => {
    const t = parseThemeFile('midnight', JSON.stringify({
      name: 'Midnight', description: 'Dark', design: { palette: { bg: '#000' } },
    }));
    expect(t).toEqual({ id: 'midnight', name: 'Midnight', description: 'Dark', design: { palette: { bg: '#000' } } });
  });
  it('falls back name to id and design to empty', () => {
    const t = parseThemeFile('x', JSON.stringify({}));
    expect(t).toEqual({ id: 'x', name: 'x', description: '', design: {} });
  });
});

describe('generateThemesModule', () => {
  it('emits a themes array with design', () => {
    const code = generateThemesModule([
      { id: 'midnight', name: 'Midnight', description: 'Dark', design: { palette: { bg: '#000' } } },
    ]);
    expect(code).toContain('export const themes =');
    expect(code).toContain('"midnight"');
    expect(code).toContain('"#000"');
    expect(code).not.toContain('loadThemeDemo');
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `pnpm core test -- themes-plugin.test`
Expected: FAIL (exports not found)

- [ ] **Step 3: Rewrite the plugin**

Replace the entire contents of `packages/core/src/vite/themes-plugin.ts` with:

```ts
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import type { Plugin } from 'vite';
import type { OpenSlideConfig } from '../config.ts';

export type ThemesPluginOptions = {
  userCwd: string;
  config: OpenSlideConfig;
};

const THEMES_VMOD = 'virtual:open-slide/themes';

function resolved(id: string): string {
  return `\0${id}`;
}

export type ParsedTheme = {
  id: string;
  name: string;
  description: string;
  design: Record<string, unknown>;
};

export function parseThemeFile(id: string, raw: string): ParsedTheme {
  let data: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      data = parsed as Record<string, unknown>;
    }
  } catch {
    data = {};
  }
  const name = typeof data.name === 'string' && data.name ? data.name : id;
  const description = typeof data.description === 'string' ? data.description : '';
  const design =
    data.design && typeof data.design === 'object' && !Array.isArray(data.design)
      ? (data.design as Record<string, unknown>)
      : {};
  return { id, name, description, design };
}

export function generateThemesModule(themes: ParsedTheme[]): string {
  return `// virtual:open-slide/themes — generated\nexport const themes = ${JSON.stringify(themes)};\n`;
}

async function findThemeFiles(themesRoot: string): Promise<string[]> {
  if (!existsSync(themesRoot)) return [];
  const hits = await fg('*.json', { cwd: themesRoot, absolute: true, onlyFiles: true });
  return hits.sort();
}

async function readThemes(themesRoot: string): Promise<ParsedTheme[]> {
  const files = await findThemeFiles(themesRoot);
  return Promise.all(
    files.map(async (abs) => parseThemeFile(path.basename(abs, '.json'), await fs.readFile(abs, 'utf8'))),
  );
}

export function themesPlugin(opts: ThemesPluginOptions): Plugin {
  const { userCwd, config } = opts;
  const themesDir = config.themesDir ?? 'themes';
  const themesRoot = path.resolve(userCwd, themesDir);

  return {
    name: 'open-slide:themes',
    resolveId(id) {
      if (id === THEMES_VMOD) return resolved(THEMES_VMOD);
      return null;
    },
    async load(id) {
      if (id !== resolved(THEMES_VMOD)) return null;
      return generateThemesModule(await readThemes(themesRoot));
    },
    configureServer(server) {
      const isThemeFile = (p: string) => {
        const rel = path.relative(themesRoot, p);
        if (rel.startsWith('..') || path.isAbsolute(rel)) return false;
        if (rel.includes(path.sep)) return false;
        return rel.endsWith('.json');
      };
      let reloadTimer: ReturnType<typeof setTimeout> | null = null;
      const reload = () => {
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          reloadTimer = null;
          const mod = server.moduleGraph.getModuleById(resolved(THEMES_VMOD));
          if (mod) server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
        }, 150);
      };
      if (existsSync(themesRoot)) server.watcher.add(themesRoot);
      server.watcher.on('add', (p) => isThemeFile(p) && reload());
      server.watcher.on('unlink', (p) => isThemeFile(p) && reload());
      server.watcher.on('change', (p) => isThemeFile(p) && reload());
    },
  };
}
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm core test -- themes-plugin.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/vite/themes-plugin.ts packages/core/src/vite/themes-plugin.test.ts
git commit -m "feat(core): load themes from json presets"
```

---

## Task 4: Rewrite lib/themes.ts to expose normalized token themes

**Files:** Modify `packages/core/src/app/lib/themes.ts`

- [ ] **Step 1: Replace contents**

```ts
import { themes as raw } from 'virtual:open-slide/themes';
import { type DesignSystem, type DeepPartial, normalizeDesign } from './design';

export type Theme = {
  id: string;
  name: string;
  description: string;
  design: DesignSystem;
};

type RawTheme = { id: string; name: string; description: string; design: DeepPartial<DesignSystem> };

export const themes: Theme[] = (raw as RawTheme[]).map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  design: normalizeDesign(t.design),
}));
```

- [ ] **Step 2: Fix the virtual-module type declaration**

Find the ambient module decl for `virtual:open-slide/themes` (search):

Run: `grep -rn "virtual:open-slide/themes" packages/core/src --include=*.d.ts`

Update its export to:

```ts
declare module 'virtual:open-slide/themes' {
  export const themes: Array<{ id: string; name: string; description: string; design: Record<string, unknown> }>;
}
```

(If no `.d.ts` exists, search `*.ts` for the `declare module` and update there.)

- [ ] **Step 3: Typecheck**

Run: `pnpm core typecheck`
Expected: errors ONLY in files still importing `loadThemeDemo`/`Theme.body`/`hasDemo` (gallery, detail) — fixed in Tasks 6-7. The themes.ts file itself must be clean.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/app/lib/themes.ts packages/core/src
git commit -m "feat(core): themes lib exposes normalized token presets"
```

---

## Task 5: Shared sample slide component

**Files:** Create `packages/core/src/app/lib/theme-sample.tsx`

- [ ] **Step 1: Write the component**

A self-contained 1920×1080 sample that exercises hero/heading/body/caption/accent/surface/border via CSS vars (filled by `SlideCanvas`'s `designToCssVars`).

```tsx
export function ThemeSample() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
        padding: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <span
          style={{
            fontSize: 'var(--osd-size-caption)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--osd-accent)',
          }}
        >
          Theme preview
        </span>
        <h1
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 'var(--osd-size-hero)',
            lineHeight: 1.02,
            margin: 0,
            fontWeight: 700,
          }}
        >
          Typography
        </h1>
        <p
          style={{
            fontSize: 'var(--osd-size-body)',
            lineHeight: 1.45,
            margin: 0,
            maxWidth: 1100,
            color: 'var(--osd-muted)',
          }}
        >
          The quick brown fox jumps over the lazy dog — body copy at the deck's base size.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 32, alignItems: 'stretch' }}>
        <div
          style={{
            flex: 1,
            background: 'var(--osd-surface)',
            border: '1px solid var(--osd-border)',
            borderRadius: 'var(--osd-radius)',
            boxShadow: 'var(--osd-shadow)',
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <span style={{ fontFamily: 'var(--osd-font-display)', fontSize: 'var(--osd-size-heading)', fontWeight: 700 }}>
            01
          </span>
          <span style={{ fontSize: 'var(--osd-size-caption)', color: 'var(--osd-muted)' }}>Surface card</span>
        </div>
        <div
          style={{
            flex: 1,
            background: 'var(--osd-accent)',
            color: 'var(--osd-bg)',
            borderRadius: 'var(--osd-radius)',
            padding: 48,
            display: 'flex',
            alignItems: 'flex-end',
            fontFamily: 'var(--osd-font-display)',
            fontSize: 'var(--osd-size-heading)',
            fontWeight: 700,
          }}
        >
          Accent
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm core typecheck`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/app/lib/theme-sample.tsx
git commit -m "feat(core): add shared theme sample slide"
```

---

## Task 6: Rewrite themes-gallery.tsx (token preview)

**Files:** Modify `packages/core/src/app/components/themes/themes-gallery.tsx`

- [ ] **Step 1: Replace contents**

```tsx
import { format, useLocale } from '@/lib/use-locale';
import { ThemeSample } from '../../lib/theme-sample';
import type { Theme } from '../../lib/themes';
import { themes } from '../../lib/themes';
import { SlideCanvas } from '../slide-canvas';

export function ThemesGallery({ onOpen }: { onOpen: (id: string) => void }) {
  if (themes.length === 0) return <ThemesEmptyState />;
  const t = useLocale();
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-x-6 gap-y-9 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
      {themes.map((theme) => (
        <li key={theme.id}>
          <ThemeCard theme={theme} onOpen={() => onOpen(theme.id)} ariaLabel={format(t.themes.openThemeAria, { name: theme.name })} />
        </li>
      ))}
    </ul>
  );
}

function ThemeCard({ theme, onOpen, ariaLabel }: { theme: Theme; onOpen: () => void; ariaLabel: string }) {
  return (
    <button type="button" onClick={onOpen} aria-label={ariaLabel} className="group block w-full text-left focus-visible:outline-none">
      <div className="relative aspect-video overflow-hidden rounded-[6px] border border-hairline bg-card shadow-edge ring-1 ring-foreground/[0.04] group-hover:shadow-floating group-hover:ring-foreground/20 motion-safe:transition-[box-shadow,--tw-ring-color] motion-safe:duration-200">
        <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]">
          <SlideCanvas flat freezeMotion design={theme.design}>
            <ThemeSample />
          </SlideCanvas>
        </div>
      </div>
      <div className="mt-3">
        <h3 className="min-w-0 truncate font-heading text-[14px] font-medium tracking-tight">{theme.name}</h3>
      </div>
      {theme.description ? (
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">{theme.description}</p>
      ) : null}
    </button>
  );
}

function ThemesEmptyState() {
  const t = useLocale();
  return (
    <div className="rounded-[10px] border border-dashed border-border bg-card/60 px-8 py-20">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="text-2xl">🎨</div>
        <p className="mt-3 font-heading text-[15px] font-semibold tracking-tight">{t.themes.noThemesTitle}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {t.themes.noThemesHintPrefix}
          <code className="rounded-[4px] bg-muted px-1.5 py-0.5 font-mono text-[11.5px] text-foreground">/create-theme</code>
          {t.themes.noThemesHintSuffix}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit** (typecheck deferred — detail.tsx still references removed APIs)

```bash
git add packages/core/src/app/components/themes/themes-gallery.tsx
git commit -m "feat(core): preview theme cards via design tokens"
```

---

## Task 7: Rewrite theme-detail.tsx (token preview + readout)

**Files:** Modify `packages/core/src/app/components/themes/theme-detail.tsx`

- [ ] **Step 1: Replace contents**

Keep "Used by" (`slidesByTheme` + `ThemeSlideCard`) and back button. Drop demo loading, paging, markdown body, swatches-from-body. Add a token readout from `theme.design`.

```tsx
import { ChevronLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/use-locale';
import { SlidePageProvider } from '../../lib/page-context';
import type { SlideModule } from '../../lib/sdk';
import { loadSlide, slidesByTheme } from '../../lib/slides';
import { ThemeSample } from '../../lib/theme-sample';
import { themes } from '../../lib/themes';
import { SlideCanvas } from '../slide-canvas';

export function ThemeDetail({ themeId, onBack }: { themeId: string; onBack: () => void }) {
  const t = useLocale();
  const theme = useMemo(() => themes.find((th) => th.id === themeId), [themeId]);
  const usedBySlideIds = useMemo(() => (theme ? slidesByTheme(theme.id) : []), [theme]);

  if (!theme) {
    return (
      <div className="px-8 py-12">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="size-4" />
          {t.themes.backToGallery}
        </Button>
      </div>
    );
  }

  const d = theme.design;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ChevronLeft className="size-4" />
          {t.themes.backToGallery}
        </Button>
      </div>

      <header className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-heading text-[26px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[32px]">{theme.name}</h2>
        {theme.description ? <p className="basis-full text-[13px] leading-relaxed text-muted-foreground">{theme.description}</p> : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="relative aspect-video overflow-hidden rounded-[8px] border border-hairline bg-card shadow-edge ring-1 ring-foreground/[0.04]">
            <SlideCanvas flat freezeMotion design={d}>
              <SlidePageProvider index={0} total={1}>
                <ThemeSample />
              </SlidePageProvider>
            </SlideCanvas>
          </div>

          <div className="flex flex-col gap-4 rounded-[8px] border border-hairline bg-card p-4">
            <div className="flex flex-wrap gap-2">
              {(['bg', 'surface', 'text', 'muted', 'accent', 'border'] as const).map((k) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span aria-hidden className="inline-block size-4 rounded-[3px] ring-1 ring-foreground/15" style={{ background: d.palette[k] }} />
                  <span className="font-mono text-[10.5px] text-muted-foreground">{k} {d.palette[k]}</span>
                </div>
              ))}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[11px] text-muted-foreground">
              <div><dt className="inline text-foreground/80">display</dt>: {d.fonts.display}</div>
              <div><dt className="inline text-foreground/80">body</dt>: {d.fonts.body}</div>
              <div><dt className="inline text-foreground/80">hero/heading/body/caption</dt>: {d.typeScale.hero}/{d.typeScale.heading}/{d.typeScale.body}/{d.typeScale.caption}px</div>
              <div><dt className="inline text-foreground/80">radius/space</dt>: {d.radius}/{d.space}px</div>
            </dl>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="eyebrow">{t.themes.usedBy}</span>
            {usedBySlideIds.length > 0 ? <span className="folio">{usedBySlideIds.length.toString().padStart(2, '0')}</span> : null}
          </div>
          {usedBySlideIds.length === 0 ? (
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">{t.themes.usedByEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-5">
              {usedBySlideIds.map((id) => (
                <li key={id}>
                  <ThemeSlideCard id={id} />
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function ThemeSlideCard({ id }: { id: string }) {
  const t = useLocale();
  const [slide, setSlide] = useState<SlideModule | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadSlide(id).then((mod) => { if (!cancelled) setSlide(mod); }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);
  const FirstPage = slide?.default[0];
  const displayTitle = slide?.meta?.title ?? id;
  return (
    <Link to={`/s/${id}`} className="group block focus-visible:outline-none">
      <div className="relative aspect-video overflow-hidden rounded-[6px] border border-hairline bg-card shadow-edge ring-1 ring-foreground/[0.04] group-hover:shadow-floating group-hover:ring-foreground/20 motion-safe:transition-[box-shadow,--tw-ring-color] motion-safe:duration-200">
        {FirstPage ? (
          <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]">
            <SlideCanvas flat freezeMotion design={slide?.design}>
              <SlidePageProvider index={0} total={slide?.default.length ?? 1}>
                <FirstPage />
              </SlidePageProvider>
            </SlideCanvas>
          </div>
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] tracking-[0.16em] uppercase text-muted-foreground/60">{t.common.loading}</div>
        )}
      </div>
      <div className="mt-2.5">
        <h3 className="min-w-0 truncate font-heading text-[13px] font-medium tracking-tight">{displayTitle}</h3>
        <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground/80">{id}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm core typecheck`
Expected: PASS (gallery + detail no longer reference removed APIs).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/app/components/themes/theme-detail.tsx
git commit -m "feat(core): theme detail previews tokens with a readout"
```

---

## Task 8: Locale — swap demo strings for token-apply strings

**Files:** Modify `packages/core/src/locale/{types,en,ja,zh-cn,zh-tw}.ts`

- [ ] **Step 1: Update `types.ts` themes block**

Remove keys: `noDemoYet`, `noDemoHintPrefix`, `noDemoHintSuffix`, `pageOf`, `nextPageAria`, `prevPageAria`, `expandPromptAria`, `collapsePromptAria`. Add: `applyTheme: string;`, `saveAsTheme: string;`, `saveThemePrompt: string;`, `themeApplied: string;`, `pickTheme: string;`.

- [ ] **Step 2: Update `en.ts` themes object**

Replace the themes object (line 380) with:

```ts
  themes: {
    title: 'Themes',
    noThemesTitle: 'No themes yet',
    noThemesHintPrefix: 'Run ',
    noThemesHintSuffix: ' to author one — a JSON preset under themes/.',
    backToGallery: 'Back to themes',
    openThemeAria: 'Open theme {name}',
    usedBy: 'Slides using this theme',
    usedByEmpty: 'No slides use this theme yet.',
    applyTheme: 'Apply',
    saveAsTheme: 'Save as theme…',
    saveThemePrompt: 'Theme name',
    themeApplied: 'Theme applied',
    pickTheme: 'Themes',
  },
```

- [ ] **Step 3: Mirror the same key set into `ja.ts`, `zh-cn.ts`, `zh-tw.ts`**

For each: delete the 8 removed keys, add the 5 new keys. Translations may reuse English text if no localized string is obvious (match the file's existing fidelity — these files already carry English fallbacks for some keys). Update `noThemesHintSuffix` wording to drop the "markdown file + demo" phrasing.

- [ ] **Step 4: Typecheck**

Run: `pnpm core typecheck`
Expected: PASS (all locales satisfy `types.ts`; no component references a removed key).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/locale
git commit -m "feat(core): theme locale strings for token apply/save"
```

---

## Task 9: `POST /__themes` route + context (TDD on helpers)

**Files:**
- Modify `packages/core/src/vite/routes/context.ts` (add `themesRoot`)
- Create `packages/core/src/vite/routes/themes.ts`
- Modify `packages/core/src/vite/api-plugin.ts`
- Test: `packages/core/src/vite/routes/themes.test.ts`

- [ ] **Step 1: Add `themesRoot` to context**

In `context.ts`: add `themesRoot: string;` to `ApiContext` (after `slidesRoot`), add `themesDir?: string;` to `ApiPluginOptions`, and in `makeContext` add:

```ts
  const themesDir = opts.themesDir ?? 'themes';
  const themesRoot = path.resolve(userCwd, themesDir);
```

and include `themesRoot` in the returned object.

- [ ] **Step 2: Write failing test for slugify/validate**

Create `packages/core/src/vite/routes/themes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { slugifyThemeName, themeFileBody } from './themes.ts';

describe('slugifyThemeName', () => {
  it('kebab-cases and strips junk', () => {
    expect(slugifyThemeName('Midnight Blue!')).toBe('midnight-blue');
  });
  it('falls back to "theme" when empty', () => {
    expect(slugifyThemeName('   ')).toBe('theme');
  });
  it('avoids collisions with a numeric suffix', () => {
    expect(slugifyThemeName('Midnight', new Set(['midnight']))).toBe('midnight-2');
  });
});

describe('themeFileBody', () => {
  it('writes name/description/design pretty JSON with trailing newline', () => {
    const body = themeFileBody('Midnight', 'Dark', { palette: { bg: '#000' } });
    expect(body.endsWith('\n')).toBe(true);
    expect(JSON.parse(body)).toEqual({ name: 'Midnight', description: 'Dark', design: { palette: { bg: '#000' } } });
  });
});
```

- [ ] **Step 3: Run — expect fail**

Run: `pnpm core test -- routes/themes.test`
Expected: FAIL (module missing)

- [ ] **Step 4: Write the route**

Create `packages/core/src/vite/routes/themes.ts`:

```ts
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { normalizeDesign } from '../../app/lib/design.ts';
import { validateMutationRequest } from '../../http/request-guard.ts';
import { type ApiContext, json, readBody } from './context.ts';

// POST /__themes   write a token preset   { name, description?, design }

export function slugifyThemeName(name: string, taken: Set<string> = new Set()): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'theme';
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const cand = `${base}-${i}`;
    if (!taken.has(cand)) return cand;
  }
  return `${base}-${Date.parse('2026-01-01')}`;
}

export function themeFileBody(name: string, description: string, design: unknown): string {
  return `${JSON.stringify({ name, description, design }, null, 2)}\n`;
}

type ThemeBody = { name?: unknown; description?: unknown; design?: unknown };

export function registerThemeRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use('/__themes', async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    if ((req.method ?? 'GET') !== 'POST' || url.pathname !== '/') return next();

    const requestCheck = validateMutationRequest(req, { requireJsonBody: true });
    if (!requestCheck.ok) return json(res, requestCheck.status, { ok: false, error: requestCheck.error });

    try {
      const body = (await readBody(req)) as ThemeBody;
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return json(res, 400, { ok: false, error: 'name must be a non-empty string' });
      }
      if (!body.design || typeof body.design !== 'object' || Array.isArray(body.design)) {
        return json(res, 400, { ok: false, error: 'design must be an object' });
      }
      const description = typeof body.description === 'string' ? body.description : '';
      const design = normalizeDesign(body.design as Parameters<typeof normalizeDesign>[0]);

      await fs.mkdir(ctx.themesRoot, { recursive: true });
      const taken = new Set(
        existsSync(ctx.themesRoot)
          ? (await fs.readdir(ctx.themesRoot)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5))
          : [],
      );
      const id = slugifyThemeName(body.name, taken);
      const filePath = path.resolve(ctx.themesRoot, `${id}.json`);
      if (!filePath.startsWith(ctx.themesRoot + path.sep)) {
        return json(res, 400, { ok: false, error: 'invalid id' });
      }
      await fs.writeFile(filePath, themeFileBody(body.name.trim(), description, design), 'utf8');
      return json(res, 200, { ok: true, id, name: body.name.trim() });
    } catch (err) {
      return json(res, 400, { ok: false, error: String((err as Error).message ?? err) });
    }
  });
}
```

- [ ] **Step 5: Register in api-plugin.ts**

Add import `import { registerThemeRoutes } from './routes/themes.ts';` and call `registerThemeRoutes(server, ctx);` after `registerDeckRoutes(server, ctx);`. Pass `themesDir` through from wherever `apiPlugin` is constructed if config provides it (default 'themes' already handled).

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm core test -- routes/themes.test && pnpm core typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/vite/routes/themes.ts packages/core/src/vite/routes/themes.test.ts packages/core/src/vite/routes/context.ts packages/core/src/vite/api-plugin.ts
git commit -m "feat(core): POST /__themes writes a token preset file"
```

---

## Task 10: Design-panel Themes section (apply + save)

**Files:**
- Modify `packages/core/src/app/components/editor/design-panel.tsx`
- Modify `packages/core/src/app/components/editor/outline-panel.tsx`
- Modify `packages/core/src/app/components/editor/deck-editor.tsx`

- [ ] **Step 1: Add a `postSaveTheme` client helper**

In `packages/core/src/app/lib/editor/edit-client.ts` append:

```ts
import type { DesignSystem } from '../design';

export async function postSaveTheme(name: string, design: DesignSystem): Promise<{ id: string }> {
  const res = await fetch('/__themes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, design }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(detail.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as { id: string };
}
```

- [ ] **Step 2: Add Themes section to DesignPanel**

Change the `DesignPanel` props to add `onApplyTheme` and `onSaveTheme`:

```tsx
export function DesignPanel({
  design,
  onChange,
  onApplyTheme,
  onSaveTheme,
}: {
  design: DesignSystem;
  onChange: (next: DesignSystem) => void;
  onApplyTheme: (theme: Theme) => void;
  onSaveTheme: (name: string) => void;
}) {
```

Add imports at top:

```tsx
import { themes } from '../../lib/themes';
import type { Theme } from '../../lib/themes';
import { useLocale } from '@/lib/use-locale';
```

Inside the `{open && (...)}` block, insert as the FIRST child (before Palette) a Themes sub-section:

```tsx
          <div className="flex flex-col gap-2.5 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="eyebrow">{t.themes.pickTheme}</span>
              <span aria-hidden className="h-px flex-1 bg-hairline" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onApplyTheme(theme)}
                  title={theme.name}
                  className="flex items-center gap-1.5 rounded-[4px] border border-border bg-background px-2 py-1.5 text-left hover:border-foreground/40"
                >
                  <span className="flex shrink-0">
                    {(['bg', 'accent', 'text'] as const).map((k) => (
                      <span key={k} className="size-3 rounded-full ring-1 ring-foreground/10" style={{ background: theme.design.palette[k], marginLeft: k === 'bg' ? 0 : -4 }} />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px]">{theme.name}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const name = window.prompt(t.themes.saveThemePrompt);
                if (name && name.trim()) onSaveTheme(name.trim());
              }}
              className="rounded-[4px] border border-dashed border-border px-2 py-1.5 text-[11px] text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            >
              {t.themes.saveAsTheme}
            </button>
          </div>
```

Add `const t = useLocale();` near the top of the component body.

- [ ] **Step 3: Thread props through OutlinePanel**

In `outline-panel.tsx`: add `onApplyTheme` and `onSaveTheme` to the props type (mirroring `onDesignChange`), and pass them to `<DesignPanel design={deck.design} onChange={onDesignChange} onApplyTheme={onApplyTheme} onSaveTheme={onSaveTheme} />` at line 289.

- [ ] **Step 4: Wire in deck-editor.tsx**

At the `<OutlinePanel ... onDesignChange={...} />` (line 656-661) add:

```tsx
          onApplyTheme={(theme) =>
            editor.apply([
              { kind: 'set-design', design: theme.design },
              { kind: 'set-deck-theme', theme: theme.id },
            ])
          }
          onSaveTheme={(name) => {
            void postSaveTheme(name, editor.deck.design);
          }}
```

Add import: `import { postSaveTheme } from '../../lib/editor/edit-client';` (match existing relative path used for `postOps` in this tree).

- [ ] **Step 5: Typecheck**

Run: `pnpm core typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/app/components/editor packages/core/src/app/lib/editor/edit-client.ts
git commit -m "feat(core): apply + save themes from the design panel"
```

---

## Task 11: Seed theme JSON presets (demo + template)

**Files:** Create 12 `themes/<id>.json` in BOTH `apps/demo/themes/` and `packages/cli/template/themes/`; delete `packages/core/src/app/lib/design-presets.ts`.

- [ ] **Step 1: Author the 12 presets**

Convert each `design-presets.ts` entry into a named JSON file. Names/ids:
`sandstone` (the defaultDesign), `midnight`, `coral`, `solar`, `sage`, `editorial`, `apricot`, `mint`, `noir`, `lilac`, `terminal`, `bauhaus`.

Each file shape (example `midnight.json`):

```json
{
  "name": "Midnight",
  "description": "Dark slate with a cool blue accent and a serif display.",
  "design": {
    "palette": { "bg": "#0f1115", "surface": "#1a1d24", "text": "#f5f3ee", "muted": "#9aa0ab", "accent": "#7cc4ff", "border": "#2b2f38" },
    "fonts": { "display": "Georgia, \"Times New Roman\", serif", "body": "-apple-system, BlinkMacSystemFont, \"Inter\", system-ui, sans-serif" },
    "typeScale": { "hero": 192, "body": 32 },
    "radius": 6,
    "shadow": "0 10px 30px rgba(0,0,0,0.45)"
  }
}
```

Carry over the exact `palette`/`fonts`/`typeScale`/`radius`/`shadow` partials from `design-presets.ts` for each entry (only the roles it set). `sandstone` = `{ "design": {} }` with name/description (inherits all defaults). Copy each file identically into both `apps/demo/themes/` and `packages/cli/template/themes/`. Remove `packages/cli/template/themes/.gitkeep`.

- [ ] **Step 2: Delete design-presets.ts**

```bash
git rm packages/core/src/app/lib/design-presets.ts packages/cli/template/themes/.gitkeep
```

(Confirm nothing imports it: `grep -rn "design-presets\|shuffleDesign" packages` → no hits.)

- [ ] **Step 3: Typecheck + biome**

Run: `pnpm core typecheck && pnpm check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/demo/themes packages/cli/template/themes packages/core/src/app/lib/design-presets.ts
git commit -m "feat: seed named theme presets, drop anonymous design-presets"
```

---

## Task 12: Remove the 4 TSX theme bundles

**Files:** Delete `apps/demo/themes/{aurora,bright-sans,replit,sticker-pop}.{md,demo.tsx}`

- [ ] **Step 1: Remove**

```bash
git rm apps/demo/themes/aurora.md apps/demo/themes/aurora.demo.tsx \
  apps/demo/themes/bright-sans.md apps/demo/themes/bright-sans.demo.tsx \
  apps/demo/themes/replit.md apps/demo/themes/replit.demo.tsx \
  apps/demo/themes/sticker-pop.md apps/demo/themes/sticker-pop.demo.tsx
```

- [ ] **Step 2: Confirm no references**

Run: `grep -rn "aurora\|sticker-pop\|bright-sans" apps/demo/slides packages/core/src || echo clean`
Expected: any deck `meta.theme` that named a removed theme is now a dangling provenance label (chip still renders, links to a 404 detail — acceptable, or update the deck's `meta.theme` to a seeded id). Check: `grep -rn '"theme"' apps/demo/slides`.

- [ ] **Step 3: Commit**

```bash
git add apps/demo/themes
git commit -m "chore(demo): remove legacy TSX theme bundles"
```

---

## Task 13: Rewrite the create-theme skill

**Files:** Modify `packages/core/skills/create-theme/SKILL.md`; re-sync template copy `packages/cli/template/.agents/skills/create-theme/SKILL.md`.

- [ ] **Step 1: Rewrite SKILL.md**

New flow: produce ONE file `themes/<id>.json` = `{ name, description, design: DeepPartial<DesignSystem> }`. Document the token roles + sensible ranges (hero 120–220px, heading ~56–80, body 28–36, caption 18–22; radius 0–24; accessible palette contrast). Inputs: images / text / an existing deck's `deck.json` `design`. Remove ALL `.md` frontmatter, `.demo.tsx`, fixed-component, and motion instructions. State that the theme previews automatically in `/themes` and applies from the deck editor's design panel; `meta.theme` is a provenance stamp set on apply.

- [ ] **Step 2: Re-sync the copy**

```bash
cp packages/core/skills/create-theme/SKILL.md packages/cli/template/.agents/skills/create-theme/SKILL.md
```

(The `apps/demo/.agents/skills/create-theme` is a symlink to core — no copy needed.)

- [ ] **Step 3: Update slide-authoring references (if any)**

Run: `grep -rn "demo.tsx\|themes/.*\.md\|create-theme" packages/core/skills/slide-authoring`
Update any text describing themes as `.md`+`.demo.tsx` to "a JSON token preset under themes/". Re-sync its template copy if changed.

- [ ] **Step 4: Commit**

```bash
git add packages/core/skills packages/cli/template/.agents/skills
git commit -m "docs(skill): create-theme authors a json token preset"
```

---

## Task 14: Changesets + full verification

- [ ] **Step 1: Add changesets**

Create `.changeset/themes-document-model-core.md`:

```md
---
"@open-slide/core": minor
---

Re-found themes as named design-token presets (themes/*.json): preview them in the /themes catalog, apply and save them from the deck design panel.
```

Create `.changeset/themes-document-model-cli.md`:

```md
---
"@open-slide/cli": minor
---

Seed new projects with named theme presets and the JSON-based create-theme skill.
```

- [ ] **Step 2: Full gate**

Run: `pnpm typecheck && pnpm test && pnpm check`
Expected: PASS. Fix biome with `pnpm check:fix` if needed.

- [ ] **Step 3: Rebuild core for the demo**

Run: `pnpm core build`
Expected: build succeeds.

- [ ] **Step 4: Browser verification**

Run `pnpm dev`, open the demo. Hard-refresh; if "Invalid hook call" appears, stop, `rm -rf apps/demo/node_modules/.vite`, restart.
Verify:
1. `/themes` renders a card per seeded preset, each showing the sample slide in that theme's palette/fonts.
2. Opening a theme shows the large preview + palette/font/type readout + "Used by".
3. In a deck editor, the design panel "Themes" section lists presets; clicking one reskins the open slide live; `apps/demo/slides/<id>/deck.json` `design` changes on disk and `meta.theme` is stamped.
4. "Save as theme…" prompts, writes `apps/demo/themes/<slug>.json`, and the new card appears in `/themes` (after the watcher full-reload) without restarting dev.
5. Home card 🎨 chip still links to the theme detail.

- [ ] **Step 5: Commit changesets**

```bash
git add .changeset
git commit -m "chore: changesets for themes-on-document-model"
```

---

## Self-review notes

- **Spec coverage:** file format (T3/T11), virtual-module discovery (T3), normalized lib (T4), built-ins as seeds (T11), apply via set-design+set-deck-theme (T2/T10), save-as-theme (T9/T10), `/themes` token preview (T5/T6/T7), `meta.theme` provenance (T2/T10), server route (T9), skill rewrite (T13), removals (T11/T12), changesets+verify (T14). All covered.
- **Type consistency:** `Theme = { id, name, description, design: DesignSystem }` used in T4/T6/T7/T10; raw virtual `design` is `DeepPartial`/`Record<string,unknown>` normalized at the lib edge and in the route via `normalizeDesign`. `set-deck-theme` op name consistent across T2/T10.
- **Risk:** `useLocale()` is called after an early `return` in the original gallery; T6 moves the empty-state check to keep hook order valid (hooks before conditional return). Watch React hook-order in the rewritten components.
