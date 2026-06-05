import fs from 'node:fs/promises';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import {
  ASSET_MAX_BYTES,
  mimeForFilename,
  resolveScopedAssetFile,
  resolveScopedAssetsDir,
  validateAssetName,
} from '../../files/assets.ts';
import { validateMutationRequest } from '../../http/request-guard.ts';
import { type ApiContext, json, readBody } from './context.ts';

// GET    /__assets/:scope                     list assets in slide or @global
// GET    /__assets/:scope/:file               serve raw asset bytes
// POST   /__assets/:scope/:file               upload (multipart raw body)
// PATCH  /__assets/:scope/:file               rename { name }
// DELETE /__assets/:scope/:file               delete

export function registerAssetRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use('/__assets', async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    const method = req.method ?? 'GET';

    try {
      const listMatch = url.pathname.match(/^\/([^/]+)\/?$/);
      const fileMatch = url.pathname.match(/^\/([^/]+)\/([^/]+)$/);

      if (listMatch && method === 'GET') {
        const slideId = listMatch[1];
        const scopedDir = resolveScopedAssetsDir(ctx.slidesRoot, ctx.globalAssetsRoot, slideId);
        if (!scopedDir) return json(res, 400, { error: 'invalid slideId' });

        let entries: string[];
        try {
          entries = await fs.readdir(scopedDir);
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
            return json(res, 200, { assets: [] });
          }
          throw err;
        }

        const assets: Array<{
          name: string;
          size: number;
          mtime: number;
          mime: string;
          url: string;
          unused: boolean;
        }> = [];
        for (const name of entries) {
          if (!validateAssetName(name)) continue;
          const stat = await fs.stat(path.join(scopedDir, name));
          if (!stat.isFile()) continue;
          assets.push({
            name,
            size: stat.size,
            mtime: stat.mtimeMs,
            mime: mimeForFilename(name),
            url: `/__assets/${slideId}/${encodeURIComponent(name)}`,
            unused: false,
          });
        }
        assets.sort((a, b) => a.name.localeCompare(b.name));

        return json(res, 200, { assets });
      }

      if (fileMatch) {
        const slideId = fileMatch[1];
        const filename = decodeURIComponent(fileMatch[2]);
        const file = resolveScopedAssetFile(
          ctx.slidesRoot,
          ctx.globalAssetsRoot,
          slideId,
          filename,
        );
        if (!file) return json(res, 400, { error: 'invalid path' });

        if (method === 'GET') {
          try {
            const buf = await fs.readFile(file);
            res.statusCode = 200;
            res.setHeader('content-type', mimeForFilename(filename));
            res.setHeader('cache-control', 'no-store');
            res.end(buf);
            return;
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
              return json(res, 404, { error: 'asset not found' });
            }
            throw err;
          }
        }

        if (method === 'POST') {
          const requestCheck = validateMutationRequest(req);
          if (!requestCheck.ok) {
            return json(res, requestCheck.status, { error: requestCheck.error });
          }
          const overwrite = url.searchParams.get('overwrite') === '1';
          const lenHeader = req.headers['content-length'];
          const len = typeof lenHeader === 'string' ? Number(lenHeader) : NaN;
          if (Number.isFinite(len) && len > ASSET_MAX_BYTES) {
            return json(res, 413, { error: 'file too large' });
          }

          if (!overwrite) {
            try {
              await fs.access(file);
              return json(res, 409, { error: 'asset exists' });
            } catch {
              // fall through — file does not exist, OK to write
            }
          }

          const scopedDir = resolveScopedAssetsDir(ctx.slidesRoot, ctx.globalAssetsRoot, slideId);
          if (!scopedDir) return json(res, 400, { error: 'invalid slideId' });
          await fs.mkdir(scopedDir, { recursive: true });

          const chunks: Buffer[] = [];
          let total = 0;
          let oversized = false;
          await new Promise<void>((resolve, reject) => {
            req.on('data', (c: Buffer) => {
              total += c.length;
              if (total > ASSET_MAX_BYTES) {
                oversized = true;
                req.destroy();
                return;
              }
              chunks.push(c);
            });
            req.on('end', () => resolve());
            req.on('error', reject);
          });
          if (oversized) return json(res, 413, { error: 'file too large' });

          await fs.writeFile(file, Buffer.concat(chunks));
          return json(res, 200, {
            ok: true,
            name: filename,
            size: total,
            mime: mimeForFilename(filename),
            url: `/__assets/${slideId}/${encodeURIComponent(filename)}`,
          });
        }

        if (method === 'PATCH') {
          const requestCheck = validateMutationRequest(req, { requireJsonBody: true });
          if (!requestCheck.ok) {
            return json(res, requestCheck.status, { error: requestCheck.error });
          }
          const body = (await readBody(req)) as { name?: unknown };
          const target = validateAssetName(body.name);
          if (!target) return json(res, 400, { error: 'invalid name' });
          if (target === filename) return json(res, 200, { ok: true, name: filename });

          const dest = resolveScopedAssetFile(
            ctx.slidesRoot,
            ctx.globalAssetsRoot,
            slideId,
            target,
          );
          if (!dest) return json(res, 400, { error: 'invalid name' });

          try {
            await fs.access(dest);
            return json(res, 409, { error: 'target exists' });
          } catch {
            // OK
          }

          try {
            await fs.rename(file, dest);
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
              return json(res, 404, { error: 'asset not found' });
            }
            throw err;
          }
          return json(res, 200, { ok: true, name: target });
        }

        if (method === 'DELETE') {
          const requestCheck = validateMutationRequest(req);
          if (!requestCheck.ok) {
            return json(res, requestCheck.status, { error: requestCheck.error });
          }
          try {
            await fs.unlink(file);
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
              return json(res, 404, { error: 'asset not found' });
            }
            throw err;
          }
          return json(res, 200, { ok: true });
        }
      }

      return next();
    } catch (err) {
      json(res, 500, { error: String((err as Error).message ?? err) });
    }
  });
}
