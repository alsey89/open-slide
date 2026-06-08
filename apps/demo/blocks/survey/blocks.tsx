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
        // biome-ignore lint/suspicious/noArrayIndexKey: deck content order is identity
        <li
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
