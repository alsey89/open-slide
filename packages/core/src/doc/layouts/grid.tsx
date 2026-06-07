import type { ReactNode } from 'react';
import { FitToSlot } from '../fit-to-slot.tsx';
import type { Slide } from '../model.ts';

export function Grid({ renderSlot }: { slide: Slide; renderSlot: (name: string) => ReactNode }) {
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 48,
          minHeight: 0,
          alignContent: 'start',
        }}
      >
        {renderSlot('items')}
      </div>
    </div>
  );
}
