import { type Block, registerBlock, registerLayout } from '@open-slide/core';
import type { CSSProperties, ReactNode } from 'react';

/**
 * "Pylon" — a custom block pack for a renewable-energy startup pitch deck.
 * Every slide is a full-bleed custom React composition placed on the `stage`
 * layout. Demonstrates the creative ceiling: arbitrary React, SVG data-viz,
 * web fonts, and motion — all registered by name and driven from deck.json.
 */

const ACCENT = 'var(--osd-accent)';
const MONO = "'Spline Sans Mono', ui-monospace, monospace";

function Fx() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Hanken+Grotesk:wght@400;500;600&family=Spline+Sans+Mono:wght@400;500&display=swap');
      @keyframes pylon-drift { 0%{transform:translate(0,0)} 50%{transform:translate(-3%,2%)} 100%{transform:translate(0,0)} }
      @keyframes pylon-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.82)} }
      @keyframes pylon-rise { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      @keyframes pylon-grow { from{transform:scaleX(0)} to{transform:scaleX(1)} }
      @keyframes pylon-draw { to{stroke-dashoffset:0} }
    `}</style>
  );
}

function str(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v);
}

const display = (size: number, weight = 800): CSSProperties => ({
  fontFamily: 'var(--osd-font-display)',
  fontSize: size,
  fontWeight: weight,
  lineHeight: 1.02,
  letterSpacing: '-0.02em',
  margin: 0,
});

function Chrome() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: 120,
        right: 120,
        bottom: 56,
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: MONO,
        fontSize: 19,
        letterSpacing: '0.12em',
        color: 'var(--osd-muted)',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: ACCENT,
            boxShadow: `0 0 12px ${ACCENT}`,
            animation: 'pylon-pulse 2.2s ease-in-out infinite',
          }}
        />
        Pylon
      </span>
      <span>Series A · 2026</span>
    </div>
  );
}

function Stage({ children }: { children: ReactNode }) {
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
      <Fx />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(var(--osd-border) 1px, transparent 1px), linear-gradient(90deg, var(--osd-border) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          opacity: 0.4,
          maskImage: 'radial-gradient(120% 100% at 50% 0%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(120% 100% at 50% 0%, #000 40%, transparent 100%)',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          left: -200,
          top: -300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${ACCENT}22, transparent 60%)`,
          filter: 'blur(20px)',
          animation: 'pylon-drift 18s ease-in-out infinite',
        }}
      />
      {/* top/side 116, bottom 156 reserves room for the chrome footer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '116px 120px 156px',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
      <Chrome />
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 22,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: ACCENT,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <span style={{ width: 40, height: 2, background: ACCENT, display: 'inline-block' }} />
      {children}
    </div>
  );
}

function PylonHero({ block }: { block: Block }) {
  const p = block.props;
  const close = p.variant === 'close';
  return (
    <Stage>
      <div
        style={{ height: '100%', display: 'grid', alignContent: 'center', gap: 30, maxWidth: 1480 }}
      >
        <div style={{ animation: 'pylon-rise .7s ease both' }}>
          <Eyebrow>{str(p.eyebrow, 'Predictive maintenance for the grid')}</Eyebrow>
        </div>
        <h1
          style={{
            ...display(close ? 128 : 150),
            animation: 'pylon-rise .7s ease .08s both',
            backgroundImage: close
              ? `linear-gradient(100deg, var(--osd-text), ${ACCENT})`
              : undefined,
            backgroundClip: close ? 'text' : undefined,
            WebkitBackgroundClip: close ? 'text' : undefined,
            color: close ? 'transparent' : 'var(--osd-text)',
          }}
        >
          {str(p.title, 'Keep the grid online.')}
        </h1>
        <p
          style={{
            fontSize: 34,
            lineHeight: 1.4,
            color: 'var(--osd-muted)',
            maxWidth: 1040,
            margin: 0,
            animation: 'pylon-rise .7s ease .16s both',
          }}
        >
          {str(p.sub)}
        </p>
      </div>
    </Stage>
  );
}

function PylonStatement({ block }: { block: Block }) {
  const p = block.props;
  const points = Array.isArray(p.points) ? (p.points as string[]) : [];
  const figure = (p.figure ?? null) as { value?: string; label?: string } | null;
  const problem = p.tone === 'problem';
  return (
    <Stage>
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 44 }}>
        <Eyebrow>{str(p.eyebrow, problem ? 'The problem' : 'The solution')}</Eyebrow>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: figure ? '1.35fr 1fr' : '1fr',
            gap: 80,
            alignItems: 'center',
            minHeight: 0,
          }}
        >
          <div style={{ display: 'grid', gap: 36 }}>
            <h2 style={{ ...display(figure ? 68 : 76, 700), maxWidth: 1080 }}>{str(p.title)}</h2>
            {points.length > 0 && (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 16 }}>
                {points.map((pt, i) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: static deck content
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 18,
                      fontSize: 27,
                      lineHeight: 1.4,
                      alignItems: 'baseline',
                    }}
                  >
                    <span style={{ color: ACCENT, fontFamily: MONO, fontSize: 24 }}>
                      {problem ? '×' : '→'}
                    </span>
                    <span style={{ color: 'var(--osd-muted)' }}>{pt}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {figure && (
            <div
              style={{
                borderLeft: '2px solid var(--osd-border)',
                paddingLeft: 72,
                display: 'grid',
                gap: 8,
              }}
            >
              <div
                style={{
                  ...display(148, 800),
                  color: problem ? '#ff6b5e' : ACCENT,
                  textShadow: problem ? 'none' : `0 0 60px ${ACCENT}55`,
                }}
              >
                {str(figure.value)}
              </div>
              <div style={{ fontSize: 26, color: 'var(--osd-muted)', maxWidth: 420 }}>
                {str(figure.label)}
              </div>
            </div>
          )}
        </div>
      </div>
    </Stage>
  );
}

function PylonSteps({ block }: { block: Block }) {
  const p = block.props;
  const steps = (Array.isArray(p.steps) ? p.steps : []) as Array<{ title?: string; desc?: string }>;
  return (
    <Stage>
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: 56 }}>
        <Eyebrow>{str(p.eyebrow, 'How it works')}</Eyebrow>
        <h2 style={{ ...display(64, 700), maxWidth: 1200 }}>{str(p.title)}</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(steps.length, 1)}, 1fr)`,
            gap: 40,
            alignContent: 'start',
          }}
        >
          {steps.map((s, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static deck content
              key={i}
              style={{
                background: 'var(--osd-surface)',
                border: '1px solid var(--osd-border)',
                borderRadius: 'var(--osd-radius)',
                padding: 48,
                display: 'grid',
                gap: 22,
                position: 'relative',
                animation: `pylon-rise .6s ease ${i * 0.1}s both`,
              }}
            >
              <div
                style={{ fontFamily: MONO, fontSize: 26, color: ACCENT, letterSpacing: '0.1em' }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={display(46, 700)}>{str(s.title)}</div>
              <div style={{ fontSize: 28, lineHeight: 1.45, color: 'var(--osd-muted)' }}>
                {str(s.desc)}
              </div>
              {i < steps.length - 1 && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    right: -28,
                    top: '50%',
                    color: ACCENT,
                    fontFamily: MONO,
                    fontSize: 32,
                  }}
                >
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
}

function PylonMarket({ block }: { block: Block }) {
  const p = block.props;
  const rings = (Array.isArray(p.rings) ? p.rings : []) as Array<{
    label?: string;
    value?: string;
    note?: string;
  }>;
  const radii = [320, 220, 130];
  const colors = ['var(--osd-border)', '#c4f04266', ACCENT];
  return (
    <Stage>
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 56 }}>
        <Eyebrow>{str(p.eyebrow, 'Market')}</Eyebrow>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            alignItems: 'center',
            gap: 80,
            minHeight: 0,
          }}
        >
          <svg viewBox="0 0 700 700" style={{ width: '100%', maxHeight: 600 }}>
            <title>Market sizing rings</title>
            {radii.map((r, i) => (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: static
                key={i}
                cx={350}
                cy={350}
                r={r}
                fill={i === 2 ? '#c4f0421f' : 'none'}
                stroke={colors[i]}
                strokeWidth={i === 2 ? 3 : 2}
                strokeDasharray={i === 2 ? undefined : '6 8'}
              />
            ))}
            {rings.map((ring, i) => (
              <text
                // biome-ignore lint/suspicious/noArrayIndexKey: static
                key={i}
                x={350}
                y={350 - radii[i] + 46}
                textAnchor="middle"
                fill={i === 2 ? '#c4f042' : '#eaf0ea'}
                style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 40 }}
              >
                {str(ring.value)}
              </text>
            ))}
          </svg>
          <div style={{ display: 'grid', gap: 30 }}>
            <h2 style={{ ...display(60, 700), maxWidth: 640 }}>{str(p.title)}</h2>
            <div style={{ display: 'grid', gap: 18 }}>
              {rings.map((ring, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static
                  key={i}
                  style={{ display: 'flex', gap: 18, alignItems: 'center' }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      background: i === 2 ? ACCENT : colors[i],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontFamily: MONO, fontSize: 24, color: ACCENT, width: 70 }}>
                    {str(ring.label)}
                  </span>
                  <span style={{ fontSize: 28, color: 'var(--osd-muted)' }}>{str(ring.note)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Stage>
  );
}

function PylonTraction({ block }: { block: Block }) {
  const p = block.props;
  const series = (Array.isArray(p.series) ? p.series : [3, 8, 14, 26, 41, 63]) as number[];
  const metrics = (Array.isArray(p.metrics) ? p.metrics : []) as Array<{
    value?: string;
    label?: string;
  }>;
  const max = Math.max(...series, 1);
  const W = 1680;
  const H = 360;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * W;
    const y = H - (v / max) * (H - 30);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <Stage>
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 48 }}>
        <Eyebrow>{str(p.eyebrow, 'Traction')}</Eyebrow>
        <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: 30, minHeight: 0 }}>
          <h2 style={{ ...display(62, 700), maxWidth: 1200 }}>{str(p.title)}</h2>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }} preserveAspectRatio="none">
            <title>Traction over time</title>
            <defs>
              <linearGradient id="pylon-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c4f042" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#c4f042" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#pylon-area)" />
            <path
              d={line}
              fill="none"
              stroke="#c4f042"
              strokeWidth={4}
              strokeLinejoin="round"
              strokeDasharray={4000}
              strokeDashoffset={4000}
              style={{ animation: 'pylon-draw 1.6s ease forwards' }}
            />
            {pts.map(([x, y], i) => (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: static
                key={i}
                cx={x}
                cy={y}
                r={6}
                fill="#0a0d0c"
                stroke="#c4f042"
                strokeWidth={3}
              />
            ))}
          </svg>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 90,
            borderTop: '1px solid var(--osd-border)',
            paddingTop: 40,
          }}
        >
          {metrics.map((m, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static
              key={i}
              style={{ display: 'grid', gap: 8 }}
            >
              <div style={{ ...display(78, 800), color: ACCENT }}>{str(m.value)}</div>
              <div
                style={{
                  fontSize: 26,
                  color: 'var(--osd-muted)',
                  fontFamily: MONO,
                  letterSpacing: '0.06em',
                }}
              >
                {str(m.label)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
}

function PylonTeam({ block }: { block: Block }) {
  const p = block.props;
  const members = (Array.isArray(p.members) ? p.members : []) as Array<{
    name?: string;
    role?: string;
    prev?: string;
  }>;
  const initials = (n: string) =>
    n
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('');
  return (
    <Stage>
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: 56 }}>
        <Eyebrow>{str(p.eyebrow, 'Team')}</Eyebrow>
        <h2 style={{ ...display(64, 700), maxWidth: 1200 }}>{str(p.title)}</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(members.length, 1)}, 1fr)`,
            gap: 40,
            alignContent: 'start',
          }}
        >
          {members.map((m, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static
              key={i}
              style={{
                display: 'grid',
                gap: 24,
                animation: `pylon-rise .6s ease ${i * 0.08}s both`,
              }}
            >
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 28,
                  background: 'linear-gradient(140deg, #c4f04233, var(--osd-surface))',
                  border: '1px solid var(--osd-border)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--osd-font-display)',
                  fontWeight: 800,
                  fontSize: 56,
                  color: ACCENT,
                }}
              >
                {initials(str(m.name, '–'))}
              </div>
              <div>
                <div style={display(40, 700)}>{str(m.name)}</div>
                <div style={{ fontSize: 26, color: ACCENT, marginTop: 6 }}>{str(m.role)}</div>
                <div
                  style={{
                    fontSize: 24,
                    color: 'var(--osd-muted)',
                    marginTop: 10,
                    lineHeight: 1.4,
                  }}
                >
                  {str(m.prev)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
}

function PylonAsk({ block }: { block: Block }) {
  const p = block.props;
  const allocations = (Array.isArray(p.allocations) ? p.allocations : []) as Array<{
    label?: string;
    pct?: number;
  }>;
  const shades = ['#c4f042', '#8fd14f', '#4fb3a0', '#2f6e7a'];
  return (
    <Stage>
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 64 }}>
        <Eyebrow>{str(p.eyebrow, 'The ask')}</Eyebrow>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: 100,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'grid', gap: 28 }}>
            <div style={{ ...display(148, 800), color: ACCENT, textShadow: '0 0 70px #c4f04244' }}>
              {str(p.amount, '$12M')}
            </div>
            <h2 style={{ ...display(46, 700), maxWidth: 620 }}>{str(p.title)}</h2>
          </div>
          <div style={{ display: 'grid', gap: 36 }}>
            <div
              style={{
                display: 'flex',
                height: 64,
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid var(--osd-border)',
                transformOrigin: 'left',
                animation: 'pylon-grow .9s ease both',
              }}
            >
              {allocations.map((a, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static
                  key={i}
                  style={{ width: `${a.pct ?? 0}%`, background: shades[i % shades.length] }}
                />
              ))}
            </div>
            <div style={{ display: 'grid', gap: 18 }}>
              {allocations.map((a, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static
                  key={i}
                  style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30 }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      background: shades[i % shades.length],
                    }}
                  />
                  <span style={{ fontFamily: MONO, color: ACCENT, width: 90 }}>{a.pct ?? 0}%</span>
                  <span style={{ color: 'var(--osd-muted)' }}>{str(a.label)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Stage>
  );
}

registerLayout('stage', ({ renderSlot }) => <>{renderSlot('main')}</>, ['main']);

registerBlock('pylon-hero', PylonHero, [
  { key: 'eyebrow', type: 'text', label: 'Eyebrow' },
  { key: 'title', type: 'textarea', label: 'Title' },
  { key: 'sub', type: 'textarea', label: 'Subtitle' },
  { key: 'variant', type: 'select', label: 'Variant', options: ['open', 'close'] },
]);
registerBlock('pylon-statement', PylonStatement, [
  { key: 'eyebrow', type: 'text', label: 'Eyebrow' },
  { key: 'title', type: 'textarea', label: 'Title' },
  { key: 'tone', type: 'select', label: 'Tone', options: ['problem', 'solution'] },
]);
registerBlock('pylon-steps', PylonSteps);
registerBlock('pylon-market', PylonMarket);
registerBlock('pylon-traction', PylonTraction);
registerBlock('pylon-team', PylonTeam);
registerBlock('pylon-ask', PylonAsk);

/**
 * "Beacon" — a second custom block pack for an AI wildfire early-detection
 * pitch. A light "topographic survey / field notebook" look: warm paper,
 * ink, a single ember accent, hairline iso-line contours, and a scanning
 * "ping" motion for the detection theme. Distinct from Pylon (dark grid);
 * shares only the `stage` layout and the `str()` helper above. Every scalar
 * string prop is tagged `data-osd-text` for in-place editing.
 */

const EMBER = 'var(--osd-accent)';
const SURVEY_MONO = "'JetBrains Mono', ui-monospace, monospace";

function BeaconFx() {
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

const surveyDisplay = (size: number, weight = 600): CSSProperties => ({
  fontFamily: 'var(--osd-font-display)',
  fontSize: size,
  fontWeight: weight,
  lineHeight: 1.04,
  letterSpacing: '-0.012em',
  margin: 0,
});

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

function Ping({ size = 130 }: { size?: number }) {
  const core = Math.round(size * 0.16);
  return (
    <span
      aria-hidden
      style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}
    >
      {[0, 0.9, 1.8].map((delay) => (
        <span
          key={delay}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `1.5px solid ${EMBER}`,
            animation: `bcn-ping 2.7s ${delay}s ease-out infinite`,
          }}
        />
      ))}
      <span
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: core,
          height: core,
          marginTop: -core / 2,
          marginLeft: -core / 2,
          borderRadius: '50%',
          background: EMBER,
          boxShadow: `0 0 ${core}px ${EMBER}`,
          animation: 'bcn-core 2.1s ease-in-out infinite',
        }}
      />
    </span>
  );
}

