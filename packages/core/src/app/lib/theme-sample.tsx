export function ThemeSample() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
        padding: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <span
          style={{
            fontSize: 'var(--osd-size-caption)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--osd-accent)',
          }}
        >
          Theme preview
        </span>
        <h1
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 'var(--osd-size-hero)',
            lineHeight: 1.02,
            margin: 0,
            fontWeight: 700,
          }}
        >
          Typography
        </h1>
        <p
          style={{
            fontSize: 'var(--osd-size-body)',
            lineHeight: 1.45,
            margin: 0,
            maxWidth: 1100,
            color: 'var(--osd-muted)',
          }}
        >
          The quick brown fox jumps over the lazy dog — body copy at the deck's base size.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 32, alignItems: 'stretch' }}>
        <div
          style={{
            flex: 1,
            background: 'var(--osd-surface)',
            border: '1px solid var(--osd-border)',
            borderRadius: 'var(--osd-radius)',
            boxShadow: 'var(--osd-shadow)',
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--osd-font-display)',
              fontSize: 'var(--osd-size-heading)',
              fontWeight: 700,
            }}
          >
            01
          </span>
          <span style={{ fontSize: 'var(--osd-size-caption)', color: 'var(--osd-muted)' }}>
            Surface card
          </span>
        </div>
        <div
          style={{
            flex: 1,
            background: 'var(--osd-accent)',
            color: 'var(--osd-bg)',
            borderRadius: 'var(--osd-radius)',
            padding: 48,
            display: 'flex',
            alignItems: 'flex-end',
            fontFamily: 'var(--osd-font-display)',
            fontSize: 'var(--osd-size-heading)',
            fontWeight: 700,
          }}
        >
          Accent
        </div>
      </div>
    </div>
  );
}
