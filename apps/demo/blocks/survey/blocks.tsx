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
