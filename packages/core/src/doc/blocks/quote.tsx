import type { Block } from '../model.ts';

export function Quote({ block }: { block: Block }) {
  const text = String(block.props.text ?? '');
  const attribution = block.props.attribution ? String(block.props.attribution) : null;
  return (
    <figure style={{ margin: 0, display: 'grid', gap: 24 }}>
      <blockquote
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 'calc(var(--osd-size-body) * 1.6)',
          color: 'var(--osd-text)',
          lineHeight: 1.3,
          margin: 0,
        }}
      >
        {'“'}
        <span data-osd-text="text">{text}</span>
        {'”'}
      </blockquote>
      {attribution && (
        <figcaption
          style={{
            fontFamily: 'var(--osd-font-body)',
            fontSize: 'var(--osd-size-body)',
            color: 'var(--osd-accent)',
          }}
        >
          — {attribution}
        </figcaption>
      )}
    </figure>
  );
}
