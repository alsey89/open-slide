import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { DeckHost } from './deck-host.ts';
import { EditorCanvas } from './editor-canvas.tsx';
import { useEditor } from './use-editor.ts';

export function EditorShell({ host, deckId }: { host: DeckHost; deckId: string }) {
  const { store, state, loadError } = useEditor(host, deckId);
  const [index, setIndex] = useState(0);
  const [titleDraft, setTitleDraft] = useState('');
  const committedTitle = state?.deck.meta.title ?? '';
  useEffect(() => {
    setTitleDraft(committedTitle);
  }, [committedTitle]);

  useEffect(() => {
    if (!store) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        !!target?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (!typing && mod && (e.key === 'z' || e.key === 'Z')) {
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
          value={titleDraft}
          placeholder="Untitled deck"
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => {
            if (titleDraft !== committedTitle) {
              store.apply({ kind: 'set-deck-title', title: titleDraft });
            }
          }}
        />
        <span className="text-xs text-muted-foreground" data-osd-save-state={state.saveState}>
          {state.saveState === 'saving'
            ? 'Saving…'
            : state.saveState === 'error'
              ? 'Save failed'
              : 'Saved'}
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
              onClick={() => {
                setIndex(i);
                store.select(null);
              }}
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
