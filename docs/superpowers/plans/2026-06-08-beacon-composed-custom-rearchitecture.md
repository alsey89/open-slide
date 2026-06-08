# Beacon Composed-Custom Re-architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Beacon pitch deck so its bespoke visuals are recreated as a small set of custom *layouts* (the cinematic shell/backdrop) plus many small custom *blocks* (the editable content) — so every piece is individually selectable and in-place editable, instead of one monolithic full-bleed block per slide.

**Architecture:** The cohesive ambient art (warm topographic backdrop, grid stripes, footer chrome, shared web fonts + keyframes) moves into **custom layouts** (`survey-stage`, `survey-grid`, `survey-feature`) that own the slide shell and expose named content slots. The per-slide content becomes **small custom blocks** (`survey-kicker`, `survey-headline`, `survey-text`, `survey-points`, `survey-metric`, `survey-step`, `survey-person`, `survey-bars`, `survey-spark`, `survey-ping`) placed into those slots — each with a prop schema (inspector fields) and `data-osd-text` tags (in-place text editing, incl. M1c-1 dot-paths for arrays). The deck.json composes them. The visuals are **ported** from the existing Beacon pack (still in `apps/demo/blocks/index.tsx` at HEAD `12c1069`), not designed fresh. Finally the `slide-authoring` skill is updated to teach this composed-custom pattern.

**Tech Stack:** React 18 (demo), TypeScript, `@open-slide/core` (`registerBlock`/`registerLayout`/`PropField`), Vite, Biome. Demo has no unit-test runner — blocks are verified by `tsc` + a headless `ssrLoadModule` registry check + a real-browser CDP pass (see the `verifying-the-running-app` memory).

**Source of truth for visuals:** the existing Beacon functions in `apps/demo/blocks/index.tsx` (the `Beacon*` components + `BeaconFx`/`Topo`/`Ping`/`SurveyFooter`/`Survey`/`Field`/`surveyDisplay`/`EMBER`/`SURVEY_MONO`). They remain in the working tree until Task 5 removes them, so port directly from them.

**Branch:** work on a branch off `main` (e.g. `feat/beacon-composed-custom`).

**Changeset:** `apps/demo` changes need **no** changeset (private). The Task 7 skill edit touches `packages/core/skills` + the `packages/cli` template → **one** changeset (`core` patch, `cli` patch).

---

## Design: layout + block inventory (the interfaces)

### Custom layouts (own the shell; render `<SurveyFx/>` once + Topo backdrop + footer chrome + padding)

| Layout | Slots | Used by |
| --- | --- | --- |
| `survey-stage` | `kicker`, `headline`, `body`, `aside` | cover, problem, solution, ask |
| `survey-grid` | `kicker`, `headline`, `items` (auto N-up) | how, team |
| `survey-feature` | `kicker`, `headline`, `feature` (full-width), `metrics` (N-up row) | market, traction |

`survey-stage` renders `body` as the main column and, when `aside` has blocks, a right rail beside it (2-col); when `aside` is empty, `body` spans full width. `survey-grid` renders `items` as `gridTemplateColumns: repeat(N, 1fr)` where N = item count. `survey-feature` stacks `feature` (full width) above a `metrics` row (`repeat(N,1fr)`); an empty `metrics` slot renders nothing.

### Custom blocks (each: a component + a `PropField` schema + `data-osd-text` tags)

| Block | Props | `data-osd-text` paths | Schema fields |
| --- | --- | --- | --- |
| `survey-kicker` | `{ text }` | `text` | text |
| `survey-headline` | `{ text, scale?: 'hero'\|'h2' }` | `text` | text(textarea), scale(select hero/h2) |
| `survey-text` | `{ text }` | `text` | text(textarea) |
| `survey-points` | `{ items: string[], tone?: 'problem'\|'solution' }` | `items.${i}` (each item) | items(string-list), tone(select) |
| `survey-metric` | `{ value, label?, caption? }` | `value`, `label`, `caption` | value(text), label(text), caption(textarea) |
| `survey-step` | `{ n?, title, desc? }` | `n`, `title`, `desc` | n(text), title(text), desc(textarea) |
| `survey-person` | `{ name, role?, prev? }` | `name`, `role`, `prev` | name(text), role(text), prev(textarea) |
| `survey-bars` | `{ segments: {label?,value?,note?}[] }` | `segments.${i}.value`, `segments.${i}.label`, `segments.${i}.note` (legend only — one element per path) | *(no schema → JSON fallback for the array; text edits via paths)* |
| `survey-spark` | `{ series: number[], caption? }` | `caption` | caption(text) |
| `survey-ping` | `{ size?: number }` | *(none)* | size(number) |

