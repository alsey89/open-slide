import { memo, useEffect, useRef } from 'react';
import { UnknownBlock } from '../../doc/blocks/index.ts';
import { MissingLayout } from '../../doc/layouts/index.ts';
import type { Block, Slide } from '../../doc/model.ts';
import { getBlock, getLayout } from '../../doc/registry.ts';

export type BlockViewProps = {
  block: Block;
  editingField: string | null;
  onCommitEdit: (value: string) => void;
  onCancelEdit: () => void;
};

export const BlockView = memo(function BlockView({
  block,
  editingField,
  onCommitEdit,
  onCancelEdit,
}: BlockViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: block.id keys the editable target; onCommitEdit/onCancelEdit are stable store methods. We intentionally re-run only when the edited field or block identity changes — not on every block prop change (which would fight the caret).
  useEffect(() => {
    if (editingField === null) return;
    const el = ref.current?.querySelector(
      `[data-osd-text="${CSS.escape(editingField)}"]`,
    ) as HTMLElement | null;
    if (!el) return;

    el.contentEditable = 'plaintext-only';
    el.focus();
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    const initial = el.innerText;
    let finished = false;
    let cancelled = false;
    // Commit/cancel exactly once. Also called from cleanup so navigating away
    // mid-edit (unmount before blur fires) doesn't silently drop typed text.
    const finish = () => {
      if (finished) return;
      finished = true;
      el.contentEditable = 'inherit';
      if (cancelled || el.innerText === initial) onCancelEdit();
      else onCommitEdit(el.innerText);
    };
    const onBlur = () => finish();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        el.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelled = true;
        el.blur();
      }
    };
    el.addEventListener('blur', onBlur);
    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('blur', onBlur);
      el.removeEventListener('keydown', onKeyDown);
      finish();
    };
  }, [editingField, block.id, onCommitEdit, onCancelEdit]);

  const Component = getBlock(block.type);
  return (
    <div ref={ref} data-osd-block-id={block.id} style={{ display: 'contents' }}>
      {Component ? <Component block={block} /> : <UnknownBlock type={block.type} />}
    </div>
  );
});

export function SlideView({
  slide,
  editing,
  onCommitEdit,
  onCancelEdit,
}: {
  slide: Slide;
  editing: { blockId: string; field: string } | null;
  onCommitEdit: (value: string) => void;
  onCancelEdit: () => void;
}) {
  const entry = getLayout(slide.layout);
  if (!entry) return <MissingLayout layout={slide.layout} />;
  const Layout = entry.component;
  const renderSlot = (name: string) =>
    (slide.slots[name] ?? []).map((b) => (
      <BlockView
        key={b.id}
        block={b}
        editingField={editing?.blockId === b.id ? editing.field : null}
        onCommitEdit={onCommitEdit}
        onCancelEdit={onCancelEdit}
      />
    ));
  return <Layout slide={slide} renderSlot={renderSlot} />;
}
