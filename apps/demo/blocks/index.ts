import { registerBlock } from '@open-slide/core';
import { createElement } from 'react';

registerBlock('callout', ({ block }) =>
  createElement(
    'div',
    {
      style: {
        border: '2px solid var(--osd-accent)',
        borderRadius: 'var(--osd-radius)',
        padding: 32,
        fontFamily: 'var(--osd-font-body)',
        fontSize: 'var(--osd-size-body)',
        color: 'var(--osd-text)',
      },
    },
    String(block.props.text ?? ''),
  ),
);
