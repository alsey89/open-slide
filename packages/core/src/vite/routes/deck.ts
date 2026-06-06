import fs from 'node:fs/promises';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { applyOps, type EditOp } from '../../doc/ops.ts';
import { validateDeck } from '../../doc/validate.ts';
import { SLIDE_ID_RE } from '../../editing/slide-ops.ts';
import { validateMutationRequest } from '../../http/request-guard.ts';
import { type ApiContext, json, readBody } from './context.ts';

// POST /__deck/:id   apply edit ops to a deck.json   { ops: EditOp[] }

export function applyOpsToJson(raw: string, ops: EditOp[]): string {
  return `${JSON.stringify(applyOps(validateDeck(JSON.parse(raw)), ops), null, 2)}\n`;
}

export function registerDeckRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use('/__deck', async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    const method = req.method ?? 'GET';

    const idMatch = url.pathname.match(/^\/([^/]+)$/);
    if (!idMatch) return next();

    const id = idMatch[1];

    if (method === 'POST') {
      if (!SLIDE_ID_RE.test(id)) return json(res, 400, { ok: false, error: 'invalid id' });

      const requestCheck = validateMutationRequest(req, { requireJsonBody: true });
      if (!requestCheck.ok) {
        return json(res, requestCheck.status, { ok: false, error: requestCheck.error });
      }

      const deckPath = path.resolve(ctx.slidesRoot, id, 'deck.json');
      if (!deckPath.startsWith(ctx.slidesRoot + path.sep)) {
        return json(res, 400, { ok: false, error: 'invalid id' });
      }

      try {
        let raw: string;
        try {
          raw = await fs.readFile(deckPath, 'utf8');
        } catch {
          return json(res, 404, { ok: false, error: 'deck.json not found' });
        }

        const body = (await readBody(req)) as { ops?: unknown };
        if (!Array.isArray(body.ops)) {
          return json(res, 400, { ok: false, error: 'ops must be an array' });
        }

        const updated = applyOpsToJson(raw, body.ops as EditOp[]);
        await fs.writeFile(deckPath, updated, 'utf8');
        return json(res, 200, { ok: true });
      } catch (err) {
        return json(res, 400, { ok: false, error: String((err as Error).message ?? err) });
      }
    }

    next();
  });
}
