import type { Block } from '../model.ts';

export function Text({ block }: { block: Block }) {
  return (
    <p
      data-osd-text="text"
      style={{
        fontFamily: 'var(--osd-font-body)',
        fontSize: 'var(--osd-size-body)',
        color: 'var(--osd-text)',
        lineHeight: 1.6,
        margin: 0,
      }}
    >
      {String(block.props.text ?? '')}
    </p>
  );
}
