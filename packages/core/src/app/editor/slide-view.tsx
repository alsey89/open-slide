import { memo } from 'react';
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

export const BlockView = memo(function BlockView({ block }: BlockViewProps) {
  const Component = getBlock(block.type);
  return (
    <div data-osd-block-id={block.id} style={{ display: 'contents' }}>
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