`data-osd-text` rules (from the slide-authoring skill, enforced here): tag the innermost element whose text is exactly the value; one element per path (the `survey-bars` value/label render in a chart AND a legend — tag the legend only); never tag SVG `<text>`; don't tag numbers/derived (`survey-person` initials avatar, `survey-step` is fine since `n` is a string like `"01"`, `survey-spark` series).

### Deck composition (`apps/demo/slides/beacon-pitch/deck.json`)

| Slide id | Layout | Slots → blocks |
| --- | --- | --- |
| `b-cover` | `survey-stage` | kicker:[kicker "AI wildfire early-detection"] · headline:[headline scale:hero "See the first ember."] · body:[text "Beacon fuses…catastrophe."] · aside:[ping] |
| `b-problem` | `survey-stage` | kicker:[kicker "The problem"] · headline:[headline "By the time a wildfire is reported, it has already won."] · body:[points tone:problem (3 items)] · aside:[metric $394B / "annual U.S. wildfire losses" / "property, suppression, health, and lost output"] |
| `b-solution` | `survey-stage` | kicker:[kicker "The solution"] · headline:[headline "A detection network that never blinks."] · body:[points tone:solution (3 items)] · aside:[metric 2:47 / "median time to alert" / "a verified, geolocated ignition"] |
| `b-how` | `survey-grid` | kicker:[kicker "How it works"] · headline:[headline "From the first photon of heat to boots on the ground."] · items:[step 01 Sense, step 02 Detect, step 03 Verify, step 04 Alert] |
| `b-market` | `survey-feature` | kicker:[kicker "Market"] · headline:[headline "Climate has made early detection a line item, not a luxury."] · feature:[bars (TAM $28B, SAM $6.2B, SOM $310M)] · metrics:[] |
| `b-traction` | `survey-feature` | kicker:[kicker "Traction"] · headline:[headline "Every deployment makes the next ignition easier to catch."] · feature:[spark series:[3,7,14,23,38,61]] · metrics:[metric 61M / "acres under continuous watch", metric $2.8M / "ARR" / "+22% MoM", metric 11 / "utility & agency customers"] |
| `b-team` | `survey-grid` | kicker:[kicker "Team"] · headline:[headline "Built by people who've fought fire and flown the sensors."] · items:[person Ines, person Tomas, person Riya] |
| `b-ask` | `survey-stage` | kicker:[kicker "The ask"] · headline:[headline "Series A to blanket the American West before the next fire season."] · body:[points (4 allocation lines "… — 40%" …)] · aside:[metric $15M / "Series A" / "to scale the sensor mesh before the next fire season"] |

(Full copy is the cleaned content already in the current `deck.json` — reuse those exact strings.)

---

## File structure

| File | Change | Responsibility |
| --- | --- | --- |
| `apps/demo/blocks/survey/shell.tsx` | **create** | Shared `SurveyFx` (`@import` fonts + keyframes), helpers (`EMBER`, `SURVEY_MONO`, `surveyDisplay`, `Topo`, `SurveyChrome`, `SurveyShell`), and the 3 `registerLayout` calls. |
| `apps/demo/blocks/survey/blocks.tsx` | **create** | The 10 survey block components + their `registerBlock(..., schema)` calls. Imports helpers from `./shell.tsx`. |
| `apps/demo/blocks/index.tsx` | modify | Remove the entire Beacon section (helpers + 7 `Beacon*` components + 7 registrations); add `import './survey/shell.tsx';` and `import './survey/blocks.tsx';`. Leave the Pylon pack untouched. |
| `apps/demo/slides/beacon-pitch/deck.json` | modify | Recompose using the survey layouts/blocks per the table above. |
| `packages/core/skills/slide-authoring/SKILL.md` | modify | Add a "Compose, don't monolith" subsection to Custom blocks. |
| `packages/cli/template/.agents/skills/slide-authoring/SKILL.md` | modify | Mirror identically. |
| `.changeset/<name>.md` | **create** | core patch + cli patch. |

---

## Task 1: Survey shell module (Fx + helpers + 3 layouts)

**Files:** Create `apps/demo/blocks/survey/shell.tsx`.

