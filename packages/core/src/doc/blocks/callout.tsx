import type { CSSProperties } from 'react';
import type { Block } from '../model.ts';

const VARIANTS: Record<string, CSSProperties> = {
  accent: {
    background: 'var(--osd-accent)',
    color: 'var(--osd-bg)',
    border: '1px solid transparent',
  },
  surface: {
    background: 'var(--osd-surface)',
    color: 'var(--osd-text)',
    border: '1px solid var(--osd-border)',
  },
  outline: {
    background: 'transparent',
    color: 'var(--osd-text)',
    border: '1px solid var(--osd-border)',
  },
};

export function Callout({ block }: { block: Block }) {
  const text = String(block.props.text ?? '');
  const variant = String(block.props.variant ?? 'accent');
  return (
    <span
      data-osd-text="text"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'start',
        fontFamily: 'var(--osd-font-body)',
        fontSize: 'var(--osd-size-caption)',
        fontWeight: 600,
        lineHeight: 1.2,
        padding: 'calc(var(--osd-space) * 1) calc(var(--osd-space) * 2)',
        borderRadius: 'var(--osd-radius)',
        ...(VARIANTS[variant] ?? VARIANTS.accent),
      }}
    >
      {text}
    </span>
  );
}
