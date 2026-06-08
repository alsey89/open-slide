// Register custom React blocks here, then place them by `type` in any deck.json
// slot — exactly like a built-in block.
//
// The optional third argument to registerBlock is a PROP SCHEMA. Declare it and
// the block gets typed fields in the WYSIWYG editor (press `E` in the dev
// server) instead of a raw-JSON editor. Field types: text, textarea, number,
// boolean, select (needs `options`), color, string-list.
//
// Tag each text element with data-osd-text="<propKey>" (where the element's text
// is exactly String(block.props[propKey] ?? '')) so it edits in place on the
// slide. See the slide-authoring skill for the full contract.
//
// Style with the deck's design tokens (CSS vars) so custom blocks inherit the
// theme: --osd-bg, --osd-surface, --osd-text, --osd-muted, --osd-accent,
// --osd-border, --osd-font-display, --osd-font-body, --osd-size-hero/-heading/
// -body/-caption, --osd-space, --osd-radius, --osd-shadow.
//
// Uncomment to try it, then add { "type": "badge", "props": { "text": "New" } }
// to a slot in a deck.json:
//
// import { type Block, registerBlock } from '@open-slide/core';
//
// function Badge({ block }: { block: Block }) {
//   return (
//     <span
//       data-osd-text="text"
//       style={{
//         display: 'inline-flex',
//         background: 'var(--osd-accent)',
//         color: 'var(--osd-bg)',
//         padding: 'calc(var(--osd-space) * 1) calc(var(--osd-space) * 2)',
//         borderRadius: 'var(--osd-radius)',
//         fontFamily: 'var(--osd-font-body)',
//         fontSize: 'var(--osd-size-caption)',
//       }}
//     >
//       {String(block.props.text ?? '')}
//     </span>
//   );
// }
//
// registerBlock('badge', Badge, [{ key: 'text', type: 'text', label: 'Text' }]);

export {};
