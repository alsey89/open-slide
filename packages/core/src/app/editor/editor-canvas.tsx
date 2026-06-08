import { type MouseEvent, useEffect, useRef } from 'react';
import { SlideCanvas } from '@/components/slide-canvas';
import { normalizeDesign } from '../../doc/design.ts';
import { BlockToolbar } from './block-toolbar.tsx';
import type { EditorState, EditorStore } from './editor-store.ts';
import { SlideView } from './slide-view.tsx';

export function EditorCanvas({
  store,
  state,
  index,
}: {
  store: EditorStore;
  state: EditorState;
  index: number;
}) {
  const slide = state.deck.slides[index];
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest('[data-osd-block-id]');
    store.select(el?.getAttribute('data-osd-block-id') ?? null);
  };

  const onDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    const textEl = (e.target as HTMLElement).closest('[data-osd-text]');
    if (!textEl) return;
    const path = textEl.getAttribute('data-osd-text');
    const blockEl = textEl.closest('[data-osd-block-id]');
    const blockId = blockEl?.getAttribute('data-osd-block-id');
    if (path && blockId) store.startEdit(blockId, path);
  };

  // Block wrappers are display:contents (no box), so outline the wrapper's
  // firstElementChild. Cleared/re-applied whenever selection or content changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: state.deck and index re-render the canvas DOM the effect queries, so the ring must re-apply when they change.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    for (const el of root.querySelectorAll('[data-osd-block-id]')) {
      const selected = el.getAttribute('data-osd-block-id') === state.selectedBlockId;
      const target = (el.firstElementChild as HTMLElement | null) ?? (el as HTMLElement);
      target.style.outline = selected ? '2px solid var(--osd-accent, #4f7cff)' : '';
      target.style.outlineOffset = selected ? '-2px' : '';
    }
  }, [state.selectedBlockId, state.deck, index]);

  if (!slide) return null;

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <SlideCanvas design={normalizeDesign(state.deck.design)}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: canvas click/double-click to select/edit is intentionally a plain div — no semantic role fits this pattern */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard editing is handled by the shell keydown handler + contentEditable; canvas pointer handlers are a convenience */}
        <div
          ref={rootRef}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          style={{ width: '100%', height: '100%' }}
        >
          <SlideView
            slide={slide}
            editing={state.editing}
            onCommitEdit={store.commitEdit}
            onCancelEdit={store.cancelEdit}
          />
        </div>
      </SlideCanvas>
      <BlockToolbar store={store} state={state} containerRef={containerRef} />
    </div>
  );
}
