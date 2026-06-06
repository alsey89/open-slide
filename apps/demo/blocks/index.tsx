import { registerBlock, registerLayout } from '@open-slide/core';

// ── Shared style injection (keyframes + Google Font) ─────────────────────────
// Rendered once by gradient-hero. CSS animations are fine in static render
// (they simply don't animate); no browser API is called at module scope.

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`;

function FxStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,700;9..144,900&family=Spline+Sans+Mono:wght@400;500&display=swap');

      @keyframes meshDrift1 {
        0%   { transform: translate(0px, 0px) scale(1);   }
        33%  { transform: translate(60px, -40px) scale(1.08); }
        66%  { transform: translate(-40px, 50px) scale(0.95); }
        100% { transform: translate(0px, 0px) scale(1);   }
      }
      @keyframes meshDrift2 {
        0%   { transform: translate(0px, 0px) scale(1);   }
        40%  { transform: translate(-80px, 60px) scale(1.1); }
        70%  { transform: translate(50px, -30px) scale(0.92); }
        100% { transform: translate(0px, 0px) scale(1);   }
      }
      @keyframes meshDrift3 {
        0%   { transform: translate(0px, 0px); }
        50%  { transform: translate(40px, 80px); }
        100% { transform: translate(0px, 0px); }
      }
      @keyframes marqueeScroll {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      @keyframes fadeSlideUp {
        from { opacity: 0; transform: translateY(28px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes statPop {
        from { opacity: 0; transform: scale(0.85); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes lineGlow {
        0%, 100% { box-shadow: 0 0 0px 0px transparent; }
        50%       { box-shadow: 0 0 12px 2px var(--osd-accent); }
      }
      .osd-card-fx {
        transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease;
      }
      .osd-card-fx:hover {
        transform: translateY(-6px) scale(1.015);
        box-shadow: 0 24px 48px -8px rgba(0,0,0,0.55);
      }
    `}</style>
  );
}

// ── 1. callout (original, kept) ───────────────────────────────────────────────
registerBlock('callout', ({ block }) => (
  <div
    style={{
      border: '2px solid var(--osd-accent)',
      borderRadius: 'var(--osd-radius)',
      padding: 32,
      fontFamily: 'var(--osd-font-body)',
      fontSize: 'var(--osd-size-body)',
      color: 'var(--osd-text)',
    }}
  >
    {String(block.props.text ?? '')}
  </div>
));

// ── 2. gradient-hero ──────────────────────────────────────────────────────────
registerBlock('gradient-hero', ({ block }) => {
  const eyebrow = String(block.props.eyebrow ?? '');
  const title = String(block.props.title ?? '');
  const sub = String(block.props.sub ?? '');

  return (
    <>
      <FxStyles />
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: 'var(--osd-bg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px 96px',
          boxSizing: 'border-box',
        }}
      >
        {/* Grain overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: GRAIN_SVG,
            backgroundRepeat: 'repeat',
            opacity: 0.55,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        {/* Mesh blob 1 — accent */}
        <div
          style={{
            position: 'absolute',
            width: 820,
            height: 820,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--osd-accent) 55%, transparent) 0%, transparent 70%)',
            filter: 'blur(120px)',
            top: -200,
            right: -100,
            animation: 'meshDrift1 18s ease-in-out infinite',
            zIndex: 0,
          }}
        />
        {/* Mesh blob 2 — hot magenta */}
        <div
          style={{
            position: 'absolute',
            width: 700,
            height: 700,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,30,120,0.38) 0%, transparent 68%)',
            filter: 'blur(100px)',
            bottom: -180,
            left: 80,
            animation: 'meshDrift2 22s ease-in-out infinite',
            zIndex: 0,
          }}
        />
        {/* Mesh blob 3 — electric cyan */}
        <div
          style={{
            position: 'absolute',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,240,220,0.22) 0%, transparent 70%)',
            filter: 'blur(90px)',
            bottom: 100,
            right: 300,
            animation: 'meshDrift3 26s ease-in-out infinite',
            zIndex: 0,
          }}
        />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1100 }}>
          {eyebrow && (
            <div
              style={{
                display: 'inline-block',
                fontFamily: "'Spline Sans Mono', ui-monospace, monospace",
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--osd-accent)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid color-mix(in srgb, var(--osd-accent) 40%, transparent)',
                borderRadius: 6,
                padding: '6px 14px',
                marginBottom: 36,
                animation: 'fadeSlideUp 0.6s ease both',
                animationDelay: '0.05s',
              }}
            >
              {eyebrow}
            </div>
          )}
          <h1
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 140,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: 'var(--osd-text)',
              margin: 0,
              marginBottom: 32,
              animation: 'fadeSlideUp 0.7s ease both',
              animationDelay: '0.18s',
            }}
          >
            {title}
          </h1>
          {sub && (
            <p
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 28,
                fontWeight: 300,
                color: 'color-mix(in srgb, var(--osd-text) 60%, transparent)',
                margin: 0,
                maxWidth: 720,
                lineHeight: 1.45,
                animation: 'fadeSlideUp 0.7s ease both',
                animationDelay: '0.34s',
              }}
            >
              {sub}
            </p>
          )}
        </div>
      </div>
    </>
  );
});

