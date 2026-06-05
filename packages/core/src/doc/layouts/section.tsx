import type { ReactNode } from 'react';
import { FitToSlot } from '../fit-to-slot.tsx';
import type { Slide } from '../model.ts';

export function Section({ renderSlot }: { slide: Slide; renderSlot: (name: string) => ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--osd-bg)',
        padding: 160,
        boxSizing: 'border-box',
        display: 'grid',
        alignContent: 'center',
        gap: 24,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--osd-font-body)',
          fontSize: 'calc(var(--osd-size-body) * 0.7)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--osd-accent)',
        }}
      >
        {renderSlot('eyebrow')}
      </div>
      <FitToSlot>{renderSlot('title')}</FitToSlot>
    </div>
  );
}