function SurveyFooter({ kicker }: { kicker: string }) {
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
      <span>{kicker}</span>
      <span>Series A · 2026</span>
    </div>
  );
}

function Survey({
  children,
  kicker = 'Wildfire detection network',
}: {
  children: ReactNode;
  kicker?: string;
}) {
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
      <BeaconFx />
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
      <SurveyFooter kicker={kicker} />
    </div>
  );
}

function Field({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: SURVEY_MONO,
        fontSize: 21,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: EMBER,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <span style={{ width: 34, height: 1.5, background: EMBER, display: 'inline-block' }} />
      {children}
    </div>
  );
}

function BeaconCover({ block }: { block: Block }) {
  const p = block.props;
  return (
    <Survey kicker="Detection in under 3 minutes">
      <div
        style={{
          height: '100%',
          display: 'grid',
          gridTemplateColumns: '1.45fr 1fr',
          alignItems: 'center',
          gap: 80,
        }}
      >
        <div style={{ display: 'grid', alignContent: 'center', gap: 30, maxWidth: 1180 }}>
          <div style={{ animation: 'bcn-rise .7s ease both' }}>
            <Field>
              <span data-osd-text="eyebrow">{str(p.eyebrow, 'AI wildfire early-detection')}</span>
            </Field>
          </div>
          <h1
            style={{ ...surveyDisplay(138, 600), animation: 'bcn-rise .7s ease .08s both' }}
            data-osd-text="title"
          >
            {str(p.title, 'See the first ember.')}
          </h1>
          <p
            style={{
              fontSize: 33,
              lineHeight: 1.42,
              color: 'var(--osd-muted)',
              maxWidth: 900,
              margin: 0,
              animation: 'bcn-rise .7s ease .16s both',
            }}
            data-osd-text="sub"
          >
            {str(p.sub)}
          </p>
        </div>
        <div
          style={{ display: 'grid', placeItems: 'center', animation: 'bcn-rise .8s ease .2s both' }}
        >
          <Ping size={300} />
        </div>
      </div>
    </Survey>
  );
}

