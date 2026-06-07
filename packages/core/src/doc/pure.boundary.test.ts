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

// Match runtime imports only — `import type ... from '...'` is erased at build, so it is allowed.
function runtimeImports(src: string): string[] {
  const re = /^\s*import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/gm;
  return [...src.matchAll(re)].map((m) => m[1]);
}

describe('doc pure boundary', () => {
  for (const file of PURE_MODULES) {
    it(`${file} has no runtime react/app imports`, () => {
      const src = readFileSync(join(docDir, file), 'utf8');
      for (const spec of runtimeImports(src)) {
        expect(spec, `${file} runtime-imports ${spec}`).not.toBe('react');
        expect(spec, `${file} runtime-imports ${spec}`).not.toBe('react-dom');
        expect(spec.includes('/app/'), `${file} runtime-imports app module ${spec}`).toBe(false);
        expect(spec.endsWith('.tsx'), `${file} runtime-imports a .tsx module ${spec}`).toBe(false);
      }
    });
  }
});
