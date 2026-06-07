import { themes as raw } from 'virtual:open-slide/themes';
import { type DeepPartial, type DesignSystem, normalizeDesign } from './design';

export type Theme = {
  id: string;
  name: string;
  description: string;
  design: DesignSystem;
};

export const themes: Theme[] = raw.map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  design: normalizeDesign(t.design as DeepPartial<DesignSystem>),
}));
