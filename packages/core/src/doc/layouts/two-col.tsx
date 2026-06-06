import type { ReactNode } from 'react';
import { FitToSlot } from '../fit-to-slot.tsx';
import type { Slide } from '../model.ts';

export function TwoCol({ renderSlot }: { slide: Slide; renderSlot: (name: string) => ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--osd-bg)',
        padding: 140,
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        gap: 56,
      }}
    >
      <FitToSlot>{renderSlot('title')}</FitToSlot>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, minHeight: 0 }}>
        <FitToSlot>{renderSlot('left')}</FitToSlot>
        <FitToSlot>{renderSlot('right')}</FitToSlot>
      </div>
    </div>
  );
}
