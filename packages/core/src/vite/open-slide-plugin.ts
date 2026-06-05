import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { loadConfigFromFile, type Plugin, type ViteDevServer } from 'vite';
import type { OpenSlideConfig } from '../config.ts';

export type { OpenSlideConfig };

export type OpenSlidePluginOptions = {
  userCwd: string;
  config: OpenSlideConfig;
  coreVersion: string;
};

const CONFIG_FILE = 'open-slide.config.ts';

const SLIDES_VMOD = 'virtual:open-slide/slides';
const CONFIG_VMOD = 'virtual:open-slide/config';
const FOLDERS_VMOD = 'virtual:open-slide/folders';
const BLOCKS_VMOD = 'virtual:open-slide/blocks';

type FoldersManifest = {
  folders: unknown[];
  assignments: Record<string, string>;
};

async function readFoldersManifest(file: string): Promise<FoldersManifest> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<FoldersManifest>;
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      assignments:
        parsed.assignments && typeof parsed.assignments === 'object'
          ? (parsed.assignments as Record<string, string>)
          : {},
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { folders: [], assignments: {} };
    }
    throw err;
  }
}

function resolved(id: string): string {
  return `\0${id}`;
}

async function findSlides(userCwd: string, slidesDir: string): Promise<string[]> {
  const abs = path.resolve(userCwd, slidesDir);
  if (!existsSync(abs)) return [];
  const hits = await fg('*/deck.json', {
    cwd: abs,
    absolute: true,
    onlyFiles: true,
  });
  return hits.sort();
}

function toId(absFile: string, slidesRoot: string): string {
  const rel = path.relative(slidesRoot, absFile);
  return rel.split(path.sep)[0];
}

type ExtractedMeta = { theme: string | null; createdAt: string | null };

function readDeckMetaFromJson(raw: string): ExtractedMeta {
  try {
    const parsed = JSON.parse(raw) as { meta?: { theme?: unknown; createdAt?: unknown } };
    const meta = parsed?.meta ?? {};
    return {
      theme: typeof meta.theme === 'string' ? meta.theme : null,
      createdAt: typeof meta.createdAt === 'string' ? meta.createdAt : null,
    };
  } catch {
    return { theme: null, createdAt: null };
  }
}

async function readSlideMeta(abs: string): Promise<ExtractedMeta> {
  try {
    return readDeckMetaFromJson(await fs.readFile(abs, 'utf8'));
  } catch {
    return { theme: null, createdAt: null };
  }
}

function slideIdForEntry(p: string, slidesRoot: string): string | null {
  const rel = path.relative(slidesRoot, p);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  if (parts.length !== 2) return null;
  if (parts[1] !== 'deck.json') return null;
  return parts[0];
}

function parseCreatedAtMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

async function generateSlidesModule(
  files: string[],
  slidesRoot: string,
  isDev: boolean,
): Promise<string> {
  const entries = await Promise.all(
    files.map(async (abs) => {
      const id = toId(abs, slidesRoot);
      const importPath = isDev ? `/@fs/${abs.replace(/^\/+/, '')}` : abs;
      const meta = await readSlideMeta(abs);
      return { id, importPath, theme: meta.theme, createdAt: parseCreatedAtMs(meta.createdAt) };
    }),
  );

  const ids = JSON.stringify(entries.map((e) => e.id).sort());
  const themesMap: Record<string, string> = {};
  const createdAtMap: Record<string, number> = {};
  for (const e of entries) {
    if (e.theme) themesMap[e.id] = e.theme;
    if (e.createdAt !== null) createdAtMap[e.id] = e.createdAt;
  }
  const themesJson = JSON.stringify(themesMap);
  const createdAtJson = JSON.stringify(createdAtMap);
  const importTokens = JSON.stringify(Object.fromEntries(entries.map((e) => [e.id, 0])));
  const devRuntime = isDev
    ? `
const slideImportTokens = ${importTokens};
if (import.meta.hot) {
  import.meta.hot.on('open-slide:slide-changed', (data) => {
    const ids = Array.isArray(data?.slideIds) ? data.slideIds : data?.slideId ? [data.slideId] : [];
    const token = Date.now();
    for (const id of ids) {
      if (Object.prototype.hasOwnProperty.call(slideImportTokens, id)) slideImportTokens[id] = token;
    }
  });
}
`
    : '';
  const cases = entries
    .map((e) => {
      const importExpr = isDev
        ? `import(/* @vite-ignore */ ${JSON.stringify(`${e.importPath}?t=`)} + slideImportTokens[${JSON.stringify(e.id)}])`
        : `import(${JSON.stringify(e.importPath)})`;
      return `    case ${JSON.stringify(e.id)}: return (await ${importExpr}).default;`;
    })
    .join('\n');

  return `// virtual:open-slide/slides — generated
export const slideIds = ${ids};
export const slideThemes = ${themesJson};
export const slideCreatedAt = ${createdAtJson};
${devRuntime}

export async function loadDeckJson(id) {
  switch (id) {
${cases}
    default: throw new Error('Deck not found: ' + id);
  }
}
`;
}

