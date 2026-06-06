import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { computeFitScale } from './fit.ts';

export function FitToSlot({ children, min = 0.5 }: { children: ReactNode; min?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const contentH = i.scrollHeight;
      const availH = o.clientHeight;
      setScale(computeFitScale(contentH, availH, min));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    measure();
    return () => ro.disconnect();
  }, [min]);

  return (
    <div ref={outer} data-osd-fit style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <div
        ref={inner}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${100 / scale}%`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
