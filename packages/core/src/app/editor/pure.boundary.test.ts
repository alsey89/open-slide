import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const editorDir = dirname(fileURLToPath(import.meta.url));

// These modules are node-tested under vitest (no `@` alias, node env), so they
// MUST stay React-free and alias-free. The browser-only files (dev-host,
// use-editor, *.tsx) are exempt — they are covered by tsc + the browser pass.
const PURE_MODULES = [
  'deck-host.ts',
  'memory-host.ts',
  'history.ts',
  'editor-store.ts',
  'block-ops.ts',
];

function runtimeImports(src: string): string[] {
  const out: string[] = [];
  const fromClause = /^\s*import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/gm;
  for (const m of src.matchAll(fromClause)) out.push(m[1]);
  return out;
}

describe('editor pure boundary', () => {
  for (const file of PURE_MODULES) {
    it(`${file} has no runtime react/alias/tsx imports`, () => {
      const src = readFileSync(join(editorDir, file), 'utf8');
      for (const spec of runtimeImports(src)) {
        expect(spec, `${file} runtime-imports ${spec}`).not.toBe('react');
        expect(spec, `${file} runtime-imports ${spec}`).not.toBe('react-dom');
        expect(spec.startsWith('@/'), `${file} runtime-imports alias ${spec}`).toBe(false);
        expect(spec.endsWith('.tsx'), `${file} runtime-imports tsx ${spec}`).toBe(false);
      }
    });
  }
});