export function openSlidePlugin(opts: OpenSlidePluginOptions): Plugin {
  const { userCwd, config, coreVersion } = opts;
  const slidesDir = config.slidesDir ?? 'slides';
  const slidesRoot = path.resolve(userCwd, slidesDir);
  const foldersManifestPath = path.join(slidesRoot, '.folders.json');

  let isDev = false;
  let slideChangeTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingSlideChanges = new Set<string>();
  const queueSlideChanged = (server: ViteDevServer, id: string) => {
    pendingSlideChanges.add(id);
    if (slideChangeTimer) clearTimeout(slideChangeTimer);
    slideChangeTimer = setTimeout(() => {
      slideChangeTimer = null;
      const mod = server.moduleGraph.getModuleById(resolved(SLIDES_VMOD));
      if (mod) server.moduleGraph.invalidateModule(mod);
      const slideIds = Array.from(pendingSlideChanges);
      pendingSlideChanges.clear();
      server.ws.send({
        type: 'custom',
        event: 'open-slide:slide-changed',
        data: { slideIds },
      });
    }, 100);
  };

  return {
    name: 'open-slide',
    config(_c, env) {
      isDev = env.command === 'serve';
      return {
        server: { fs: { allow: [userCwd] } },
      };
    },
    resolveId(id) {
      if (id === SLIDES_VMOD) return resolved(SLIDES_VMOD);
      if (id === CONFIG_VMOD) return resolved(CONFIG_VMOD);
      if (id === FOLDERS_VMOD) return resolved(FOLDERS_VMOD);
      if (id === BLOCKS_VMOD) return resolved(BLOCKS_VMOD);
      return null;
    },
    async load(id) {
      if (id === resolved(SLIDES_VMOD)) {
        const files = await findSlides(userCwd, slidesDir);
        return await generateSlidesModule(files, slidesRoot, isDev);
      }
      if (id === resolved(CONFIG_VMOD)) {
        const userBuild = config.build ?? {};
        const buildResolved = isDev
          ? { showSlideBrowser: true, showSlideUi: true, allowHtmlDownload: true }
          : {
              showSlideBrowser: userBuild.showSlideBrowser ?? true,
              showSlideUi: userBuild.showSlideUi ?? true,
              allowHtmlDownload: userBuild.allowHtmlDownload ?? true,
            };
        const resolvedConfig = { ...config, build: buildResolved, version: coreVersion };
        return `export default ${JSON.stringify(resolvedConfig)};\n`;
      }
      if (id === resolved(FOLDERS_VMOD)) {
        const manifest = await readFoldersManifest(foldersManifestPath);
        return `export default ${JSON.stringify(manifest)};\n`;
      }
      if (id === resolved(BLOCKS_VMOD)) {
        const candidates = [
          'blocks/index.ts',
          'blocks/index.tsx',
          'blocks/index.js',
          'blocks/index.jsx',
        ];
        for (const rel of candidates) {
          const abs = path.resolve(userCwd, rel);
          if (existsSync(abs)) {
            const importPath = isDev ? `/@fs/${abs.replace(/^\/+/, '')}` : abs;
            return `import ${JSON.stringify(importPath)};\n`;
          }
        }
        return 'export {};\n';
      }
      return null;
    },
    handleHotUpdate(ctx) {
      const slideId = slideIdForEntry(ctx.file, slidesRoot);
      if (!slideId) return;
      queueSlideChanged(ctx.server, slideId);
      return [];
    },
    configureServer(server) {
      const isSlideEntry = (p: string) => slideIdForEntry(p, slidesRoot) !== null;

      let reloadTimer: ReturnType<typeof setTimeout> | null = null;
      const reload = () => {
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          reloadTimer = null;
          const mod = server.moduleGraph.getModuleById(resolved(SLIDES_VMOD));
          if (mod) server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
        }, 150);
      };
      // Vite's `root` is the core app dir, so chokidar doesn't watch the
      // user's slides folder by default. Add it explicitly — and pass the
      // directory itself, since Vite sets `disableGlobbing: true` and would
      // otherwise treat a glob pattern as a literal path.
      if (existsSync(slidesRoot)) server.watcher.add(slidesRoot);
      server.watcher.on('add', (p) => {
        if (isSlideEntry(p)) reload();
      });
      server.watcher.on('unlink', (p) => {
        if (isSlideEntry(p)) reload();
      });

      let foldersTimer: ReturnType<typeof setTimeout> | null = null;
      const invalidateFolders = () => {
        if (foldersTimer) clearTimeout(foldersTimer);
        foldersTimer = setTimeout(() => {
          foldersTimer = null;
          const mod = server.moduleGraph.getModuleById(resolved(FOLDERS_VMOD));
          if (mod) server.moduleGraph.invalidateModule(mod);
        }, 100);
      };
      server.watcher.add(foldersManifestPath);
      server.watcher.on('change', (p) => {
        if (p === foldersManifestPath) invalidateFolders();
      });
      server.watcher.on('add', (p) => {
        if (p === foldersManifestPath) invalidateFolders();
      });
      server.watcher.on('unlink', (p) => {
        if (p === foldersManifestPath) invalidateFolders();
      });
    },
  };
}

export const __test = { toId, slideIdForEntry, readDeckMetaFromJson };

export async function loadUserConfig(userCwd: string): Promise<OpenSlideConfig> {
  const file = path.join(userCwd, CONFIG_FILE);
  if (!existsSync(file)) return {};
  const loaded = await loadConfigFromFile(
    { command: 'serve', mode: 'development' },
    file,
    userCwd,
    'silent',
  );
  return (loaded?.config ?? {}) as OpenSlideConfig;
}