function BeaconStatement({ block }: { block: Block }) {
  const p = block.props;
  const points = Array.isArray(p.points) ? (p.points as string[]) : [];
  const figure = (p.figure ?? null) as { value?: string; label?: string } | null;
  const problem = p.tone === 'problem';
  return (
    <Survey kicker={problem ? 'The problem' : 'The solution'}>
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 44 }}>
        <Field>
          <span data-osd-text="eyebrow">
            {str(p.eyebrow, problem ? 'The problem' : 'The solution')}
          </span>
        </Field>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: figure ? '1.4fr 1fr' : '1fr',
            gap: 84,
            alignItems: 'center',
            minHeight: 0,
          }}
        >
          <div style={{ display: 'grid', gap: 38 }}>
            <h2
              style={{ ...surveyDisplay(figure ? 70 : 80, 600), maxWidth: 1080 }}
              data-osd-text="title"
            >
              {str(p.title)}
            </h2>
            {str(p.sub) !== '' && (
              <p
                style={{
                  fontSize: 30,
                  lineHeight: 1.45,
                  color: 'var(--osd-muted)',
                  maxWidth: 980,
                  margin: 0,
                }}
                data-osd-text="sub"
              >
                {str(p.sub)}
              </p>
            )}
            {points.length > 0 && (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 18 }}>
                {points.map((pt, i) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: static deck content
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 18,
                      fontSize: 28,
                      lineHeight: 1.4,
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: SURVEY_MONO,
                        fontSize: 20,
                        color: EMBER,
                        flexShrink: 0,
                        transform: 'translateY(-2px)',
                      }}
                    >
                      {problem ? '✕' : '◆'}
                    </span>
                    <span style={{ color: 'var(--osd-text)' }}>{pt}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {figure && (
            <div
              style={{
                borderLeft: `2px solid ${problem ? 'var(--osd-border)' : EMBER}`,
                paddingLeft: 72,
                display: 'grid',
                gap: 12,
              }}
            >
              <div
                style={{
                  ...surveyDisplay(150, 700),
                  color: EMBER,
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: problem ? 'none' : `0 0 60px ${EMBER}33`,
                }}
              >
                {str(figure.value)}
              </div>
              <div
                style={{ fontSize: 25, color: 'var(--osd-muted)', maxWidth: 420, lineHeight: 1.4 }}
              >
                {str(figure.label)}
              </div>
            </div>
          )}
        </div>
      </div>
    </Survey>
  );
}

