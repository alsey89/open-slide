import type { Block } from '../model.ts';

export function Divider(_props: { block: Block }) {
  return (
    <hr
      style={{
        width: '100%',
        height: 0,
        border: 'none',
        borderTop: '1px solid var(--osd-border)',
        margin: 0,
      }}
    />
  );
}
