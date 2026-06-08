import type { Block } from '../model.ts';

export function Bullets({ block }: { block: Block }) {
  const items = Array.isArray(block.props.items) ? (block.props.items as unknown[]) : [];
  return (
    <ul
      style={{
        fontFamily: 'var(--osd-font-body)',
        fontSize: 'var(--osd-size-body)',
        color: 'var(--osd-text)',
        lineHeight: 1.5,
        margin: 0,
        paddingLeft: '1.2em',
        display: 'grid',
        gap: 24,
      }}
    >
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: bullet order is the identity
        <li key={i} data-osd-text={`items.${i}`}>
          {String(item)}
        </li>
      ))}
    </ul>
  );
}
