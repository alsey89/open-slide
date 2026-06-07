import type { Block } from '../model.ts';

export function Stat({ block }: { block: Block }) {
  const value = String(block.props.value ?? '');
  const label = block.props.label ? String(block.props.label) : null;
  const caption = block.props.caption ? String(block.props.caption) : null;
  return (
    <div style={{ display: 'grid', gap: 'calc(var(--osd-space) * 1.5)', justifyItems: 'start' }}>
      <div
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 'var(--osd-size-hero)',
          color: 'var(--osd-accent)',
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {label && (
        <div
          style={{
            fontFamily: 'var(--osd-font-body)',
            fontSize: 'var(--osd-size-heading)',
            color: 'var(--osd-text)',
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>
      )}
      {caption && (
        <div
          style={{
            fontFamily: 'var(--osd-font-body)',
            fontSize: 'var(--osd-size-caption)',
            color: 'var(--osd-muted)',
            lineHeight: 1.4,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
