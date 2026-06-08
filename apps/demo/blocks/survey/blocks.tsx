import { type Block, registerBlock } from '@open-slide/core';
import type { CSSProperties } from 'react';
import { EMBER, SURVEY_MONO } from './shell.tsx';

const str = (v: unknown, fallback = ''): string => (v == null ? fallback : String(v));

const display = (size: number, weight = 600): CSSProperties => ({
  fontFamily: 'var(--osd-font-display)',
  fontSize: size,
  fontWeight: weight,
  lineHeight: 1.04,
  letterSpacing: '-0.012em',
  margin: 0,
});

function SurveyKicker({ block }: { block: Block }) {
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
      <span data-osd-text="text">{str(block.props.text, 'Eyebrow')}</span>
    </div>
  );
}

function SurveyHeadline({ block }: { block: Block }) {
  const hero = block.props.scale === 'hero';
  return (
    <h2 style={{ ...display(hero ? 138 : 66, 600), maxWidth: 1300 }} data-osd-text="text">
      {str(block.props.text)}
    </h2>
  );
}

function SurveyText({ block }: { block: Block }) {
  return (
    <p
      style={{
        fontSize: 33,
        lineHeight: 1.42,
        color: 'var(--osd-muted)',
        maxWidth: 980,
        margin: 0,
      }}
      data-osd-text="text"
    >
      {str(block.props.text)}
    </p>
  );
}