function BeaconSteps({ block }: { block: Block }) {
  const p = block.props;
  const steps = (Array.isArray(p.steps) ? p.steps : []) as Array<{ title?: string; desc?: string }>;
  return (
    <Survey kicker="Sense · detect · verify · alert">
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: 52 }}>
        <Field>
          <span data-osd-text="eyebrow">{str(p.eyebrow, 'How it works')}</span>
        </Field>
        <h2 style={{ ...surveyDisplay(66, 600), maxWidth: 1200 }} data-osd-text="title">
          {str(p.title)}
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(steps.length, 1)}, 1fr)`,
            gap: 36,
            alignContent: 'start',
          }}
        >
          {steps.map((s, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static deck content
              key={i}
              style={{
                background: 'var(--osd-surface)',
                border: '1px solid var(--osd-border)',
                borderRadius: 'var(--osd-radius)',
                padding: 44,
                display: 'grid',
                gap: 22,
                position: 'relative',
                animation: `bcn-rise .6s ease ${i * 0.1}s both`,
              }}
            >
              <div
                style={{
                  fontFamily: SURVEY_MONO,
                  fontSize: 22,
                  color: EMBER,
                  letterSpacing: '0.14em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: EMBER,
                    boxShadow: `0 0 9px ${EMBER}`,
                  }}
                />
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={surveyDisplay(42, 600)}>{str(s.title)}</div>
              <div style={{ fontSize: 26, lineHeight: 1.46, color: 'var(--osd-muted)' }}>
                {str(s.desc)}
              </div>
              {i < steps.length - 1 && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    right: -26,
                    top: 56,
                    color: EMBER,
                    fontFamily: SURVEY_MONO,
                    fontSize: 26,
                  }}
                >
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Survey>
  );
}

function BeaconMarket({ block }: { block: Block }) {
  const p = block.props;
  const segments = (Array.isArray(p.segments) ? p.segments : []) as Array<{
    label?: string;
    value?: string;
    note?: string;
  }>;
  const heights = [560, 360, 200];
  return (
    <Survey kicker="Market sizing">
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 52 }}>
        <Field>
          <span data-osd-text="eyebrow">{str(p.eyebrow, 'Market')}</span>
        </Field>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.05fr',
            alignItems: 'center',
            gap: 90,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 40,
              height: 600,
            }}
          >
            {segments.slice(0, 3).map((seg, i) => {
              const h = heights[i] ?? 160;
              const filled = i === 0;
              return (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static
                  key={i}
                  style={{ display: 'grid', gap: 18, justifyItems: 'center', width: 150 }}
                >
                  <div
                    style={{
                      ...surveyDisplay(40, 700),
                      color: EMBER,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {str(seg.value)}
                  </div>
                  <div
                    style={{
                      width: 150,
                      height: h,
                      borderRadius: '10px 10px 0 0',
                      background: filled ? EMBER : 'transparent',
                      border: `1.5px solid ${EMBER}`,
                      opacity: filled ? 1 : 0.45,
                      transformOrigin: 'bottom',
                      animation: `bcn-rise .7s ease ${i * 0.12}s both`,
                    }}
                  />
                  <div style={{ fontFamily: SURVEY_MONO, fontSize: 22, color: EMBER }}>
                    {str(seg.label)}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gap: 32 }}>
            <h2 style={{ ...surveyDisplay(62, 600), maxWidth: 660 }} data-osd-text="title">
              {str(p.title)}
            </h2>
            <div style={{ display: 'grid', gap: 22 }}>
              {segments.map((seg, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto auto 1fr',
                    gap: 18,
                    alignItems: 'baseline',
                    borderBottom: '1px solid var(--osd-border)',
                    paddingBottom: 18,
                  }}
                >
                  <span style={{ fontFamily: SURVEY_MONO, fontSize: 22, color: EMBER, width: 64 }}>
                    {str(seg.label)}
                  </span>
                  <span
                    style={{
                      ...surveyDisplay(30, 700),
                      color: 'var(--osd-text)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {str(seg.value)}
                  </span>
                  <span style={{ fontSize: 25, color: 'var(--osd-muted)', lineHeight: 1.35 }}>
                    {str(seg.note)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Survey>
  );
}

function BeaconTraction({ block }: { block: Block }) {
  const p = block.props;
  const series = (Array.isArray(p.series) ? p.series : [2, 6, 11, 19, 34, 58]) as number[];
  const metrics = (Array.isArray(p.metrics) ? p.metrics : []) as Array<{
    value?: string;
    label?: string;
  }>;
  const max = Math.max(...series, 1);
  const W = 1680;
  const H = 360;
  const pts = series.map((v, i) => {
    const x = (i / Math.max(series.length - 1, 1)) * W;
    const y = H - (v / max) * (H - 30);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <Survey kicker="Traction">
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 46 }}>
        <Field>
          <span data-osd-text="eyebrow">{str(p.eyebrow, 'Traction')}</span>
        </Field>
        <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: 30, minHeight: 0 }}>
          <h2 style={{ ...surveyDisplay(62, 600), maxWidth: 1200 }} data-osd-text="title">
            {str(p.title)}
          </h2>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }} preserveAspectRatio="none">
            <title>Coverage growth over time</title>
            <defs>
              <linearGradient id="bcn-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--osd-accent)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--osd-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#bcn-area)" />
            <path
              d={line}
              fill="none"
              stroke="var(--osd-accent)"
              strokeWidth={4}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={4200}
              strokeDashoffset={4200}
              style={{ animation: 'bcn-trace 1.7s ease forwards' }}
            />
            {pts.map(([x, y], i) => (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: static
                key={i}
                cx={x}
                cy={y}
                r={6}
                fill="var(--osd-bg)"
                stroke="var(--osd-accent)"
                strokeWidth={3}
              />
            ))}
          </svg>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 96,
            borderTop: '1px solid var(--osd-border)',
            paddingTop: 40,
          }}
        >
          {metrics.map((m, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static
              key={i}
              style={{ display: 'grid', gap: 8 }}
            >
              <div
                style={{
                  ...surveyDisplay(76, 700),
                  color: EMBER,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {str(m.value)}
              </div>
              <div
                style={{
                  fontSize: 24,
                  color: 'var(--osd-muted)',
                  fontFamily: SURVEY_MONO,
                  letterSpacing: '0.04em',
                }}
              >
                {str(m.label)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Survey>
  );
}

function BeaconTeam({ block }: { block: Block }) {
  const p = block.props;
  const members = (Array.isArray(p.members) ? p.members : []) as Array<{
    name?: string;
    role?: string;
    prev?: string;
  }>;
  const initials = (n: string) =>
    n
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('');
  return (
    <Survey kicker="Founding team">
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: 52 }}>
        <Field>
          <span data-osd-text="eyebrow">{str(p.eyebrow, 'Team')}</span>
        </Field>
        <h2 style={{ ...surveyDisplay(66, 600), maxWidth: 1200 }} data-osd-text="title">
          {str(p.title)}
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(members.length, 1)}, 1fr)`,
            gap: 40,
            alignContent: 'start',
          }}
        >
          {members.map((m, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static
              key={i}
              style={{
                display: 'grid',
                gap: 24,
                padding: 40,
                background: 'var(--osd-surface)',
                border: '1px solid var(--osd-border)',
                borderRadius: 'var(--osd-radius)',
                animation: `bcn-rise .6s ease ${i * 0.08}s both`,
              }}
            >
              <div
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: '50%',
                  background: 'var(--osd-bg)',
                  border: `1.5px solid ${EMBER}`,
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--osd-font-display)',
                  fontWeight: 700,
                  fontSize: 50,
                  color: EMBER,
                }}
              >
                {initials(str(m.name, '–'))}
              </div>
              <div>
                <div style={surveyDisplay(38, 600)}>{str(m.name)}</div>
                <div style={{ fontFamily: SURVEY_MONO, fontSize: 22, color: EMBER, marginTop: 8 }}>
                  {str(m.role)}
                </div>
                <div
                  style={{
                    fontSize: 23,
                    color: 'var(--osd-muted)',
                    marginTop: 12,
                    lineHeight: 1.42,
                  }}
                >
                  {str(m.prev)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Survey>
  );
}

