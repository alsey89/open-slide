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
  // renderDeck allocates fresh Page function identities each call, so an edit remounts
  // the canvas subtree. Harmless in M1a (nothing focusable renders inside the canvas);
  // M1b's in-canvas text editing must memoize Page identity per slide.id to keep caret.
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: state.deck and index re-render the canvas DOM the effect queries, so the highlight must re-apply when they change.
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
      {/* biome-ignore lint/a11y/noStaticElementInteractions: canvas click-to-select is intentionally a plain div — no semantic role fits this pattern */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard block selection via shell keydown handler; click-to-select on canvas is a pointer convenience */}
      <div ref={rootRef} onClick={onClick} style={{ width: '100%', height: '100%' }}>
        {Page ? <Page /> : null}
      </div>
    </SlideCanvas>
  );
}
