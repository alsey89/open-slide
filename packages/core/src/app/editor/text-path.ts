import type { Block } from '../../doc/model.ts';
import type { EditOp } from '../../doc/ops.ts';

export class TextPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TextPathError';
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object';
}

export function getTextAtPath(props: Record<string, unknown>, path: string): string {
  let cursor: unknown = props;
  for (const seg of path.split('.')) {
    if (!isObject(cursor)) return '';
    cursor = cursor[seg];
  }
  return cursor == null ? '' : String(cursor);
}

export function buildTextUpdateOp(block: Block, path: string, text: string): EditOp {
  const segments = path.split('.');
  const topKey = segments[0];
  if (segments.length === 1) {
    return { kind: 'update-block-props', blockId: block.id, props: { [topKey]: text } };
  }
  const cloned = structuredClone(block.props[topKey]);
  let cursor: unknown = cloned;
  for (let i = 1; i < segments.length - 1; i++) {
    if (!isObject(cursor)) {
      throw new TextPathError(`cannot resolve path "${path}" on block ${block.id}`);
    }
    cursor = cursor[segments[i]];
  }
  if (!isObject(cursor)) {
    throw new TextPathError(`cannot resolve path "${path}" on block ${block.id}`);
  }
  cursor[segments[segments.length - 1]] = text;
  return { kind: 'update-block-props', blockId: block.id, props: { [topKey]: cloned } };
}
