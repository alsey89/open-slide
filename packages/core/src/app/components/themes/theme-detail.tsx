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
        <h2 className="font-heading text-[26px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[32px]">
          {theme.name}
        </h2>
        {theme.description ? (
          <p className="basis-full text-[13px] leading-relaxed text-muted-foreground">
            {theme.description}
          </p>
        ) : null}
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
                  <span
                    aria-hidden
                    className="inline-block size-4 rounded-[3px] ring-1 ring-foreground/15"
                    style={{ background: d.palette[k] }}
                  />
                  <span className="font-mono text-[10.5px] text-muted-foreground">
                    {k} {d.palette[k]}
                  </span>
                </div>
              ))}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[11px] text-muted-foreground">
              <div>
                <dt className="inline text-foreground/80">display</dt>: {d.fonts.display}
              </div>
              <div>
                <dt className="inline text-foreground/80">body</dt>: {d.fonts.body}
              </div>
              <div>
                <dt className="inline text-foreground/80">hero/heading/body/caption</dt>:{' '}
                {d.typeScale.hero}/{d.typeScale.heading}/{d.typeScale.body}/{d.typeScale.caption}px
              </div>
              <div>
                <dt className="inline text-foreground/80">radius/space</dt>: {d.radius}/{d.space}px
              </div>
            </dl>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="eyebrow">{t.themes.usedBy}</span>
            {usedBySlideIds.length > 0 ? (
              <span className="folio">{usedBySlideIds.length.toString().padStart(2, '0')}</span>
            ) : null}
          </div>
          {usedBySlideIds.length === 0 ? (
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              {t.themes.usedByEmpty}
            </p>
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
    loadSlide(id)
      .then((mod) => {
        if (!cancelled) setSlide(mod);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
          <div className="grid h-full w-full place-items-center text-[10px] tracking-[0.16em] uppercase text-muted-foreground/60">
            {t.common.loading}
          </div>
        )}
      </div>
      <div className="mt-2.5">
        <h3 className="min-w-0 truncate font-heading text-[13px] font-medium tracking-tight">
          {displayTitle}
        </h3>
        <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground/80">{id}</p>
      </div>
    </Link>
  );
}
