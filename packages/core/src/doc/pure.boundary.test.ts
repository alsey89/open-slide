import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const docDir = dirname(fileURLToPath(import.meta.url));

// These modules MUST stay runtime-React-free and app-free so the API/MCP can import them in Node.
const PURE_MODULES = [
  'model.ts',
  'ops.ts',
  'validate.ts',
  'registry.ts',
  'design.ts',
  'transition.ts',
  'ids.ts',
  'pure.ts',
];

// Collect every runtime module specifier: `import ... from`, `export ... from`, and
// side-effect `import '...'`. Type-only forms (`import type`, `export type`) are erased
// at build, so they are intentionally excluded.
function runtimeSpecifiers(src: string): string[] {
  const out: string[] = [];
  const fromClause = /^\s*(?:import|export)\s+(?!type\b)[^;'"]*?from\s+['"]([^'"]+)['"]/gm;
  const sideEffect = /^\s*import\s+['"]([^'"]+)['"]/gm;
  for (const m of src.matchAll(fromClause)) out.push(m[1]);
  for (const m of src.matchAll(sideEffect)) out.push(m[1]);
  return out;
}

describe('doc pure boundary', () => {
  for (const file of PURE_MODULES) {
    it(`${file} has no runtime react/app imports`, () => {
      const src = readFileSync(join(docDir, file), 'utf8');
      for (const spec of runtimeSpecifiers(src)) {
        expect(spec, `${file} runtime-imports ${spec}`).not.toBe('react');
        expect(spec, `${file} runtime-imports ${spec}`).not.toBe('react-dom');
        expect(spec.includes('/app/'), `${file} runtime-imports app module ${spec}`).toBe(false);
        expect(spec.endsWith('.tsx'), `${file} runtime-imports a .tsx module ${spec}`).toBe(false);
      }
    });
  }
});
