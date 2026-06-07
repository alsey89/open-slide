import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { normalizeDesign } from '../../app/lib/design.ts';
import { validateMutationRequest } from '../../http/request-guard.ts';
import { type ApiContext, json, readBody } from './context.ts';

// POST /__themes   write a token preset file   { name, description?, design }

export function slugifyThemeName(name: string, taken: Set<string> = new Set()): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'theme';
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const cand = `${base}-${i}`;
    if (!taken.has(cand)) return cand;
  }
  return `${base}-${taken.size + 1}`;
}

export function themeFileBody(name: string, description: string, design: unknown): string {
  return `${JSON.stringify({ name, description, design }, null, 2)}\n`;
}

type ThemeBody = { name?: unknown; description?: unknown; design?: unknown };

export function registerThemeRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use('/__themes', async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    if ((req.method ?? 'GET') !== 'POST' || url.pathname !== '/') return next();

    const requestCheck = validateMutationRequest(req, { requireJsonBody: true });
    if (!requestCheck.ok) {
      return json(res, requestCheck.status, { ok: false, error: requestCheck.error });
    }

    try {
      const body = (await readBody(req)) as ThemeBody;
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return json(res, 400, { ok: false, error: 'name must be a non-empty string' });
      }
      if (!body.design || typeof body.design !== 'object' || Array.isArray(body.design)) {
        return json(res, 400, { ok: false, error: 'design must be an object' });
      }
      const description = typeof body.description === 'string' ? body.description : '';
      const design = normalizeDesign(body.design as Parameters<typeof normalizeDesign>[0]);

      await fs.mkdir(ctx.themesRoot, { recursive: true });
      const taken = new Set(
        existsSync(ctx.themesRoot)
          ? (await fs.readdir(ctx.themesRoot))
              .filter((f) => f.endsWith('.json'))
              .map((f) => f.slice(0, -5))
          : [],
      );
      const id = slugifyThemeName(body.name, taken);
      const filePath = path.resolve(ctx.themesRoot, `${id}.json`);
      if (!filePath.startsWith(ctx.themesRoot + path.sep)) {
        return json(res, 400, { ok: false, error: 'invalid id' });
      }
      await fs.writeFile(filePath, themeFileBody(body.name.trim(), description, design), 'utf8');
      return json(res, 200, { ok: true, id, name: body.name.trim() });
    } catch (err) {
      return json(res, 400, { ok: false, error: String((err as Error).message ?? err) });
    }
  });
}
