import type { Plugin } from 'vite';
import { registerAssetRoutes } from './routes/assets.ts';
import { type ApiPluginOptions, makeContext } from './routes/context.ts';
import { registerDeckRoutes } from './routes/deck.ts';
import { registerFolderRoutes } from './routes/folders.ts';
import { registerSlideRoutes } from './routes/slides.ts';
import { registerSvglRoutes } from './routes/svgl.ts';
import { registerThemeRoutes } from './routes/themes.ts';
import { registerUpdateRoutes } from './routes/update.ts';
import { registerWatchers } from './routes/watchers.ts';

export type { ApiPluginOptions };

// All open-slide dev-server endpoints in one plugin. To see the routes
// owned by a group, open the matching file under `routes/` — each file
// leads with a comment-block manifest of its endpoints.
export function apiPlugin(opts: ApiPluginOptions): Plugin {
  return {
    name: 'open-slide:api',
    apply: 'serve',
    configureServer(server) {
      const ctx = makeContext(opts);
      registerWatchers(server, ctx);
      registerSlideRoutes(server, ctx);
      registerAssetRoutes(server, ctx);
      registerSvglRoutes(server);
      registerFolderRoutes(server, ctx);
      registerDeckRoutes(server, ctx);
      registerThemeRoutes(server, ctx);
      registerUpdateRoutes(server, ctx.coreVersion);
    },
  };
}
