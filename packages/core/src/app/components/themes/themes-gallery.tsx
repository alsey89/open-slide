import { format, useLocale } from '@/lib/use-locale';
import { ThemeSample } from '../../lib/theme-sample';
import { type Theme, themes } from '../../lib/themes';
import { SlideCanvas } from '../slide-canvas';

export function ThemesGallery({ onOpen }: { onOpen: (id: string) => void }) {
  const t = useLocale();

  if (themes.length === 0) {
    return <ThemesEmptyState />;
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-x-6 gap-y-9 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
      {themes.map((theme) => (
        <li key={theme.id}>
          <ThemeCard
            theme={theme}
            onOpen={() => onOpen(theme.id)}
            ariaLabel={format(t.themes.openThemeAria, { name: theme.name })}
          />
        </li>
      ))}
    </ul>
  );
}

function ThemeCard({
  theme,
  onOpen,
  ariaLabel,
}: {
  theme: Theme;
  onOpen: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className="group block w-full text-left focus-visible:outline-none"
    >
      <div className="relative aspect-video overflow-hidden rounded-[6px] border border-hairline bg-card shadow-edge ring-1 ring-foreground/[0.04] group-hover:shadow-floating group-hover:ring-foreground/20 motion-safe:transition-[box-shadow,--tw-ring-color] motion-safe:duration-200">
        <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]">
          <SlideCanvas flat freezeMotion design={theme.design}>
            <ThemeSample />
          </SlideCanvas>
        </div>
      </div>
      <div className="mt-3">
        <h3 className="min-w-0 truncate font-heading text-[14px] font-medium tracking-tight">
          {theme.name}
        </h3>
      </div>
      {theme.description ? (
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
          {theme.description}
        </p>
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
        <p className="mt-3 font-heading text-[15px] font-semibold tracking-tight">
          {t.themes.noThemesTitle}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {t.themes.noThemesHintPrefix}
          <code className="rounded-[4px] bg-muted px-1.5 py-0.5 font-mono text-[11.5px] text-foreground">
            /create-theme
          </code>
          {t.themes.noThemesHintSuffix}
        </p>
      </div>
    </div>
  );
}
