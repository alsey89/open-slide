import type { ComponentType, ReactNode } from 'react';
import type { Block, Slide } from './model.ts';

export type BlockComponent = ComponentType<{ block: Block }>;
export type LayoutComponent = ComponentType<{
  slide: Slide;
  renderSlot: (name: string) => ReactNode;
}>;

export type PropFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'string-list';

export type PropField = {
  key: string;
  type: PropFieldType;
  label?: string;
  placeholder?: string;
  /** Required for `select`; ignored otherwise. */
  options?: string[];
};

export type BlockPropSchema = PropField[];

const blocks = new Map<string, BlockComponent>();
const blockSchemas = new Map<string, BlockPropSchema>();
const layouts = new Map<string, { component: LayoutComponent; slots: string[] }>();

export function registerBlock(
  type: string,
  component: BlockComponent,
  schema?: BlockPropSchema,
): void {
  blocks.set(type, component);
  if (schema) blockSchemas.set(type, schema);
}

export function getBlockSchema(type: string): BlockPropSchema | undefined {
  return blockSchemas.get(type);
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
  blockSchemas.clear();
  layouts.clear();
}

export function listBlockTypes(): string[] {
  return [...blocks.keys()].sort();
}

export function listLayouts(): Array<{ type: string; slots: string[] }> {
  return [...layouts.entries()]
    .map(([type, entry]) => ({ type, slots: entry.slots }))
    .sort((a, b) => a.type.localeCompare(b.type));
}
