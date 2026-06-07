import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

// The esbuild-wasm browser build references `self`; polyfill it before importing.
if (typeof globalThis.self === 'undefined') globalThis.self = globalThis;

import * as esbuild from 'esbuild-wasm/esm/browser.js';

const require = createRequire(import.meta.url);

const SAMPLE_BLOCK = `
import type { Block } from '@open-slide/core/doc';
export function Timeline({ block }: { block: Block }) {
  const events = (block.props.events as string[]) ?? [];
  return (
    <ol style={{ display: 'grid', gap: 8 }}>
      {events.map((e, i) => <li key={i}>{e}</li>)}
    </ol>
  );
}
`;

async function main() {
  const wasmPath = require.resolve('esbuild-wasm/esbuild.wasm');
  const wasmSize = statSync(wasmPath).size;

  const t0 = performance.now();
  await esbuild.initialize({
    wasmModule: await WebAssembly.compile(readFileSync(wasmPath)),
    worker: false,
  });
  const initMs = performance.now() - t0;

  const t1 = performance.now();
  const result = await esbuild.build({
    stdin: { contents: SAMPLE_BLOCK, loader: 'tsx', sourcefile: 'timeline.tsx' },
    bundle: true,
    write: false,
    format: 'esm',
    jsx: 'automatic',
    external: ['react', 'react/jsx-runtime', '@open-slide/core/doc'],
  });
  const compileMs = performance.now() - t1;

  const code = result.outputFiles[0].text;
  const outBytes = Buffer.byteLength(code, 'utf8');

  const exportsComponent =
    /export\s*\{[^}]*Timeline/.test(code) || /export\s+function\s+Timeline/.test(code);

  const findings = [
    '# esbuild-wasm block-compile spike — findings',
    '',
    `- esbuild.wasm payload: ${(wasmSize / 1024 / 1024).toFixed(2)} MB`,
    `- initialize(): ${initMs.toFixed(0)} ms (one-time, cold)`,
    `- build() one block: ${compileMs.toFixed(0)} ms`,
    `- compiled output size: ${outBytes} bytes`,
    `- output is ESM exporting the component: ${exportsComponent ? 'yes' : 'NO — investigate'}`,
    `- react kept external (host provides it): ${code.includes('react/jsx-runtime') ? 'yes' : 'check'}`,
    '',
    '## Verdict',
    'TODO after running: is the wasm payload + init time acceptable for the Tauri webview (M3)?',
    '',
    '## Raw compiled output',
    '```js',
    code.trim(),
    '```',
  ].join('\n');

  writeFileSync(new URL('./FINDINGS.md', import.meta.url), findings);
  console.log(findings.split('\n## Raw')[0]);
  await esbuild.stop();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
