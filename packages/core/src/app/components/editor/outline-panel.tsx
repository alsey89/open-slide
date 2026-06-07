import { useEffect, useMemo, useRef, useState } from 'react';
import type { DesignSystem } from '../../../app/lib/design.ts';
import type { Deck } from '../../../doc/model.ts';
import type { EditOp } from '../../../doc/ops.ts';
import { listLayouts } from '../../../doc/registry.ts';
import type { Theme } from '../../lib/themes';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { DesignPanel } from './design-panel.tsx';
import { cloneSlideWithFreshIds, freshId } from './ids.ts';

const FALLBACK_LAYOUTS = ['title', 'section', 'title-body', 'two-col', 'media-text'];

function getSlidePreviewText(slide: Deck['slides'][number]): string {
  for (const blocks of Object.values(slide.slots)) {
    for (const block of blocks) {
      if ((block.type === 'heading' || block.type === 'text') && block.props.text) {
        const text = String(block.props.text);
        return text.length > 32 ? `${text.slice(0, 32)}…` : text;
      }
    }
  }
  return '';
}

export function OutlinePanel({
  deck,
  index,
  onIndexChange,
  onApply,
  onDesignChange,
  onApplyTheme,
  onSaveTheme,
}: {
  deck: Deck;
  index: number;
  onIndexChange: (i: number) => void;
  onApply: (op: EditOp | EditOp[]) => void;
  onDesignChange: (design: DesignSystem) => void;
  onApplyTheme: (theme: Theme) => void;
  onSaveTheme: (name: string) => void;
}) {
  const slides = deck.slides;
  const currentSlide = slides[index];

  const layouts = useMemo(() => {
    const all = listLayouts().map((l) => l.type);
    return all.length > 0 ? all : FALLBACK_LAYOUTS;
  }, []);

  const [titleValue, setTitleValue] = useState(deck.meta.title ?? '');
  const [notesValue, setNotesValue] = useState(currentSlide?.notes ?? '');
  const [addLayout, setAddLayout] = useState<string>('title-body');

  const prevDeckTitleRef = useRef(deck.meta.title ?? '');
  const prevSlideIdRef = useRef(currentSlide?.id ?? '');
  const prevSlideNotesRef = useRef(currentSlide?.notes ?? '');

  useEffect(() => {
    const incoming = deck.meta.title ?? '';
    if (incoming !== prevDeckTitleRef.current) {
      setTitleValue(incoming);
      prevDeckTitleRef.current = incoming;
    }
  }, [deck.meta.title]);

  useEffect(() => {
    const slideId = currentSlide?.id ?? '';
    const notes = currentSlide?.notes ?? '';
    if (slideId !== prevSlideIdRef.current || notes !== prevSlideNotesRef.current) {
      setNotesValue(notes);
      prevSlideIdRef.current = slideId;
      prevSlideNotesRef.current = notes;
    }
  }, [currentSlide?.id, currentSlide?.notes]);

  const handleTitleBlur = () => {
    if (titleValue !== (deck.meta.title ?? '')) {
      onApply({ kind: 'set-deck-title', title: titleValue });
    }
  };

  const handleNotesBlur = () => {
    if (!currentSlide) return;
    const prev = currentSlide.notes ?? '';
    if (notesValue !== prev) {
      onApply({
        kind: 'set-slide-notes',
        slideId: currentSlide.id,
        notes: notesValue || undefined,
      });
    }
  };

  const handleLayoutChange = (layout: string) => {
    if (!currentSlide) return;
    onApply({ kind: 'set-slide-layout', slideId: currentSlide.id, layout });
  };

  const handleMoveUp = (i: number) => {
    const slide = slides[i];
    if (!slide || i === 0) return;
    onApply({ kind: 'move-slide', slideId: slide.id, toIndex: i - 1 });
    onIndexChange(i - 1);
  };

  const handleMoveDown = (i: number) => {
    const slide = slides[i];
    if (!slide || i >= slides.length - 1) return;
    onApply({ kind: 'move-slide', slideId: slide.id, toIndex: i + 1 });
    onIndexChange(i + 1);
  };

  const handleDuplicate = (i: number) => {
    const slide = slides[i];
    if (!slide) return;
    const clone = cloneSlideWithFreshIds(slide);
    onApply({ kind: 'add-slide', index: i + 1, slide: clone });
    onIndexChange(i + 1);
  };

  const handleDelete = (i: number) => {
    const slide = slides[i];
    if (!slide || slides.length <= 1) return;
    onApply({ kind: 'remove-slide', slideId: slide.id });
    onIndexChange(Math.min(i, slides.length - 2));
  };

  const handleAddSlide = () => {
    const newSlide = {
      id: freshId('s'),
      layout: addLayout,
      slots: {},
    };
    onApply({ kind: 'add-slide', index: slides.length, slide: newSlide });
    onIndexChange(slides.length);
  };

  const inputCls =
    'w-full rounded-[4px] border border-border bg-background px-2 py-1 text-[11.5px] outline-none focus:border-foreground/40 focus:ring-1 focus:ring-ring/20';

  const btnCls =
    'rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40';

  const destructBtnCls =
    'rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-hairline bg-sidebar">
      <div className="flex h-9 shrink-0 items-center border-b border-hairline px-3">
        <span className="text-[11.5px] font-medium">Outline</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0 divide-y divide-hairline">
          {/* Deck title */}
          <div className="flex flex-col gap-1.5 px-3 py-3">
            <label htmlFor="outline-deck-title" className="text-[10.5px] text-muted-foreground">
              Deck title
            </label>
            <input
              id="outline-deck-title"
              className={inputCls}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Untitled"
            />
          </div>

          {/* Slide list */}
          <div className="flex flex-col py-1">
            {slides.map((slide, i) => {
              const isActive = i === index;
              const preview = getSlidePreviewText(slide);
              return (
                <div
                  key={slide.id}
                  className={`flex flex-col gap-1 px-3 py-2 ${isActive ? 'bg-accent' : 'hover:bg-muted/50'}`}
                >
                  {/* biome-ignore lint/a11y/useKeyWithClickEvents: list navigation; keyboard handled by move buttons */}
                  {/* biome-ignore lint/a11y/noStaticElementInteractions: intentional click-to-select row */}
                  <div className="cursor-pointer select-none" onClick={() => onIndexChange(i)}>
                    <span className="block text-[11.5px] font-medium leading-tight">
                      {i + 1}. {slide.layout}
                    </span>
                    {preview && (
                      <span className="block truncate text-[10.5px] text-muted-foreground leading-tight mt-0.5">
                        {preview}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        className={btnCls}
                        disabled={i === 0}
                        onClick={() => handleMoveUp(i)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={btnCls}
                        disabled={i >= slides.length - 1}
                        onClick={() => handleMoveDown(i)}
                      >
                        ↓
                      </button>
                      <button type="button" className={btnCls} onClick={() => handleDuplicate(i)}>
                        Dup
                      </button>
                      <button
                        type="button"
                        className={destructBtnCls}
                        disabled={slides.length <= 1}
                        onClick={() => handleDelete(i)}
                      >
                        Del
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add slide */}
          <div className="flex flex-col gap-1.5 px-3 py-3">
            <span className="text-[10.5px] text-muted-foreground">Add slide</span>
            <select
              value={addLayout}
              onChange={(e) => setAddLayout(e.target.value)}
              className="h-7 w-full rounded-[4px] border border-border bg-background px-1.5 text-[11px] outline-none focus:border-foreground/40"
            >
              {layouts.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddSlide}
              className="flex h-7 items-center justify-center rounded-[4px] border border-border bg-background text-[11px] hover:bg-muted"
            >
              + Add slide
            </button>
          </div>

          {/* Current slide settings */}
          {currentSlide && (
            <div className="flex flex-col gap-3 px-3 py-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="outline-slide-layout"
                  className="text-[10.5px] text-muted-foreground"
                >
                  Layout
                </label>
                <select
                  id="outline-slide-layout"
                  value={currentSlide.layout}
                  onChange={(e) => handleLayoutChange(e.target.value)}
                  className="h-7 w-full rounded-[4px] border border-border bg-background px-1.5 text-[11px] outline-none focus:border-foreground/40"
                >
                  {layouts.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="outline-slide-notes"
                  className="text-[10.5px] text-muted-foreground"
                >
                  Notes
                </label>
                <textarea
                  id="outline-slide-notes"
                  className="w-full resize-y rounded-[4px] border border-border bg-background px-2 py-1.5 text-[11.5px] outline-none focus:border-foreground/40 focus:ring-1 focus:ring-ring/20 min-h-[60px]"
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Speaker notes…"
                />
              </div>
            </div>
          )}

          {/* Design tokens */}
          <DesignPanel
            design={deck.design}
            onChange={onDesignChange}
            onApplyTheme={onApplyTheme}
            onSaveTheme={onSaveTheme}
          />
        </div>
      </ScrollArea>
    </aside>
  );
}
