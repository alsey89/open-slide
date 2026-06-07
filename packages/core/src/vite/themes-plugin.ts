import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import type { Plugin } from 'vite';
import type { OpenSlideConfig } from '../config.ts';

export type ThemesPluginOptions = {
  userCwd: string;
  config: OpenSlideConfig;
};

const THEMES_VMOD = 'virtual:open-slide/themes';

function resolved(id: string): string {
  return `\0${id}`;
}

export type ParsedTheme = {
  id: string;
  name: string;
  description: string;
  design: Record<string, unknown>;
};

export function parseThemeFile(id: string, raw: string): ParsedTheme {
  let data: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      data = parsed as Record<string, unknown>;
    }
  } catch {
    data = {};
  }
  const name = typeof data.name === 'string' && data.name ? data.name : id;
  const description = typeof data.description === 'string' ? data.description : '';
  const design =
    data.design && typeof data.design === 'object' && !Array.isArray(data.design)
      ? (data.design as Record<string, unknown>)
      : {};
  return { id, name, description, design };
}

export function generateThemesModule(themes: ParsedTheme[]): string {
  return `// virtual:open-slide/themes — generated\nexport const themes = ${JSON.stringify(themes)};\n`;
}

async function findThemeFiles(themesRoot: string): Promise<string[]> {
  if (!existsSync(themesRoot)) return [];
  const hits = await fg('*.json', { cwd: themesRoot, absolute: true, onlyFiles: true });
  return hits.sort();
}

async function readThemes(themesRoot: string): Promise<ParsedTheme[]> {
  const files = await findThemeFiles(themesRoot);
  return Promise.all(
    files.map(async (abs) =>
      parseThemeFile(path.basename(abs, '.json'), await fs.readFile(abs, 'utf8')),
    ),
  );
}

export function themesPlugin(opts: ThemesPluginOptions): Plugin {
  const { userCwd, config } = opts;
  const themesDir = config.themesDir ?? 'themes';
  const themesRoot = path.resolve(userCwd, themesDir);

  return {
    name: 'open-slide:themes',
    resolveId(id) {
      if (id === THEMES_VMOD) return resolved(THEMES_VMOD);
      return null;
    },
    async load(id) {
      if (id !== resolved(THEMES_VMOD)) return null;
      return generateThemesModule(await readThemes(themesRoot));
    },
    configureServer(server) {
      const isThemeFile = (p: string) => {
        const rel = path.relative(themesRoot, p);
        if (rel.startsWith('..') || path.isAbsolute(rel)) return false;
        if (rel.includes(path.sep)) return false;
        return rel.endsWith('.json');
      };

      let reloadTimer: ReturnType<typeof setTimeout> | null = null;
      const reload = () => {
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          reloadTimer = null;
          const mod = server.moduleGraph.getModuleById(resolved(THEMES_VMOD));
          if (mod) server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
        }, 150);
      };

      if (existsSync(themesRoot)) server.watcher.add(themesRoot);
      server.watcher.on('add', (p) => {
        if (isThemeFile(p)) reload();
      });
      server.watcher.on('unlink', (p) => {
        if (isThemeFile(p)) reload();
      });
      server.watcher.on('change', (p) => {
        if (isThemeFile(p)) reload();
      });
    },
  };
}
