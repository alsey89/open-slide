import type { ComponentType, ReactNode } from 'react';
import type { Block, Slide } from './model.ts';

export type BlockComponent = ComponentType<{ block: Block }>;
export type LayoutComponent = ComponentType<{
  slide: Slide;
  renderSlot: (name: string) => ReactNode;
}>;

const blocks = new Map<string, BlockComponent>();
const layouts = new Map<string, { component: LayoutComponent; slots: string[] }>();

export function registerBlock(type: string, component: BlockComponent): void {
  blocks.set(type, component);
}

export function registerLayout(type: string, component: LayoutComponent, slots: string[]): void {
  layouts.set(type, { component, slots });
}

export function getBlock(type: string): BlockComponent | undefined {
  return blocks.get(type);
}

export function getLayout(
  type: string,
): { component: LayoutComponent; slots: string[] } | undefined {
  return layouts.get(type);
}

export function resetRegistry(): void {
  blocks.clear();
  layouts.clear();
}
