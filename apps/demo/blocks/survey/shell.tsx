import { registerLayout } from '@open-slide/core';
import type { ReactNode } from 'react';

/**
 * "Survey" — the Beacon look (warm topographic field-notebook: paper, ink, a
 * single ember accent, hairline contours, a scanning ping). The cinematic shell
 * lives in custom *layouts* so the per-slide content can be composed from small,
 * individually-selectable blocks (see ./blocks.tsx) instead of one full-bleed block.
 */

export const EMBER = 'var(--osd-accent)';
export const SURVEY_MONO = "'JetBrains Mono', ui-monospace, monospace";

function SurveyFx() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=JetBrains+Mono:wght@400;500&display=swap');
      @keyframes bcn-ping { 0%{transform:scale(.4);opacity:.9} 70%{opacity:0} 100%{transform:scale(2.4);opacity:0} }
      @keyframes bcn-core { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.55;transform:scale(.78)} }
      @keyframes bcn-rise { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      @keyframes bcn-sweep { from{transform:scaleX(0)} to{transform:scaleX(1)} }
      @keyframes bcn-trace { to{stroke-dashoffset:0} }
      @keyframes bcn-drift { 0%{transform:translateY(0)} 50%{transform:translateY(-1.4%)} 100%{transform:translateY(0)} }
    `}</style>
  );
}

function Topo() {
  const rings = [60, 130, 205, 285, 370, 460, 555];
  return (
    <svg
      aria-hidden
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0.5,
        maskImage: 'radial-gradient(135% 120% at 78% 18%, #000 30%, transparent 96%)',
        WebkitMaskImage: 'radial-gradient(135% 120% at 78% 18%, #000 30%, transparent 96%)',
        animation: 'bcn-drift 22s ease-in-out infinite',
      }}
    >
      <title>Topographic contour lines</title>
      <g fill="none" stroke="var(--osd-border)" strokeWidth={1.5}>
        {rings.map((r) => (
          <ellipse key={r} cx={1430} cy={250} rx={r} ry={r * 0.82} />
        ))}
      </g>
      <g fill="none" stroke="var(--osd-border)" strokeWidth={1.5} opacity={0.7}>
        {[90, 180, 280, 390, 510].map((r) => (
          <ellipse key={r} cx={250} cy={920} rx={r * 1.1} ry={r * 0.7} />
        ))}
      </g>
    </svg>
  );
}

function SurveyChrome() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: 120,
        right: 120,
        bottom: 58,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: SURVEY_MONO,
        fontSize: 18,
        letterSpacing: '0.16em',
        color: 'var(--osd-muted)',
        textTransform: 'uppercase',
        borderTop: '1px solid var(--osd-border)',
        paddingTop: 22,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: EMBER,
            boxShadow: `0 0 10px ${EMBER}`,
            animation: 'bcn-core 2.1s ease-in-out infinite',
          }}
        />
        Beacon
      </span>
      <span>Wildfire detection network</span>
      <span>Series A · 2026</span>
    </div>
  );
}

function SurveyShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
        overflow: 'hidden',
      }}
    >
      <SurveyFx />
      <Topo />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent, transparent 119px, var(--osd-border) 119px, var(--osd-border) 120px)',
          opacity: 0.28,
          maskImage: 'linear-gradient(180deg, transparent, #000 22%, #000 86%, transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 22%, #000 86%, transparent)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '112px 120px 150px',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
      <SurveyChrome />
    </div>
  );
}

registerLayout(
  'survey-stage',
  ({ slide, renderSlot }) => {
    const hasAside = (slide.slots.aside?.length ?? 0) > 0;
    return (
      <SurveyShell>
        <div
          style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: 32 }}
        >
          <div>{renderSlot('kicker')}</div>
          <div>{renderSlot('headline')}</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: hasAside ? '1.4fr 1fr' : '1fr',
              gap: 84,
              alignItems: 'center',
              minHeight: 0,
            }}
          >
            <div style={{ display: 'grid', gap: 28, alignContent: 'center' }}>
              {renderSlot('body')}
            </div>
            {hasAside && (
              <div
                style={{
                  borderLeft: `2px solid ${EMBER}`,
                  paddingLeft: 72,
                  display: 'grid',
                  gap: 12,
                }}
              >
                {renderSlot('aside')}
              </div>
            )}
          </div>
        </div>
      </SurveyShell>
    );
  },
  ['kicker', 'headline', 'body', 'aside'],
);

registerLayout(
  'survey-grid',
  ({ slide, renderSlot }) => {
    const n = Math.max(slide.slots.items?.length ?? 1, 1);
    return (
      <SurveyShell>
        <div
          style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: 40 }}
        >
          <div>{renderSlot('kicker')}</div>
          <div>{renderSlot('headline')}</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${n}, 1fr)`,
              gap: 36,
              alignContent: 'start',
            }}
          >
            {renderSlot('items')}
          </div>
        </div>
      </SurveyShell>
    );
  },
  ['kicker', 'headline', 'items'],
);

registerLayout(
  'survey-feature',
  ({ slide, renderSlot }) => {
    const m = slide.slots.metrics?.length ?? 0;
    return (
      <SurveyShell>
        <div
          style={{
            height: '100%',
            display: 'grid',
            gridTemplateRows: 'auto auto 1fr auto',
            gap: 36,
          }}
        >
          <div>{renderSlot('kicker')}</div>
          <div>{renderSlot('headline')}</div>
          <div style={{ minHeight: 0, display: 'grid', alignContent: 'center' }}>
            {renderSlot('feature')}
          </div>
          {m > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${m}, 1fr)`,
                gap: 90,
                borderTop: '1px solid var(--osd-border)',
                paddingTop: 36,
              }}
            >
              {renderSlot('metrics')}
            </div>
          )}
        </div>
      </SurveyShell>
    );
  },
  ['kicker', 'headline', 'feature', 'metrics'],
);