// ── 3. big-stat ───────────────────────────────────────────────────────────────
registerBlock('big-stat', ({ block }) => {
  const value = String(block.props.value ?? '');
  const label = String(block.props.label ?? '');
  const caption = String(block.props.caption ?? '');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '40px 32px',
        boxSizing: 'border-box',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 280,
          fontWeight: 900,
          lineHeight: 0.88,
          letterSpacing: '-0.04em',
          background: 'linear-gradient(135deg, var(--osd-accent) 0%, #ff1e78 45%, #00f0dc 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'statPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {value}
      </div>
      {label && (
        <div
          style={{
            fontFamily: "'Spline Sans Mono', ui-monospace, monospace",
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--osd-text)',
            marginTop: 20,
            animation: 'fadeSlideUp 0.5s ease both',
            animationDelay: '0.2s',
          }}
        >
          {label}
        </div>
      )}
      {caption && (
        <div
          style={{
            fontFamily: "'Spline Sans Mono', ui-monospace, monospace",
            fontSize: 14,
            color: 'color-mix(in srgb, var(--osd-text) 40%, transparent)',
            marginTop: 10,
            letterSpacing: '0.06em',
            animation: 'fadeSlideUp 0.5s ease both',
            animationDelay: '0.35s',
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
});

// ── 4. pill-row ───────────────────────────────────────────────────────────────
registerBlock('pill-row', ({ block }) => {
  const items: string[] = Array.isArray(block.props.items) ? block.props.items : [];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        padding: '24px 32px',
        alignItems: 'center',
      }}
    >
      {items.map((item) => (
        <span
          key={String(item)}
          style={{
            fontFamily: "'Spline Sans Mono', ui-monospace, monospace",
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: '0.08em',
            color: 'var(--osd-text)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 999,
            padding: '8px 20px',
            whiteSpace: 'nowrap',
            animation: 'fadeSlideUp 0.45s ease both',
          }}
        >
          {String(item)}
        </span>
      ))}
    </div>
  );
});

// ── 5. feature-cards ─────────────────────────────────────────────────────────
registerBlock('feature-cards', ({ block }) => {
  type CardItem = { icon?: unknown; title?: unknown; desc?: unknown };
  const raw = block.props.items;
  const items: CardItem[] = Array.isArray(raw) ? (raw as CardItem[]) : [];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24,
        padding: '32px 40px',
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        alignContent: 'start',
      }}
    >
      {items.map((item) => (
        <div
          key={String(item.title ?? item.icon ?? item.desc ?? Math.random())}
          className="osd-card-fx"
          style={{
            background:
              'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            animation: 'fadeSlideUp 0.5s ease both',
          }}
        >
          <div style={{ fontSize: 44, lineHeight: 1 }}>{String(item.icon ?? '◆')}</div>
          <div
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--osd-text)',
              lineHeight: 1.2,
            }}
          >
            {String(item.title ?? '')}
          </div>
          <div
            style={{
              fontFamily: "'Spline Sans Mono', ui-monospace, monospace",
              fontSize: 14,
              color: 'color-mix(in srgb, var(--osd-text) 55%, transparent)',
              lineHeight: 1.6,
            }}
          >
            {String(item.desc ?? '')}
          </div>
        </div>
      ))}
    </div>
  );
});

