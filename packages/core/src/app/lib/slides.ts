import {
  slideCreatedAt as createdAt,
  slideIds as ids,
  loadDeckJson as load,
  slideThemes as themes,
} from 'virtual:open-slide/slides';
import { renderDeck } from '../../doc/render.tsx';
import { validateDeck } from '../../doc/validate.ts';
import type { SlideModule } from './sdk';

export const slideIds: string[] = ids;
export const slideThemes: Record<string, string> = themes;
export const slideCreatedAt: Record<string, number> = createdAt;

export function slidesByTheme(themeId: string): string[] {
  return slideIds.filter((id) => slideThemes[id] === themeId);
}

export async function loadSlide(id: string): Promise<SlideModule> {
  const json = await load(id);
  return renderDeck(validateDeck(json));
}

export function slideChangeIncludes(data: unknown, slideId: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const payload = data as { slideId?: unknown; slideIds?: unknown };
  if (payload.slideId === slideId) return true;
  return Array.isArray(payload.slideIds) && payload.slideIds.includes(slideId);
}
