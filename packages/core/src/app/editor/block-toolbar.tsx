import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { duplicateBlockOp, moveBlockOp } from './block-ops.ts';
import type { EditorState, EditorStore } from './editor-store.ts';

export function BlockToolbar({
  store,
  state,
  containerRef,
}: {
  store: EditorStore;
  state: EditorState;
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const id = state.selectedBlockId;
  if (!id || state.editing) return null;
  const container = containerRef.current;
  const blockEl = container?.querySelector(`[data-osd-block-id="${CSS.escape(id)}"]`);
  const target = (blockEl?.firstElementChild as HTMLElement | null) ?? null;
  if (!container || !target) return null;

  const cRect = container.getBoundingClientRect();
  const bRect = target.getBoundingClientRect();
  const top = bRect.top - cRect.top - 40;
  const left = bRect.left - cRect.left;

  const move = (dir: 'up' | 'down') => {
    const op = moveBlockOp(state.deck, id, dir);
    if (op) store.apply(op);
  };
  const duplicate = () => {
    const op = duplicateBlockOp(state.deck, id);
    if (op) {
      store.apply(op);
      if (op.kind === 'add-block') store.select(op.block.id);
    }
  };
  const remove = () => {
    store.apply({ kind: 'remove-block', blockId: id });
    store.select(null);
  };

  return (
    <div
      style={{ position: 'absolute', top: Math.max(0, top), left: Math.max(0, left), zIndex: 10 }}
      className="flex items-center gap-0.5 rounded-md border border-border bg-popover p-0.5 shadow-md"
    >
      <button
        type="button"
        className="rounded p-1 hover:bg-muted"
        title="Move up"
        onClick={() => move('up')}
      >
        <ArrowUp className="size-3.5" />
      </button>
      <button
        type="button"
        className="rounded p-1 hover:bg-muted"
        title="Move down"
        onClick={() => move('down')}
      >
        <ArrowDown className="size-3.5" />
      </button>
      <button
        type="button"
        className="rounded p-1 hover:bg-muted"
        title="Duplicate"
        onClick={duplicate}
      >
        <Copy className="size-3.5" />
      </button>
      <button
        type="button"
        className="rounded p-1 text-destructive hover:bg-muted"
        title="Delete"
        onClick={remove}
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