Port the shared pieces from the existing Beacon code in `apps/demo/blocks/index.tsx`: `BeaconFx` → `SurveyFx`, `Topo` (verbatim), the footer from `SurveyFooter` → `SurveyChrome` (drop the per-slide `kicker` prop; use static text "Beacon" left, "Series A · 2026" right), `EMBER`, `SURVEY_MONO`, `surveyDisplay`. The `Survey` wrapper becomes `SurveyShell` (same backdrop: bg, `<SurveyFx/>`, `<Topo/>`, the vertical-stripe pattern overlay, padding `112px 120px 150px`, footer) but renders `{children}` instead of being block-specific.

- [ ] **Step 1: Create the shell + helpers**

Create `apps/demo/blocks/survey/shell.tsx`. Port `SurveyFx`, `Topo`, `surveyDisplay`, `EMBER`, `SURVEY_MONO`, and a `SurveyChrome` (static footer) from the Beacon source. Then add `SurveyShell`:

```tsx
import { registerLayout } from '@open-slide/core';
import type { CSSProperties, ReactNode } from 'react';

const EMBER = 'var(--osd-accent)';
const SURVEY_MONO = "'JetBrains Mono', ui-monospace, monospace";

// (port SurveyFx, Topo, surveyDisplay, SurveyChrome verbatim from the
//  BeaconFx/Topo/surveyDisplay/SurveyFooter functions in blocks/index.tsx;
//  SurveyChrome drops the kicker prop and shows a static middle label.)

function SurveyShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
        overflow: 'hidden',
      }}
    >
      <SurveyFx />
      <Topo />
      {/* vertical-stripe overlay — port from the Survey wrapper */}
      <div style={{ position: 'absolute', inset: 0, padding: '112px 120px 150px', boxSizing: 'border-box' }}>
        {children}
      </div>
      <SurveyChrome />
    </div>
  );
}
```

- [ ] **Step 2: Add the three layouts**

Append the `registerLayout` calls. Each composes `SurveyShell` + slot regions:

