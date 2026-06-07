declare module 'virtual:open-slide/slides' {
  export const slideIds: string[];
  export const slideThemes: Record<string, string>;
  export const slideCreatedAt: Record<string, number>;
  export function loadDeckJson(id: string): Promise<unknown>;
}

declare module 'virtual:open-slide/config' {
  import type { Locale } from '../locale/types';

  const config: {
    slidesDir?: string;
    port?: number;
    locale?: Locale;
    version: string;
    build: {
      showSlideBrowser: boolean;
      showSlideUi: boolean;
      allowHtmlDownload: boolean;
    };
  };
  export default config;
}

declare module 'virtual:open-slide/folders' {
  import type { FoldersManifest } from './lib/sdk';

  const manifest: FoldersManifest;
  export default manifest;
}

declare module 'virtual:open-slide/blocks';

declare module 'virtual:open-slide/themes' {
  export type ThemeMeta = {
    id: string;
    name: string;
    description: string;
    design: Record<string, unknown>;
  };

  export const themes: ThemeMeta[];
}
