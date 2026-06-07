import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { InlineConfig } from 'vite';
import { apiPlugin } from './api-plugin.ts';
import { currentPlugin } from './current-plugin.ts';
import { notesPlugin } from './notes-plugin.ts';
import { loadUserConfig, type OpenSlideConfig, openSlidePlugin } from './open-slide-plugin.ts';
import { themesPlugin } from './themes-plugin.ts';

function findPackageRoot(fromFile: string): string {
  let dir = path.dirname(fromFile);
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error(`Could not find package.json walking up from ${fromFile}`);
}

const PKG_ROOT = findPackageRoot(fileURLToPath(import.meta.url));
const APP_ROOT = path.join(PKG_ROOT, 'src', 'app');
const CORE_SRC_ENTRY = path.join(PKG_ROOT, 'src', 'index.ts');

function readCoreVersion(): string {
  try {
    const raw = readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8');
    return (JSON.parse(raw) as { version?: string }).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const CORE_VERSION = readCoreVersion();

export type CreateViteConfigOptions = {
  userCwd: string;
  config?: OpenSlideConfig;
  mode?: 'serve' | 'build';
};

export async function createViteConfig(opts: CreateViteConfigOptions): Promise<InlineConfig> {
  const userCwd = path.resolve(opts.userCwd);
  const config = opts.config ?? (await loadUserConfig(userCwd));
  const slidesDir = config.slidesDir ?? 'slides';
  const themesDir = config.themesDir ?? 'themes';
  const assetsDir = config.assetsDir ?? 'assets';
  const slidesAbs = path.resolve(userCwd, slidesDir);
  const themesAbs = path.resolve(userCwd, themesDir);
  const assetsAbs = path.resolve(userCwd, assetsDir);

  return {
    root: APP_ROOT,
    configFile: false,
    envDir: userCwd,
    plugins: [
      react(),
      tailwindcss(),
      openSlidePlugin({ userCwd, config, coreVersion: CORE_VERSION }),
      themesPlugin({ userCwd, config }),
      apiPlugin({ userCwd, slidesDir, themesDir, assetsDir, coreVersion: CORE_VERSION }),
      notesPlugin({ userCwd, slidesDir }),
      currentPlugin({ userCwd, slidesDir }),
    ],
    resolve: {
      alias: [
        { find: '@assets', replacement: assetsAbs },
        { find: '@', replacement: APP_ROOT },
        // The app runs from core's `src` (the Vite root is src/app), but project
        // blocks import the package by name, which resolves to `dist`. That gives two
        // copies of the block/layout registry, so custom blocks/layouts register into
        // one and the renderer reads the other → "unknown layout/block". Alias the bare
        // specifier to core's source entry so both share one registry. Exact match only,
        // so subpaths like `@open-slide/core/vite` are untouched.
        ...(existsSync(CORE_SRC_ENTRY)
          ? [{ find: /^@open-slide\/core$/, replacement: CORE_SRC_ENTRY }]
          : []),
      ],
      // Project custom blocks live outside the Vite root and import React via the
      // automatic JSX runtime; without dedupe they resolve to a second React instance,
      // producing "invalid hook call" crashes at runtime.
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    optimizeDeps: {
      entries: [path.join(APP_ROOT, 'main.tsx')],
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'next-themes',
        'react-router-dom',
        'radix-ui',
        'lucide-react',
        'clsx',
        'tailwind-merge',
        'class-variance-authority',
        'emoji-picker-react',
      ],
      // The app source ships inside node_modules/@open-slide/core/src/app, so
      // Vite's dep scanner traverses it as if it were a third-party dep and
      // tries to bundle our virtual imports with esbuild. Mark them external.
      esbuildOptions: {
        plugins: [
          {
            name: 'open-slide:virtual-externals',
            setup(build) {
              build.onResolve({ filter: /^virtual:open-slide\// }, (args) => ({
                path: args.path,
                external: true,
              }));
            },
          },
        ],
      },
    },
    server: {
      port: config.port ?? 5173,
      fs: { allow: [APP_ROOT, userCwd, slidesAbs, themesAbs, assetsAbs] },
    },
    build: {
      outDir: path.resolve(userCwd, 'dist'),
      emptyOutDir: true,
    },
  };
}

export { APP_ROOT };