```tsx
function Kicker({ render }: { render: ReactNode }) {
  return <div style={{ marginBottom: 28 }}>{render}</div>;
}

registerLayout(
  'survey-stage',
  ({ renderSlot }) => {
    const aside = renderSlot('aside');
    const hasAside = Array.isArray(aside) ? aside.length > 0 : !!aside;
    return (
      <SurveyShell>
        <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: 32 }}>
          <div>{renderSlot('kicker')}</div>
          <div>{renderSlot('headline')}</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: hasAside ? '1.4fr 1fr' : '1fr',
              gap: 84,
              alignItems: 'center',
              minHeight: 0,
            }}
          >
            <div style={{ display: 'grid', gap: 28, alignContent: 'center' }}>{renderSlot('body')}</div>
            {hasAside && (
              <div style={{ borderLeft: `2px solid ${EMBER}`, paddingLeft: 72, display: 'grid', gap: 12 }}>
                {aside}
              </div>
            )}
          </div>
        </div>
      </SurveyShell>
    );
  },
  ['kicker', 'headline', 'body', 'aside'],
);

registerLayout(
  'survey-grid',
  ({ slide, renderSlot }) => {
    const n = Math.max(slide.slots.items?.length ?? 1, 1);
    return (
      <SurveyShell>
        <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: 40 }}>
          <div>{renderSlot('kicker')}</div>
          <div>{renderSlot('headline')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 36, alignContent: 'start' }}>
            {renderSlot('items')}
          </div>
        </div>
      </SurveyShell>
    );
  },
  ['kicker', 'headline', 'items'],
);

registerLayout(
  'survey-feature',
  ({ slide, renderSlot }) => {
    const m = Math.max(slide.slots.metrics?.length ?? 0, 0);
    return (
      <SurveyShell>
        <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto auto 1fr auto', gap: 36 }}>
          <div>{renderSlot('kicker')}</div>
          <div>{renderSlot('headline')}</div>
          <div style={{ minHeight: 0 }}>{renderSlot('feature')}</div>
          {m > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${m}, 1fr)`, gap: 90, borderTop: '1px solid var(--osd-border)', paddingTop: 36 }}>
              {renderSlot('metrics')}
            </div>
          )}
        </div>
      </SurveyShell>
    );
  },
  ['kicker', 'headline', 'feature', 'metrics'],
);
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: clean (the demo's tsconfig compiles the new file; `registerLayout` is exported from core).

- [ ] **Step 4: Commit**

```bash
git add apps/demo/blocks/survey/shell.tsx
git commit -m "feat(demo): add survey custom layouts + shared shell (composed Beacon)"
```

---

## Task 2: Survey text blocks (kicker, headline, text, points)

**Files:** Create `apps/demo/blocks/survey/blocks.tsx` (this task adds the four text blocks + their registrations; later tasks append more).

- [ ] **Step 1: Create blocks.tsx with the four text blocks**

```tsx
import { type Block, registerBlock } from '@open-slide/core';
import type { CSSProperties } from 'react';

const EMBER = 'var(--osd-accent)';
const SURVEY_MONO = "'JetBrains Mono', ui-monospace, monospace";
const str = (v: unknown, fallback = ''): string => (v == null ? fallback : String(v));
const display = (size: number, weight = 600): CSSProperties => ({
  fontFamily: 'var(--osd-font-display)',
  fontSize: size,
  fontWeight: weight,
  lineHeight: 1.04,
  letterSpacing: '-0.012em',
  margin: 0,
});

function SurveyKicker({ block }: { block: Block }) {
  return (
    <div
      style={{
        fontFamily: SURVEY_MONO,
        fontSize: 21,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: EMBER,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <span style={{ width: 34, height: 1.5, background: EMBER, display: 'inline-block' }} />
      <span data-osd-text="text">{str(block.props.text, 'Eyebrow')}</span>
    </div>
  );
}

function SurveyHeadline({ block }: { block: Block }) {
  const hero = block.props.scale === 'hero';
  return (
    <h2 style={{ ...display(hero ? 138 : 66, hero ? 600 : 600), maxWidth: 1300 }} data-osd-text="text">
      {str(block.props.text)}
    </h2>
  );
}

function SurveyText({ block }: { block: Block }) {
  return (
    <p style={{ fontSize: 33, lineHeight: 1.42, color: 'var(--osd-muted)', maxWidth: 980, margin: 0 }} data-osd-text="text">
      {str(block.props.text)}
    </p>
  );
}

function SurveyPoints({ block }: { block: Block }) {
  const items = Array.isArray(block.props.items) ? (block.props.items as string[]) : [];
  const problem = block.props.tone === 'problem';
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 18 }}>
      {items.map((pt, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: deck content order is identity
        <li key={i} style={{ display: 'flex', gap: 18, fontSize: 28, lineHeight: 1.4, alignItems: 'baseline' }}>
          <span style={{ fontFamily: SURVEY_MONO, fontSize: 20, color: EMBER, flexShrink: 0 }}>
            {problem ? '✕' : '◆'}
          </span>
          <span style={{ color: 'var(--osd-text)' }} data-osd-text={`items.${i}`}>
            {pt}
          </span>
        </li>
      ))}
    </ul>
  );
}

registerBlock('survey-kicker', SurveyKicker, [{ key: 'text', type: 'text', label: 'Text' }]);
registerBlock('survey-headline', SurveyHeadline, [
  { key: 'text', type: 'textarea', label: 'Text' },
  { key: 'scale', type: 'select', label: 'Scale', options: ['hero', 'h2'] },
]);
registerBlock('survey-text', SurveyText, [{ key: 'text', type: 'textarea', label: 'Text' }]);
registerBlock('survey-points', SurveyPoints, [
  { key: 'items', type: 'string-list', label: 'Items' },
  { key: 'tone', type: 'select', label: 'Tone', options: ['problem', 'solution'] },
]);
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/demo/blocks/survey/blocks.tsx
git commit -m "feat(demo): add survey text blocks (kicker, headline, text, points)"
```

---

## Task 3: Survey card blocks (metric, step, person)

**Files:** Modify `apps/demo/blocks/survey/blocks.tsx` (append).

Port the visuals from the Beacon metric (`figure`/`metrics`), step (`BeaconSteps` card), and person (`BeaconTeam` card) renderers, parameterized to a single item's props.

- [ ] **Step 1: Append the three card components + registrations**

```tsx
function SurveyMetric({ block }: { block: Block }) {
  const p = block.props;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ ...display(120, 700), color: EMBER, fontVariantNumeric: 'tabular-nums' }} data-osd-text="value">
        {str(p.value)}
      </div>
      {p.label != null && (
        <div style={{ fontFamily: SURVEY_MONO, fontSize: 24, color: 'var(--osd-text)' }} data-osd-text="label">
          {str(p.label)}
        </div>
      )}
      {p.caption != null && (
        <div style={{ fontSize: 24, color: 'var(--osd-muted)', lineHeight: 1.4, maxWidth: 440 }} data-osd-text="caption">
          {str(p.caption)}
        </div>
      )}
    </div>
  );
}

function SurveyStep({ block }: { block: Block }) {
  const p = block.props;
  return (
    <div
      style={{
        background: 'var(--osd-surface)',
        border: '1px solid var(--osd-border)',
        borderRadius: 'var(--osd-radius)',
        padding: 44,
        display: 'grid',
        gap: 22,
      }}
    >
      <div style={{ fontFamily: SURVEY_MONO, fontSize: 22, color: EMBER, letterSpacing: '0.14em' }} data-osd-text="n">
        {str(p.n, '01')}
      </div>
      <div style={display(42, 600)} data-osd-text="title">{str(p.title)}</div>
      <div style={{ fontSize: 26, lineHeight: 1.46, color: 'var(--osd-muted)' }} data-osd-text="desc">
        {str(p.desc)}
      </div>
    </div>
  );
}

function SurveyPerson({ block }: { block: Block }) {
  const p = block.props;
  const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return (
    <div
      style={{
        display: 'grid',
        gap: 24,
        padding: 40,
        background: 'var(--osd-surface)',
        border: '1px solid var(--osd-border)',
        borderRadius: 'var(--osd-radius)',
      }}
    >
      <div
        style={{
          width: 128,
          height: 128,
          borderRadius: '50%',
          background: 'var(--osd-bg)',
          border: `1.5px solid ${EMBER}`,
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--osd-font-display)',
          fontWeight: 700,
          fontSize: 50,
          color: EMBER,
        }}
      >
        {initials(str(p.name, '–'))}
      </div>
      <div>
        <div style={display(38, 600)} data-osd-text="name">{str(p.name)}</div>
        <div style={{ fontFamily: SURVEY_MONO, fontSize: 22, color: EMBER, marginTop: 8 }} data-osd-text="role">
          {str(p.role)}
        </div>
        <div style={{ fontSize: 23, color: 'var(--osd-muted)', marginTop: 12, lineHeight: 1.42 }} data-osd-text="prev">
          {str(p.prev)}
        </div>
      </div>
    </div>
  );
}

registerBlock('survey-metric', SurveyMetric, [
  { key: 'value', type: 'text', label: 'Value' },
  { key: 'label', type: 'text', label: 'Label' },
  { key: 'caption', type: 'textarea', label: 'Caption' },
]);
registerBlock('survey-step', SurveyStep, [
  { key: 'n', type: 'text', label: 'Number' },
  { key: 'title', type: 'text', label: 'Title' },
  { key: 'desc', type: 'textarea', label: 'Description' },
]);
registerBlock('survey-person', SurveyPerson, [
  { key: 'name', type: 'text', label: 'Name' },
  { key: 'role', type: 'text', label: 'Role' },
  { key: 'prev', type: 'textarea', label: 'Background' },
]);
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm typecheck` (expected clean), then:

```bash
git add apps/demo/blocks/survey/blocks.tsx
git commit -m "feat(demo): add survey card blocks (metric, step, person)"
```

---

## Task 4: Survey viz blocks (bars, spark, ping)

**Files:** Modify `apps/demo/blocks/survey/blocks.tsx` (append).

Port the bar chart from `BeaconMarket`, the sparkline path math from `BeaconTraction`, and the radar ping from `Ping`. These keep their internal arrays/series as single blocks (shared scale), so only the legend text is `data-osd-text`-tagged (one element per path); the SVG/chart internals stay untagged.

- [ ] **Step 1: Append the three viz components + registrations**

```tsx
function SurveyBars({ block }: { block: Block }) {
  const segments = (Array.isArray(block.props.segments) ? block.props.segments : []) as Array<{
    label?: string;
    value?: string;
    note?: string;
  }>;
  const heights = [560, 360, 200];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', alignItems: 'center', gap: 90, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 40, height: 560 }}>
        {segments.slice(0, 3).map((seg, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: chart order is identity
          <div key={i} style={{ display: 'grid', gap: 18, justifyItems: 'center', width: 150 }}>
            <div style={{ ...display(40, 700), color: EMBER, fontVariantNumeric: 'tabular-nums' }}>{str(seg.value)}</div>
            <div
              style={{
                width: 150,
                height: heights[i] ?? 160,
                borderRadius: '10px 10px 0 0',
                background: i === 0 ? EMBER : 'transparent',
                border: `1.5px solid ${EMBER}`,
                opacity: i === 0 ? 1 : 0.45,
              }}
            />
            <div style={{ fontFamily: SURVEY_MONO, fontSize: 22, color: EMBER }}>{str(seg.label)}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 22 }}>
        {segments.map((seg, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: legend order is identity
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto auto 1fr',
              gap: 18,
              alignItems: 'baseline',
              borderBottom: '1px solid var(--osd-border)',
              paddingBottom: 18,
            }}
          >
            <span style={{ fontFamily: SURVEY_MONO, fontSize: 22, color: EMBER, width: 64 }} data-osd-text={`segments.${i}.label`}>
              {str(seg.label)}
            </span>
            <span style={{ ...display(30, 700), fontVariantNumeric: 'tabular-nums' }} data-osd-text={`segments.${i}.value`}>
              {str(seg.value)}
            </span>
            <span style={{ fontSize: 25, color: 'var(--osd-muted)', lineHeight: 1.35 }} data-osd-text={`segments.${i}.note`}>
              {str(seg.note)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SurveySpark({ block }: { block: Block }) {
  const series = (Array.isArray(block.props.series) ? block.props.series : [2, 6, 11, 19, 34, 58]) as number[];
  const W = 1680;
  const H = 360;
  const max = Math.max(...series, 1);
  const pts = series.map((v, i) => [(i / Math.max(series.length - 1, 1)) * W, H - (v / max) * (H - 30)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }} preserveAspectRatio="none">
      <title>Coverage growth over time</title>
      <defs>
        <linearGradient id="survey-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--osd-accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--osd-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#survey-area)" />
      <path d={line} fill="none" stroke="var(--osd-accent)" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: point order is identity
        <circle key={i} cx={x} cy={y} r={6} fill="var(--osd-bg)" stroke="var(--osd-accent)" strokeWidth={3} />
      ))}
    </svg>
  );
}

// Port Ping from blocks/index.tsx (the radar ping); make size a prop.
function SurveyPing({ block }: { block: Block }) {
  const size = typeof block.props.size === 'number' ? block.props.size : 300;
  // ...port the Ping JSX, using `size`...
  return <div style={{ display: 'grid', placeItems: 'center' }}>{/* ping */}</div>;
}

registerBlock('survey-bars', SurveyBars);
registerBlock('survey-spark', SurveySpark, [{ key: 'caption', type: 'text', label: 'Caption' }]);
registerBlock('survey-ping', SurveyPing, [{ key: 'size', type: 'number', label: 'Size' }]);
```

(Port the full `Ping` body from the existing `Ping` function — the three `bcn-ping` rings + the `bcn-core` center dot — into `SurveyPing`, parameterized by `size`. Keep the keyframes in `SurveyFx`.)

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm typecheck` (expected clean), then:

```bash
git add apps/demo/blocks/survey/blocks.tsx
git commit -m "feat(demo): add survey viz blocks (bars, spark, ping)"
```

---

## Task 5: Register the pack + remove the old Beacon pack

**Files:** Modify `apps/demo/blocks/index.tsx`.

- [ ] **Step 1: Wire the survey pack in + delete the Beacon section**

At the top of `apps/demo/blocks/index.tsx`, add the side-effect imports (after the existing imports):

```tsx
import './survey/shell.tsx';
import './survey/blocks.tsx';
```

Then **delete** the entire Beacon section: the doc comment block introducing Beacon, the `EMBER`/`SURVEY_MONO` consts *that belong to Beacon*, `BeaconFx`, `surveyDisplay`, `Topo`, `Ping`, `SurveyFooter`, `Survey`, `Field`, the seven `Beacon*` components (`BeaconCover`…`BeaconAsk`), and the seven `registerBlock('beacon-*' …)` calls. **Leave the entire Pylon pack and its `registerLayout('stage', …)` untouched** (pylon-pitch still uses them).

- [ ] **Step 2: Verify no dangling references**

Run: `grep -n "beacon-\|Beacon" apps/demo/blocks/index.tsx`
Expected: no matches (all Beacon code removed; survey pack lives in `survey/`).

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: clean (no unused-symbol or missing-import errors).

- [ ] **Step 4: Commit**

```bash
git add apps/demo/blocks/index.tsx
git commit -m "refactor(demo): register survey pack; remove monolithic Beacon pack"
```

---

## Task 6: Recompose the deck

**Files:** Modify `apps/demo/slides/beacon-pitch/deck.json`.

- [ ] **Step 1: Rewrite deck.json per the composition table**

Keep `schemaVersion`, `meta.title` "Beacon", and the `design` block from the current file (warm palette + Fraunces/serif). Set `meta.createdAt` by running `node -e "console.log(new Date().toISOString())"` and pasting the output. Replace `slides` with the 8 slides from the composition table above, reusing the exact cleaned copy from the current deck.json. Every `slide.id` and `block.id` must be unique across the deck (e.g. `cover-kicker`, `cover-headline`, `cover-sub`, `cover-ping`, `problem-kicker`, …, `market-bars`, `traction-spark`, `traction-m1`…). The `survey-bars` `segments` and `survey-spark` `series` carry the array data:

```json
{ "id": "market-bars", "type": "survey-bars", "props": { "segments": [
  { "label": "TAM", "value": "$28B", "note": "Global wildfire detection, monitoring & resilience spend by 2030" },
  { "label": "SAM", "value": "$6.2B", "note": "Utilities, insurers & land agencies in fire-prone regions" },
  { "label": "SOM", "value": "$310M", "note": "Western U.S. utilities & state agencies, 3-year reachable" }
] } }
```

```json
{ "id": "traction-spark", "type": "survey-spark", "props": { "series": [3, 7, 14, 23, 38, 61] } }
```

- [ ] **Step 2: Validate structure**

Run (adjust the layout/slot/type sets to the survey pack):

```bash
node -e '
const d=require("./apps/demo/slides/beacon-pitch/deck.json");
const SLOTS={"survey-stage":["kicker","headline","body","aside"],"survey-grid":["kicker","headline","items"],"survey-feature":["kicker","headline","feature","metrics"]};
const ids=[];const errs=[];
for(const s of d.slides){ids.push(s.id);if(!SLOTS[s.layout])errs.push("layout "+s.layout);for(const slot of Object.keys(s.slots)){if(!SLOTS[s.layout]?.includes(slot))errs.push("slot "+slot+" on "+s.id);for(const b of s.slots[slot])ids.push(b.id);}}
const dupes=ids.filter((x,i)=>ids.indexOf(x)!==i);
console.log("slides",d.slides.length,"ids",ids.length,"unique",new Set(ids).size,"dupes",dupes,"errs",errs);
'
```

Expected: `dupes []  errs []`.

- [ ] **Step 3: Commit**

```bash
git add apps/demo/slides/beacon-pitch/deck.json
git commit -m "feat(demo): recompose beacon-pitch from survey layouts + small blocks"
```

---

## Task 7: Skill update (composed-custom pattern) + changeset

**Files:** Modify both `slide-authoring` SKILL.md copies (they are byte-identical); create a changeset.

- [ ] **Step 1: Add a "Compose, don't monolith" subsection**

In `packages/core/skills/slide-authoring/SKILL.md`, inside `## Custom blocks`, after the schema/`data-osd-text` guidance, add:

```markdown
### Compose, don't monolith

Prefer **many small custom blocks** over one big block that fills the slide. The editor selects, moves, and edits at the **block** level, so the granularity of your blocks is the granularity a user can manipulate. A single full-bleed block (`position:absolute; inset:0`) is one selectable unit with no editable internals — reserve it for genuinely single-unit slides (a cover, a section divider). Never stack two full-bleed blocks in one slot; they overlap invisibly.

- **Put cohesive backdrops/chrome in a custom *layout*, not a block.** Register a layout (via `registerLayout(name, Component, slots)`) that renders the ambient art (background, grid, footer, shared fonts/keyframes) and exposes named slots; place the editable pieces as small blocks in those slots. The backdrop can't be selected or stacked, and every content piece stays individually editable.
- **One block = one idea.** A metric card, a step card, a chart — each its own block. Arrays of cards become N sibling blocks in a slot (selectable individually); a chart that needs a shared scale (bars, a sparkline) stays one block.
- **Share fonts/animations once.** Inject `@font-face`/`@keyframes` from the layout (or a small shared `<style>` helper) so decomposed blocks still share the look.
```

- [ ] **Step 2: Mirror to the cli template + verify identical**

Apply the identical edit to `packages/cli/template/.agents/skills/slide-authoring/SKILL.md`, then:

Run: `diff packages/core/skills/slide-authoring/SKILL.md packages/cli/template/.agents/skills/slide-authoring/SKILL.md && echo IDENTICAL`
Expected: `IDENTICAL`.

- [ ] **Step 3: Create the changeset**

Create `.changeset/compose-dont-monolith.md`:

```markdown
---
"@open-slide/core": patch
"@open-slide/cli": patch
---

slide-authoring skill: teach the composed-custom pattern — prefer many small custom blocks in a custom layout over one monolithic full-bleed block.
```

- [ ] **Step 4: Commit**

```bash
git add packages/core/skills/slide-authoring/SKILL.md packages/cli/template/.agents/skills/slide-authoring/SKILL.md .changeset/compose-dont-monolith.md
git commit -m "docs(skills): teach the composed-custom blocks pattern"
```

---

## Task 8: Verification (gates + headless registry + CDP browser pass)

**Files:** none.

- [ ] **Step 1: Static gates**

```bash
pnpm typecheck   # clean
pnpm check       # biome clean (the survey/*.tsx files must pass)
```

If biome flags fixable issues, run `pnpm check:fix` and re-commit.

- [ ] **Step 2: Rebuild core dist (per the demo-build-requires-core-dist-rebuild memory)**

```bash
pnpm core build
```

- [ ] **Step 3: Headless registry check (catches the dual-React / dual-registry traps before a browser)**

Spin Vite in middleware mode, `ssrLoadModule('virtual:open-slide/blocks')` + `@open-slide/core`, and assert the new layouts/blocks are registered: `getLayout('survey-stage')`, `getLayout('survey-grid')`, `getLayout('survey-feature')`, and `getBlock('survey-metric')` / `getBlock('survey-bars')` are all defined, and the old `getBlock('beacon-cover')` is now `undefined`. (Reuse the harness described in the `verifying-the-running-app` memory; run from `packages/core`.)

- [ ] **Step 4: Real-browser CDP pass**

Start `pnpm dev` (note the printed port — kill stale listeners on 5173/5174 first). Drive `chrome-headless-shell` over the DevTools Protocol against `http://localhost:<port>/s/beacon-pitch?editor=next` and confirm:

1. **No console errors / exceptions** (no `invalid hook call`); the editor canvas mounts (`[data-osd-block-id]` present).
2. **Composition is real:** for each of the 8 slides (click the nav buttons), `document.querySelectorAll('[data-osd-block-id]').length` is **> 1** (cover ≥ 4: kicker, headline, sub, ping; how = 4 steps + kicker + headline; etc.) — proving the slide is no longer one monolithic block.
3. **Each piece selects independently:** clicking a single card (e.g. a `survey-metric` on the market/traction slide) selects just that block (ring around the card, not the whole slide).
4. **In-place edit still works** (M1c-1): double-click a `survey-points` item (`[data-osd-text^="items."]`), a `survey-metric` value, and a `survey-step` title → edits in place + persists to deck.json.
5. **Visuals survived:** screenshot the cover (ping accent + topo backdrop) and the market slide (bars) and confirm the warm-survey look is intact.

Restore any deck.json edits made during verification (`git checkout apps/demo/slides/beacon-pitch/deck.json`). Stop the dev server + chrome afterward.

- [ ] **Step 5: Report evidence**

Record the gate outputs, the per-slide block counts (proving composition), a screenshot path, and the persisted-edit proof. Per `verification-before-completion`: evidence before assertions.

---

## Self-review checklist

- **Coverage:** survey layouts (Task 1) ✓ · text blocks (Task 2) ✓ · card blocks (Task 3) ✓ · viz blocks (Task 4) ✓ · registration + Beacon removal (Task 5) ✓ · deck recompose (Task 6) ✓ · skill composed-custom guidance + changeset (Task 7) ✓ · verification incl. "every slide >1 block" + visuals (Task 8) ✓.
- **Composition goal:** every slide is now multiple selectable blocks over a layout-owned backdrop; no `position:absolute; inset:0` content blocks; backdrop is layout-level → un-stackable. ✓
- **Type/name consistency:** layout names (`survey-stage`/`survey-grid`/`survey-feature`) and block types (`survey-kicker`/`-headline`/`-text`/`-points`/`-metric`/`-step`/`-person`/`-bars`/`-spark`/`-ping`) match across the block components, registrations, the deck composition table, and the verification asserts. Slot names match each layout's registered slot list. ✓
- **data-osd-text contract:** one element per path; `survey-bars` tags the legend only; no SVG `<text>` tagged; numbers/derived (ping size, spark series, person initials) untagged. ✓
- **Changeset:** only the skill edit (core+cli) needs one; demo is private. ✓
