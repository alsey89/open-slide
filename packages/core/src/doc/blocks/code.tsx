import type { Block } from '../model.ts';

export function Code({ block }: { block: Block }) {
  return (
    <pre
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 'calc(var(--osd-size-body) * 0.8)',
        color: 'var(--osd-text)',
        background: 'color-mix(in oklab, var(--osd-text) 6%, transparent)',
        borderRadius: 'var(--osd-radius)',
        padding: 32,
        margin: 0,
        overflow: 'hidden',
        lineHeight: 1.5,
      }}
    >
      <code>{String(block.props.code ?? '')}</code>
    </pre>
  );
}
