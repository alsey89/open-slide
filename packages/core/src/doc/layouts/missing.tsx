export function MissingLayout({ layout }: { layout: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--osd-bg)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--osd-accent)',
        fontFamily: 'var(--osd-font-body)',
        fontSize: 32,
      }}
    >
      unknown layout: {layout}
    </div>
  );
}
