import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '@/lib/use-locale';
import type { DesignSystem } from '../../../app/lib/design.ts';
import { type Theme, themes } from '../../lib/themes';

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${id}-text`} className="text-[10.5px] text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={`${id}-color`}
          type="color"
          value={
            value.startsWith('#') && (value.length === 4 || value.length === 7) ? value : '#000000'
          }
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 shrink-0 cursor-pointer rounded-[3px] border border-border bg-background p-0.5"
        />
        <input
          id={`${id}-text`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-[4px] border border-border bg-background px-2 py-1 text-[11.5px] outline-none focus:border-foreground/40 focus:ring-1 focus:ring-ring/20"
        />
      </div>
    </div>
  );
}

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
  const t = useLocale();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(design);

  useEffect(() => {
    setDraft(design);
  }, [design]);

  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    },
    [],
  );

  const commitDebounced = useCallback(
    (next: DesignSystem) => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(() => onChange(next), 150);
    },
    [onChange],
  );

  const update = useCallback(
    (next: DesignSystem) => {
      setDraft(next);
      commitDebounced(next);
    },
    [commitDebounced],
  );

  const inputCls =
    'w-full rounded-[4px] border border-border bg-background px-2 py-1 text-[11.5px] outline-none focus:border-foreground/40 focus:ring-1 focus:ring-ring/20';

  const setPalette = (key: keyof DesignSystem['palette'], value: string) => {
    update({ ...draft, palette: { ...draft.palette, [key]: value } });
  };

  const setFont = (key: keyof DesignSystem['fonts'], value: string) => {
    update({ ...draft, fonts: { ...draft.fonts, [key]: value } });
  };

  const setTypeScale = (key: keyof DesignSystem['typeScale'], raw: string) => {
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      update({ ...draft, typeScale: { ...draft.typeScale, [key]: n } });
    }
  };

  const setRadius = (raw: string) => {
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      update({ ...draft, radius: n });
    }
  };

  const setSpace = (raw: string) => {
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      update({ ...draft, space: n });
    }
  };

  const setShadow = (value: string) => {
    update({ ...draft, shadow: value });
  };

  return (
    <div className="flex flex-col divide-y divide-hairline border-t border-hairline">
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between px-3 text-left hover:bg-muted/40"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-[11.5px] font-medium">Design</span>
        <span className="text-[10px] text-muted-foreground">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-0 divide-y divide-hairline">
          {/* Themes */}
          <div className="flex flex-col gap-2.5 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="eyebrow">{t.themes.pickTheme}</span>
              <span aria-hidden className="h-px flex-1 bg-hairline" />
            </div>
            {themes.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onApplyTheme(theme)}
                    title={theme.name}
                    aria-label={`${t.themes.applyTheme}: ${theme.name}`}
                    className="flex items-center gap-1.5 rounded-[4px] border border-border bg-background px-2 py-1.5 text-left hover:border-foreground/40"
                  >
                    <span className="flex shrink-0">
                      {(['bg', 'accent', 'text'] as const).map((k) => (
                        <span
                          key={k}
                          className="size-3 rounded-full ring-1 ring-foreground/10"
                          style={{
                            background: theme.design.palette[k],
                            marginLeft: k === 'bg' ? 0 : -4,
                          }}
                        />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px]">{theme.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const name = window.prompt(t.themes.saveThemePrompt);
                if (name?.trim()) onSaveTheme(name.trim());
              }}
              className="rounded-[4px] border border-dashed border-border px-2 py-1.5 text-[11px] text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            >
              {t.themes.saveAsTheme}
            </button>
          </div>

          {/* Palette */}
          <div className="flex flex-col gap-2.5 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="eyebrow">Palette</span>
              <span aria-hidden className="h-px flex-1 bg-hairline" />
            </div>
            <ColorField
              id="design-bg"
              label="Background"
              value={draft.palette.bg}
              onChange={(v) => setPalette('bg', v)}
            />
            <ColorField
              id="design-surface"
              label="Surface"
              value={draft.palette.surface}
              onChange={(v) => setPalette('surface', v)}
            />
            <ColorField
              id="design-text"
              label="Text"
              value={draft.palette.text}
              onChange={(v) => setPalette('text', v)}
            />
            <ColorField
              id="design-muted"
              label="Muted"
              value={draft.palette.muted}
              onChange={(v) => setPalette('muted', v)}
            />
            <ColorField
              id="design-accent"
              label="Accent"
              value={draft.palette.accent}
              onChange={(v) => setPalette('accent', v)}
            />
            <ColorField
              id="design-border"
              label="Border"
              value={draft.palette.border}
              onChange={(v) => setPalette('border', v)}
            />
          </div>

          {/* Fonts */}
          <div className="flex flex-col gap-2.5 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="eyebrow">Fonts</span>
              <span aria-hidden className="h-px flex-1 bg-hairline" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="design-font-display" className="text-[10.5px] text-muted-foreground">
                Display
              </label>
              <input
                id="design-font-display"
                type="text"
                className={inputCls}
                value={draft.fonts.display}
                onChange={(e) => setFont('display', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="design-font-body" className="text-[10.5px] text-muted-foreground">
                Body
              </label>
              <input
                id="design-font-body"
                type="text"
                className={inputCls}
                value={draft.fonts.body}
                onChange={(e) => setFont('body', e.target.value)}
              />
            </div>
          </div>

          {/* Type scale */}
          <div className="flex flex-col gap-2.5 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="eyebrow">Type scale</span>
              <span aria-hidden className="h-px flex-1 bg-hairline" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex flex-col gap-1">
                <label htmlFor="design-scale-hero" className="text-[10.5px] text-muted-foreground">
                  Hero (px)
                </label>
                <input
                  id="design-scale-hero"
                  type="number"
                  className={inputCls}
                  value={draft.typeScale.hero}
                  onChange={(e) => setTypeScale('hero', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="design-scale-heading"
                  className="text-[10.5px] text-muted-foreground"
                >
                  Heading (px)
                </label>
                <input
                  id="design-scale-heading"
                  type="number"
                  className={inputCls}
                  value={draft.typeScale.heading}
                  onChange={(e) => setTypeScale('heading', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="design-scale-body" className="text-[10.5px] text-muted-foreground">
                  Body (px)
                </label>
                <input
                  id="design-scale-body"
                  type="number"
                  className={inputCls}
                  value={draft.typeScale.body}
                  onChange={(e) => setTypeScale('body', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="design-scale-caption"
                  className="text-[10.5px] text-muted-foreground"
                >
                  Caption (px)
                </label>
                <input
                  id="design-scale-caption"
                  type="number"
                  className={inputCls}
                  value={draft.typeScale.caption}
                  onChange={(e) => setTypeScale('caption', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Shape & elevation */}
          <div className="flex flex-col gap-2.5 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="eyebrow">Shape &amp; elevation</span>
              <span aria-hidden className="h-px flex-1 bg-hairline" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex flex-col gap-1">
                <label htmlFor="design-radius" className="text-[10.5px] text-muted-foreground">
                  Radius (px)
                </label>
                <input
                  id="design-radius"
                  type="number"
                  className={inputCls}
                  value={draft.radius}
                  onChange={(e) => setRadius(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="design-space" className="text-[10.5px] text-muted-foreground">
                  Spacing (px)
                </label>
                <input
                  id="design-space"
                  type="number"
                  className={inputCls}
                  value={draft.space}
                  onChange={(e) => setSpace(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="design-shadow" className="text-[10.5px] text-muted-foreground">
                Shadow (CSS)
              </label>
              <input
                id="design-shadow"
                type="text"
                className={inputCls}
                value={draft.shadow}
                onChange={(e) => setShadow(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
