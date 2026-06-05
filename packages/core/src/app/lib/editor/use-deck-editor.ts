import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Deck } from '../../../doc/model.ts';
import type { EditOp } from '../../../doc/ops.ts';
import { applyOps } from '../../../doc/ops.ts';
import { loadDeckRaw } from '../slides.ts';
import { postOps } from './edit-client.ts';
import { createOpFlusher, type FlushState } from './op-flusher.ts';

export type DeckEditor = {
  deck: Deck | null;
  error: string | null;
  saveState: FlushState;
  selectedBlockId: string | null;
  select: (blockId: string | null) => void;
  apply: (ops: EditOp | EditOp[]) => void;
};

export function useDeckEditor(slideId: string): DeckEditor {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<FlushState>('idle');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const flusherRef = useRef<ReturnType<typeof createOpFlusher> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDeck(null);
    setError(null);
    loadDeckRaw(slideId)
      .then((d) => {
        if (!cancelled) setDeck(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [slideId]);

  useEffect(() => {
    const flusher = createOpFlusher({
      flush: (ops) => postOps(slideId, ops),
      onState: (s, e) => {
        setSaveState(s);
        if (s === 'error' && e) setError(e);
      },
    });
    flusherRef.current = flusher;
    return () => {
      flusher.dispose();
      flusherRef.current = null;
    };
  }, [slideId]);

  const apply = useCallback((ops: EditOp | EditOp[]) => {
    const list = Array.isArray(ops) ? ops : [ops];
    if (list.length === 0) return;
    let ok = true;
    setDeck((d) => {
      if (!d) return d;
      try {
        return applyOps(d, list);
      } catch (e) {
        ok = false;
        setError(e instanceof Error ? e.message : String(e));
        return d;
      }
    });
    if (ok) flusherRef.current?.enqueue(list);
  }, []);

  const select = useCallback((blockId: string | null) => setSelectedBlockId(blockId), []);

  return useMemo(
    () => ({ deck, error, saveState, selectedBlockId, select, apply }),
    [deck, error, saveState, selectedBlockId, select, apply],
  );
}