function SurveyPoints({ block }: { block: Block }) {
  const items = Array.isArray(block.props.items) ? (block.props.items as string[]) : [];
  const problem = block.props.tone === 'problem';
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 18 }}>
      {items.map((pt, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: deck content order is identity
          key={i}
          style={{
            display: 'flex',
            gap: 18,
            fontSize: 28,
            lineHeight: 1.4,
            alignItems: 'baseline',
          }}
        >
          <span style={{ fontFamily: SURVEY_MONO, fontSize: 20, color: EMBER, flexShrink: 0 }}>
            {problem ? '✕' : '◆'}
          </span>
          <span style={{ color: 'var(--osd-text)' }} data-osd-text={`items.${i}`}>
            {pt}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SurveyMetric({ block }: { block: Block }) {
  const p = block.props;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div
        style={{ ...display(120, 700), color: EMBER, fontVariantNumeric: 'tabular-nums' }}
        data-osd-text="value"
      >
        {str(p.value)}
      </div>
      {p.label != null && (
        <div
          style={{ fontFamily: SURVEY_MONO, fontSize: 24, color: 'var(--osd-text)' }}
          data-osd-text="label"
        >
          {str(p.label)}
        </div>
      )}
      {p.caption != null && (
        <div
          style={{ fontSize: 24, color: 'var(--osd-muted)', lineHeight: 1.4, maxWidth: 440 }}
          data-osd-text="caption"
        >
          {str(p.caption)}
        </div>
      )}
    </div>
  );
}

function SurveyStep({ block }: { block: Block }) {
  const p = block.props;
  return (
    <div
      style={{
        background: 'var(--osd-surface)',
        border: '1px solid var(--osd-border)',
        borderRadius: 'var(--osd-radius)',
        padding: 44,
        display: 'grid',
        gap: 22,
      }}
    >
      <div
        style={{ fontFamily: SURVEY_MONO, fontSize: 22, color: EMBER, letterSpacing: '0.14em' }}
        data-osd-text="n"
      >
        {str(p.n, '01')}
      </div>
      <div style={display(42, 600)} data-osd-text="title">
        {str(p.title)}
      </div>
      <div
        style={{ fontSize: 26, lineHeight: 1.46, color: 'var(--osd-muted)' }}
        data-osd-text="desc"
      >
        {str(p.desc)}
      </div>
    </div>
  );
}

function SurveyPerson({ block }: { block: Block }) {
  const p = block.props;
  const initials = (n: string) =>
    n
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('');
  return (
    <div
      style={{
        display: 'grid',
        gap: 24,
        padding: 40,
        background: 'var(--osd-surface)',
        border: '1px solid var(--osd-border)',
        borderRadius: 'var(--osd-radius)',
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
        {initials(str(p.name, '–'))}
      </div>
      <div>
        <div style={display(38, 600)} data-osd-text="name">
          {str(p.name)}
        </div>
        <div
          style={{ fontFamily: SURVEY_MONO, fontSize: 22, color: EMBER, marginTop: 8 }}
          data-osd-text="role"
        >
          {str(p.role)}
        </div>
        <div
          style={{ fontSize: 23, color: 'var(--osd-muted)', marginTop: 12, lineHeight: 1.42 }}
          data-osd-text="prev"
        >
          {str(p.prev)}
        </div>
      </div>
    </div>
  );
}

function SurveyBars({ block }: { block: Block }) {
  const segments = (Array.isArray(block.props.segments) ? block.props.segments : []) as Array<{
    label?: string;
    value?: string;
    note?: string;
  }>;
  const heights = [560, 360, 200];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.05fr',
        alignItems: 'center',
        gap: 90,
        height: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 40,
          height: 560,
        }}
      >
        {segments.slice(0, 3).map((seg, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: chart order is identity
          <div key={i} style={{ display: 'grid', gap: 18, justifyItems: 'center', width: 150 }}>
            <div style={{ ...display(40, 700), color: EMBER, fontVariantNumeric: 'tabular-nums' }}>
              {str(seg.value)}
            </div>
            <div
              style={{
                width: 150,
                height: heights[i] ?? 160,
                borderRadius: '10px 10px 0 0',
                background: i === 0 ? EMBER : 'transparent',
                border: `1.5px solid ${EMBER}`,
                opacity: i === 0 ? 1 : 0.45,
                transformOrigin: 'bottom',
                animation: `bcn-rise .7s ease ${i * 0.12}s both`,
              }}
            />
            <div style={{ fontFamily: SURVEY_MONO, fontSize: 22, color: EMBER }}>
              {str(seg.label)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 22 }}>
        {segments.map((seg, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: legend order is identity
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
            <span
              style={{ fontFamily: SURVEY_MONO, fontSize: 22, color: EMBER, width: 64 }}
              data-osd-text={`segments.${i}.label`}
            >
              {str(seg.label)}
            </span>
            <span
              style={{ ...display(30, 700), fontVariantNumeric: 'tabular-nums' }}
              data-osd-text={`segments.${i}.value`}
            >
              {str(seg.value)}
            </span>
            <span
              style={{ fontSize: 25, color: 'var(--osd-muted)', lineHeight: 1.35 }}
              data-osd-text={`segments.${i}.note`}
            >
              {str(seg.note)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SurveySpark({ block }: { block: Block }) {
  const series = (
    Array.isArray(block.props.series) ? block.props.series : [2, 6, 11, 19, 34, 58]
  ) as number[];
  const W = 1680;
  const H = 360;
  const max = Math.max(...series, 1);
  const pts = series.map(
    (v, i) => [(i / Math.max(series.length - 1, 1)) * W, H - (v / max) * (H - 30)] as const,
  );
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }} preserveAspectRatio="none">
      <title>Coverage growth over time</title>
      <defs>
        <linearGradient id="survey-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--osd-accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--osd-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#survey-area)" />
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
          // biome-ignore lint/suspicious/noArrayIndexKey: point order is identity
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
  );
}

function SurveyPing({ block }: { block: Block }) {
  const size = typeof block.props.size === 'number' ? block.props.size : 300;
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

registerBlock('survey-kicker', SurveyKicker, [{ key: 'text', type: 'text', label: 'Text' }]);
registerBlock('survey-headline', SurveyHeadline, [
  { key: 'text', type: 'textarea', label: 'Text' },
  { key: 'scale', type: 'select', label: 'Scale', options: ['hero', 'h2'] },
]);
registerBlock('survey-text', SurveyText, [{ key: 'text', type: 'textarea', label: 'Text' }]);
registerBlock('survey-points', SurveyPoints, [
  { key: 'items', type: 'string-list', label: 'Items' },
  { key: 'tone', type: 'select', label: 'Tone', options: ['problem', 'solution'] },
]);
registerBlock('survey-metric', SurveyMetric, [
  { key: 'value', type: 'text', label: 'Value' },
  { key: 'label', type: 'text', label: 'Label' },
  { key: 'caption', type: 'textarea', label: 'Caption' },
]);
registerBlock('survey-step', SurveyStep, [
  { key: 'n', type: 'text', label: 'Number' },
  { key: 'title', type: 'text', label: 'Title' },
  { key: 'desc', type: 'textarea', label: 'Description' },
]);
registerBlock('survey-person', SurveyPerson, [
  { key: 'name', type: 'text', label: 'Name' },
  { key: 'role', type: 'text', label: 'Role' },
  { key: 'prev', type: 'textarea', label: 'Background' },
]);
registerBlock('survey-bars', SurveyBars);
registerBlock('survey-spark', SurveySpark, [{ key: 'caption', type: 'text', label: 'Caption' }]);
registerBlock('survey-ping', SurveyPing, [{ key: 'size', type: 'number', label: 'Size' }]);
