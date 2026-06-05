import type { ReactNode } from 'react';
import { FitToSlot } from '../fit-to-slot.tsx';
import type { Slide } from '../model.ts';

export function Title({ renderSlot }: { slide: Slide; renderSlot: (name: string) => ReactNode }) {
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
        gap: 40,
      }}
    >
      <FitToSlot>{renderSlot('title')}</FitToSlot>
      <FitToSlot>{renderSlot('subtitle')}</FitToSlot>
    </div>
  );
}
