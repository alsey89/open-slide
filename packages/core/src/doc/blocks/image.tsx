import type { Block } from '../model.ts';

export function ImageBlock({ block }: { block: Block }) {
  const src = String(block.props.src ?? '');
  const alt = String(block.props.alt ?? '');
  const fit = block.props.fit === 'contain' ? 'contain' : 'cover';
  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: '100%',
        height: '100%',
        objectFit: fit,
        borderRadius: 'var(--osd-radius)',
        display: 'block',
      }}
    />
  );
}
