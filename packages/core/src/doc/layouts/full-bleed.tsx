import type { ReactNode } from 'react';
import { FitToSlot } from '../fit-to-slot.tsx';
import type { Slide } from '../model.ts';

export function FullBleed({
  renderSlot,
}: {
  slide: Slide;
  renderSlot: (name: string) => ReactNode;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'var(--osd-bg)',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>{renderSlot('media')}</div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          alignContent: 'end',
          padding: 140,
          boxSizing: 'border-box',
        }}
      >
        <FitToSlot>{renderSlot('content')}</FitToSlot>
      </div>
    </div>
  );
}