// ── 6. code-window ────────────────────────────────────────────────────────────
registerBlock('code-window', ({ block }) => {
  const title = String(block.props.title ?? 'untitled.ts');
  const code = String(block.props.code ?? '');

  return (
    <div
      style={{
        width: '100%',
        padding: '32px 40px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 32px 80px -12px rgba(0,0,0,0.7)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Title bar */}
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            {(['#ff5f57', '#ffbd2e', '#28c840'] as const).map((c) => (
              <div
                key={c}
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  background: c,
                  boxShadow: `0 0 6px 1px ${c}66`,
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontFamily: "'Spline Sans Mono', ui-monospace, monospace",
              fontSize: 13,
              color: 'color-mix(in srgb, var(--osd-text) 45%, transparent)',
              letterSpacing: '0.04em',
              flex: 1,
              textAlign: 'center',
              marginRight: 52,
            }}
          >
            {title}
          </span>
        </div>
        {/* Code body */}
        <div style={{ background: 'rgba(0,0,0,0.45)', padding: '28px 32px' }}>
          <pre
            style={{
              margin: 0,
              fontFamily: "'Spline Sans Mono', ui-monospace, monospace",
              fontSize: 17,
              lineHeight: 1.75,
              color: 'color-mix(in srgb, var(--osd-text) 88%, transparent)',
              whiteSpace: 'pre',
              overflowX: 'auto',
              animation: 'lineGlow 3s ease-in-out infinite',
              animationDelay: '1.2s',
            }}
          >
            {code}
          </pre>
        </div>
      </div>
    </div>
  );
});

// ── 7. marquee ────────────────────────────────────────────────────────────────
registerBlock('marquee', ({ block }) => {
  const items: string[] = Array.isArray(block.props.items) ? block.props.items : [];
  const speed = Number(block.props.speed ?? 28);
  const content = items.length > 0 ? items : ['open-slide', 'blocks', 'layouts', 'motion'];
  const tagged = [
    ...content.map((t) => ({ t, k: `a-${t}` })),
    ...content.map((t) => ({ t, k: `b-${t}` })),
  ];
  const duration = `${speed}s`;

  return (
    <div
      style={{
        width: '100%',
        overflow: 'hidden',
        padding: '20px 0',
        boxSizing: 'border-box',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          whiteSpace: 'nowrap',
          animation: `marqueeScroll ${duration} linear infinite`,
          willChange: 'transform',
        }}
      >
        {tagged.map(({ t, k }) => (
          <span
            key={k}
            style={{
              fontFamily: "'Spline Sans Mono', ui-monospace, monospace",
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: '0.04em',
              color: 'var(--osd-accent)',
              paddingRight: 48,
            }}
          >
            {t}
            <span
              style={{
                color: 'color-mix(in srgb, var(--osd-accent) 35%, transparent)',
                marginLeft: 48,
              }}
            >
              {' •'}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
});

// ── 8. quote-spotlight ────────────────────────────────────────────────────────
registerBlock('quote-spotlight', ({ block }) => {
  const text = String(block.props.text ?? '');
  const by = String(block.props.by ?? '');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: '100%',
        padding: '60px 96px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Decorative quotation mark */}
      <div
        style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 320,
          fontWeight: 900,
          lineHeight: 0.75,
          background:
            'linear-gradient(135deg, var(--osd-accent) 0%, #ff1e78 50%, transparent 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          position: 'absolute',
          top: 20,
          left: 72,
          userSelect: 'none',
          pointerEvents: 'none',
          opacity: 0.35,
        }}
      >
        {'"'}
      </div>

      <blockquote style={{ margin: 0, position: 'relative', zIndex: 1 }}>
        <p
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 52,
            fontWeight: 300,
            fontStyle: 'italic',
            lineHeight: 1.35,
            color: 'var(--osd-text)',
            margin: 0,
            marginBottom: 36,
            animation: 'fadeSlideUp 0.7s ease both',
          }}
        >
          {text}
        </p>
        {by && (
          <cite
            style={{
              display: 'block',
              fontFamily: "'Spline Sans Mono', ui-monospace, monospace",
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--osd-accent)',
              fontStyle: 'normal',
              animation: 'fadeSlideUp 0.5s ease both',
              animationDelay: '0.25s',
            }}
          >
            {'— '}
            {by}
          </cite>
        )}
      </blockquote>
    </div>
  );
});

// ── Layout 1: bleed ───────────────────────────────────────────────────────────
registerLayout(
  'bleed',
  ({ renderSlot }) => (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {renderSlot('main')}
    </div>
  ),
  ['main'],
);

// ── Layout 2: split ───────────────────────────────────────────────────────────
registerLayout(
  'split',
  ({ renderSlot }) => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        boxSizing: 'border-box',
      }}
    >
      {/* aside — 38%, accent-tinted translucent panel */}
      <div
        style={{
          width: '38%',
          flexShrink: 0,
          height: '100%',
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--osd-accent) 12%, var(--osd-bg)) 0%, var(--osd-bg) 100%)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          padding: '56px 48px',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >
        {renderSlot('aside')}
      </div>
      {/* main — 62% */}
      <div
        style={{
          flex: 1,
          height: '100%',
          padding: '56px 56px',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >
        {renderSlot('main')}
      </div>
    </div>
  ),
  ['aside', 'main'],
);