function BeaconAsk({ block }: { block: Block }) {
  const p = block.props;
  const allocations = (Array.isArray(p.allocations) ? p.allocations : []) as Array<{
    label?: string;
    pct?: number;
  }>;
  return (
    <Survey kicker="The ask">
      <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 60 }}>
        <Field>
          <span data-osd-text="eyebrow">{str(p.eyebrow, 'The ask')}</span>
        </Field>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: 100,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'grid', gap: 28 }}>
            <div
              style={{
                ...surveyDisplay(156, 700),
                color: EMBER,
                fontVariantNumeric: 'tabular-nums',
                textShadow: `0 0 70px ${EMBER}2e`,
              }}
              data-osd-text="amount"
            >
              {str(p.amount, '$15M')}
            </div>
            <h2 style={{ ...surveyDisplay(46, 600), maxWidth: 620 }} data-osd-text="title">
              {str(p.title)}
            </h2>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {allocations.map((a, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static
                key={i}
                style={{ display: 'grid', gap: 12 }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ fontSize: 28, color: 'var(--osd-text)' }}>{str(a.label)}</span>
                  <span
                    style={{
                      fontFamily: SURVEY_MONO,
                      fontSize: 24,
                      color: EMBER,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {a.pct ?? 0}%
                  </span>
                </div>
                <div
                  style={{
                    height: 14,
                    borderRadius: 8,
                    background: 'var(--osd-surface)',
                    border: '1px solid var(--osd-border)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${a.pct ?? 0}%`,
                      height: '100%',
                      background: EMBER,
                      transformOrigin: 'left',
                      animation: `bcn-sweep .9s ease ${i * 0.1}s both`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Survey>
  );
}

registerBlock('beacon-cover', BeaconCover, [
  { key: 'eyebrow', type: 'text', label: 'Eyebrow' },
  { key: 'title', type: 'textarea', label: 'Title' },
  { key: 'sub', type: 'textarea', label: 'Subtitle' },
]);
registerBlock('beacon-statement', BeaconStatement, [
  { key: 'eyebrow', type: 'text', label: 'Eyebrow' },
  { key: 'title', type: 'textarea', label: 'Title' },
  { key: 'sub', type: 'textarea', label: 'Subtitle' },
  { key: 'tone', type: 'select', label: 'Tone', options: ['problem', 'solution'] },
]);
registerBlock('beacon-steps', BeaconSteps, [
  { key: 'eyebrow', type: 'text', label: 'Eyebrow' },
  { key: 'title', type: 'textarea', label: 'Title' },
]);
registerBlock('beacon-market', BeaconMarket, [
  { key: 'eyebrow', type: 'text', label: 'Eyebrow' },
  { key: 'title', type: 'textarea', label: 'Title' },
]);
registerBlock('beacon-traction', BeaconTraction, [
  { key: 'eyebrow', type: 'text', label: 'Eyebrow' },
  { key: 'title', type: 'textarea', label: 'Title' },
]);
registerBlock('beacon-team', BeaconTeam, [
  { key: 'eyebrow', type: 'text', label: 'Eyebrow' },
  { key: 'title', type: 'textarea', label: 'Title' },
]);
registerBlock('beacon-ask', BeaconAsk, [
  { key: 'eyebrow', type: 'text', label: 'Eyebrow' },
  { key: 'amount', type: 'text', label: 'Amount' },
  { key: 'title', type: 'textarea', label: 'Title' },
]);
