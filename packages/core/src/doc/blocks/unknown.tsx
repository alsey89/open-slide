export function UnknownBlock({ type }: { type: string }) {
  return (
    <div
      style={{
        border: '2px dashed var(--osd-accent)',
        borderRadius: 'var(--osd-radius)',
        padding: 24,
        color: 'var(--osd-accent)',
        fontFamily: 'var(--osd-font-body)',
        fontSize: 'calc(var(--osd-size-body) * 0.8)',
      }}
    >
      unknown block: {type}
    </div>
  );
}
