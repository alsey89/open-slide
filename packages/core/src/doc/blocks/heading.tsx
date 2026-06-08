import type { Block } from '../model.ts';

export function Heading({ block }: { block: Block }) {
  const text = String(block.props.text ?? '');
  return (
    <h2
      data-osd-text="text"
      style={{
        fontFamily: 'var(--osd-font-display)',
        fontSize: 'var(--osd-size-hero)',
        color: 'var(--osd-text)',
        fontWeight: 800,
        lineHeight: 1.1,
        margin: 0,
      }}
    >
      {text}
    </h2>
  );
}
