import { Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Block } from '../../../doc/model.ts';
import { getLayout, listBlockTypes } from '../../../doc/registry.ts';
import { renderDeck } from '../../../doc/render.tsx';
import { useDeckEditor } from '../../lib/editor/use-deck-editor.ts';
import { SlideCanvas } from '../slide-canvas.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { freshId } from './ids.ts';
import { OutlinePanel } from './outline-panel.tsx';

const BUILT_IN_BLOCK_TYPES = ['heading', 'text', 'bullets', 'quote', 'code', 'image'] as const;
type BuiltInBlockType = (typeof BUILT_IN_BLOCK_TYPES)[number];

function isBuiltInBlockType(type: string): type is BuiltInBlockType {
  return (BUILT_IN_BLOCK_TYPES as readonly string[]).includes(type);
}

function defaultProps(type: BuiltInBlockType): Record<string, unknown> {
  switch (type) {
    case 'heading':
    case 'text':
      return { text: 'New text' };
    case 'bullets':
      return { items: ['Item'] };
    case 'quote':
      return { text: 'Quote', attribution: '' };
    case 'code':
      return { code: '', lang: '' };
    case 'image':
      return { src: '', alt: '' };
  }
}

function findBlock(
  deck: NonNullable<ReturnType<typeof useDeckEditor>['deck']>,
  blockId: string,
): { block: Block; slideId: string; slot: string; index: number } | null {
  for (const slide of deck.slides) {
    for (const [slot, blocks] of Object.entries(slide.slots)) {
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx !== -1) {
        return { block: blocks[idx], slideId: slide.id, slot, index: idx };
      }
    }
  }
  return null;
}

function PropsPanel({
  deck,
  selectedBlockId,
  currentSlideId,
  onApply,
  onSelect,
  saveState,
}: {
  deck: NonNullable<ReturnType<typeof useDeckEditor>['deck']>;
  selectedBlockId: string | null;
  currentSlideId: string;
  onApply: ReturnType<typeof useDeckEditor>['apply'];
  onSelect: ReturnType<typeof useDeckEditor>['select'];
  saveState: ReturnType<typeof useDeckEditor>['saveState'];
}) {
  const found = selectedBlockId ? findBlock(deck, selectedBlockId) : null;
  const block = found?.block ?? null;

  const currentSlide = deck.slides.find((s) => s.id === currentSlideId);
  const layoutSlots = currentSlide
    ? (getLayout(currentSlide.layout)?.slots ?? Object.keys(currentSlide.slots))
    : [];

  const blockTypes = useMemo(() => {
    const types = listBlockTypes();
    return types.length > 0 ? types : [...BUILT_IN_BLOCK_TYPES];
  }, []);

  const [addType, setAddType] = useState<string>('heading');
  const [addSlot, setAddSlot] = useState<string>(layoutSlots[0] ?? '');

  useEffect(() => {
    if (layoutSlots.length > 0 && !layoutSlots.includes(addSlot)) {
      setAddSlot(layoutSlots[0]);
    }
  }, [layoutSlots, addSlot]);

  const saveLabel =
    saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved';

  const handleAddBlock = () => {
    if (!currentSlide || !addSlot) return;
    const targetSlot = currentSlide.slots[addSlot] ?? [];
    const props = isBuiltInBlockType(addType) ? defaultProps(addType) : {};
    onApply({
      kind: 'add-block',
      slideId: currentSlideId,
      slot: addSlot,
      index: targetSlot.length,
      block: { id: freshId('b'), type: addType, props },
    });
  };

  const handleMoveUp = () => {
    if (!found || found.index === 0) return;
    const slide = deck.slides.find((s) => s.id === found.slideId);
    if (!slide) return;
    const blocks = [...(slide.slots[found.slot] ?? [])];
    const [item] = blocks.splice(found.index, 1);
    blocks.splice(found.index - 1, 0, item);
    onApply({ kind: 'set-slot-blocks', slideId: found.slideId, slot: found.slot, blocks });
  };

  const handleMoveDown = () => {
    if (!found) return;
    const slide = deck.slides.find((s) => s.id === found.slideId);
    if (!slide) return;
    const blocks = [...(slide.slots[found.slot] ?? [])];
    if (found.index >= blocks.length - 1) return;
    const [item] = blocks.splice(found.index, 1);
    blocks.splice(found.index + 1, 0, item);
    onApply({ kind: 'set-slot-blocks', slideId: found.slideId, slot: found.slot, blocks });
  };

  const handleDelete = () => {
    if (!block) return;
    onApply({ kind: 'remove-block', blockId: block.id });
    onSelect(null);
  };

  const applyProp = useCallback(
    (props: Record<string, unknown>) => {
      if (!block) return;
      onApply({ kind: 'update-block-props', blockId: block.id, props });
    },
    [block, onApply],
  );

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-hairline bg-sidebar">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-hairline px-3">
        <span className="text-[11.5px] font-medium">Block</span>
        <span className="text-[10.5px] text-muted-foreground">{saveLabel}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0 divide-y divide-hairline">
          {block ? (
            <div className="flex flex-col gap-2.5 px-3.5 py-3.5">
              <div className="mb-0.5 flex items-center gap-2">
                <span className="eyebrow capitalize">{block.type}</span>
                <span aria-hidden className="h-px flex-1 bg-hairline" />
              </div>
              <BlockFields block={block} applyProp={applyProp} />
              <div className="mt-1 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleMoveUp}
                  className="rounded-[4px] border border-border bg-background px-2 py-1 text-[11px] hover:bg-muted"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={handleMoveDown}
                  className="rounded-[4px] border border-border bg-background px-2 py-1 text-[11px] hover:bg-muted"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="ml-auto rounded-[4px] border border-border bg-background px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="px-3.5 py-3.5 text-[11.5px] text-muted-foreground">
              Click a block to edit it
            </div>
          )}

          <div className="flex flex-col gap-2.5 px-3.5 py-3.5">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="eyebrow">Add block</span>
              <span aria-hidden className="h-px flex-1 bg-hairline" />
            </div>
            <div className="grid grid-cols-[1fr_1fr] gap-1.5">
              <div className="flex flex-col gap-1">
                <label htmlFor="editor-add-type" className="text-[10.5px] text-muted-foreground">
                  Type
                </label>
                <select
                  id="editor-add-type"
                  value={addType}
                  onChange={(e) => setAddType(e.target.value)}
                  className="h-7 rounded-[4px] border border-border bg-background px-1.5 text-[11px] outline-none focus:border-foreground/40"
                >
                  {blockTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="editor-add-slot" className="text-[10.5px] text-muted-foreground">
                  Slot
                </label>
                <select
                  id="editor-add-slot"
                  value={addSlot}
                  onChange={(e) => setAddSlot(e.target.value)}
                  className="h-7 rounded-[4px] border border-border bg-background px-1.5 text-[11px] outline-none focus:border-foreground/40"
                >
                  {layoutSlots.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddBlock}
              className="flex h-7 items-center justify-center gap-1.5 rounded-[4px] border border-border bg-background px-2 text-[11px] hover:bg-muted"
            >
              <Plus className="size-3" />
              Add
            </button>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

function JsonField({
  propKey,
  value,
  applyProp,
}: {
  propKey: string;
  value: unknown;
  applyProp: (props: Record<string, unknown>) => void;
}) {
  const textareaCls =
    'w-full rounded-[4px] border border-border bg-background px-2 py-1.5 text-[11.5px] outline-none focus:border-foreground/40 focus:ring-1 focus:ring-ring/20 resize-y min-h-[60px] font-mono';
  const [localText, setLocalText] = useState(() => JSON.stringify(value, null, 2));
  const [invalid, setInvalid] = useState(false);

  const prevValueRef = useRef(value);
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setLocalText(JSON.stringify(value, null, 2));
      setInvalid(false);
    }
  }, [value]);

  const handleChange = (text: string) => {
    setLocalText(text);
    try {
      const parsed = JSON.parse(text);
      setInvalid(false);
      applyProp({ [propKey]: parsed });
    } catch {
      setInvalid(true);
    }
  };

  return (
    <div className="flex flex-col gap-0.5">
      <textarea
        className={`${textareaCls} ${invalid ? 'border-destructive/60' : ''}`}
        value={localText}
        onChange={(e) => handleChange(e.target.value)}
      />
      {invalid && <span className="text-[10px] text-destructive">invalid JSON — not applied</span>}
    </div>
  );
}

function GenericBlockFields({
  block,
  applyProp,
}: {
  block: Block;
  applyProp: (props: Record<string, unknown>) => void;
}) {
  const inputCls =
    'w-full rounded-[4px] border border-border bg-background px-2 py-1 text-[11.5px] outline-none focus:border-foreground/40 focus:ring-1 focus:ring-ring/20';
  const textareaCls =
    'w-full rounded-[4px] border border-border bg-background px-2 py-1.5 text-[11.5px] outline-none focus:border-foreground/40 focus:ring-1 focus:ring-ring/20 resize-y min-h-[60px]';

  const [newPropKey, setNewPropKey] = useState('');

  const entries = Object.entries(block.props);

  const handleAddProp = () => {
    const key = newPropKey.trim();
    if (!key) return;
    applyProp({ [key]: '' });
    setNewPropKey('');
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10.5px] text-muted-foreground">Custom block — generic editor.</span>
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col gap-0.5">
          {typeof value === 'boolean' ? (
            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => applyProp({ [key]: e.target.checked })}
                className="h-3.5 w-3.5"
              />
              {key}
            </label>
          ) : (
            <>
              <span className="text-[10px] text-muted-foreground">{key}</span>
              {typeof value === 'number' ? (
                <input
                  type="number"
                  className={inputCls}
                  value={value}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isNaN(n)) applyProp({ [key]: n });
                  }}
                />
              ) : typeof value === 'string' ? (
                value.length > 60 || value.includes('\n') ? (
                  <textarea
                    className={textareaCls}
                    value={value}
                    onChange={(e) => applyProp({ [key]: e.target.value })}
                  />
                ) : (
                  <input
                    className={inputCls}
                    value={value}
                    onChange={(e) => applyProp({ [key]: e.target.value })}
                  />
                )
              ) : (
                <JsonField propKey={key} value={value} applyProp={applyProp} />
              )}
            </>
          )}
        </div>
      ))}
      <div className="flex items-center gap-1 pt-1">
        <input
          className="min-w-0 flex-1 rounded-[4px] border border-border bg-background px-2 py-1 text-[11.5px] outline-none focus:border-foreground/40"
          placeholder="property name"
          value={newPropKey}
          onChange={(e) => setNewPropKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddProp();
          }}
        />
        <button
          type="button"
          onClick={handleAddProp}
          className="flex h-7 shrink-0 items-center gap-1 rounded-[4px] border border-border bg-background px-2 text-[11px] hover:bg-muted"
        >
          <Plus className="size-3" />
          Add
        </button>
      </div>
    </div>
  );
}

function BlockFields({
  block,
  applyProp,
}: {
  block: Block;
  applyProp: (props: Record<string, unknown>) => void;
}) {
  const inputCls =
    'w-full rounded-[4px] border border-border bg-background px-2 py-1 text-[11.5px] outline-none focus:border-foreground/40 focus:ring-1 focus:ring-ring/20';
  const textareaCls =
    'w-full rounded-[4px] border border-border bg-background px-2 py-1.5 text-[11.5px] outline-none focus:border-foreground/40 focus:ring-1 focus:ring-ring/20 resize-y min-h-[60px]';

  if (!isBuiltInBlockType(block.type)) {
    return <GenericBlockFields block={block} applyProp={applyProp} />;
  }

  if (block.type === 'heading' || block.type === 'text') {
    return (
      <textarea
        className={textareaCls}
        value={String(block.props.text ?? '')}
        onChange={(e) => applyProp({ text: e.target.value })}
      />
    );
  }

  if (block.type === 'quote') {
    return (
      <>
        <textarea
          className={textareaCls}
          placeholder="Quote text"
          value={String(block.props.text ?? '')}
          onChange={(e) => applyProp({ text: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Attribution"
          value={String(block.props.attribution ?? '')}
          onChange={(e) => applyProp({ attribution: e.target.value })}
        />
      </>
    );
  }

  if (block.type === 'code') {
    return (
      <>
        <textarea
          className={textareaCls}
          placeholder="Code"
          value={String(block.props.code ?? '')}
          onChange={(e) => applyProp({ code: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Language (e.g. ts)"
          value={String(block.props.lang ?? '')}
          onChange={(e) => applyProp({ lang: e.target.value })}
        />
      </>
    );
  }

  if (block.type === 'image') {
    return (
      <>
        <input
          className={inputCls}
          placeholder="src"
          value={String(block.props.src ?? '')}
          onChange={(e) => applyProp({ src: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="alt"
          value={String(block.props.alt ?? '')}
          onChange={(e) => applyProp({ alt: e.target.value })}
        />
        <select
          className="h-7 w-full rounded-[4px] border border-border bg-background px-1.5 text-[11px] outline-none focus:border-foreground/40"
          value={String(block.props.fit ?? 'cover')}
          onChange={(e) => applyProp({ fit: e.target.value })}
        >
          <option value="cover">cover</option>
          <option value="contain">contain</option>
        </select>
      </>
    );
  }

  if (block.type === 'bullets') {
    const items = Array.isArray(block.props.items) ? (block.props.items as string[]) : [];
    return (
      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: bullet items have no stable id
          <div key={i} className="flex items-center gap-1">
            <input
              className="min-w-0 flex-1 rounded-[4px] border border-border bg-background px-2 py-1 text-[11.5px] outline-none focus:border-foreground/40"
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                applyProp({ items: next });
              }}
            />
            <button
              type="button"
              onClick={() => {
                const next = items.filter((_, j) => j !== i);
                applyProp({ items: next });
              }}
              className="flex size-5 shrink-0 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Minus className="size-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => applyProp({ items: [...items, 'Item'] })}
          className="flex h-6 items-center justify-center gap-1 rounded-[4px] border border-dashed border-border text-[11px] text-muted-foreground hover:border-foreground/30 hover:text-foreground"
        >
          <Plus className="size-3" />
          Add item
        </button>
      </div>
    );
  }

  return <span className="text-[11px] text-muted-foreground">No editable fields</span>;
}

const SELECTION_STYLE = `
[data-osd-selected] {
  outline: 2px solid var(--brand, #6366f1) !important;
  outline-offset: 4px;
  cursor: pointer;
}
[data-osd-block-id] {
  cursor: pointer;
}
`;

export function DeckEditor({
  slideId,
  index,
  onIndexChange,
}: {
  slideId: string;
  index: number;
  onIndexChange: (i: number) => void;
}) {
  const editor = useDeckEditor(slideId);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const mod = useMemo(() => (editor.deck ? renderDeck(editor.deck) : null), [editor.deck]);

  const pageCount = mod?.default.length ?? 0;
  const clampedIndex = pageCount > 0 ? Math.max(0, Math.min(pageCount - 1, index)) : 0;

  useEffect(() => {
    if (clampedIndex !== index && pageCount > 0) onIndexChange(clampedIndex);
  }, [clampedIndex, index, pageCount, onIndexChange]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mod/clampedIndex re-render the canvas DOM the effect queries, so the highlight must re-apply when they change.
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    wrap.querySelectorAll('[data-osd-block-id]').forEach((el) => {
      el.removeAttribute('data-osd-selected');
    });
    if (editor.selectedBlockId) {
      wrap
        .querySelector(`[data-osd-block-id="${CSS.escape(editor.selectedBlockId)}"]`)
        ?.setAttribute('data-osd-selected', '');
    }
  }, [editor.selectedBlockId, mod, clampedIndex]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const el = (e.target as HTMLElement).closest('[data-osd-block-id]');
      editor.select(el?.getAttribute('data-osd-block-id') ?? null);
    },
    [editor],
  );

  if (editor.error && !editor.deck) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-destructive">
        {editor.error}
      </div>
    );
  }

  if (!editor.deck || !mod) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  const Page = mod.default[clampedIndex];
  const currentSlide = editor.deck.slides[clampedIndex];

  return (
    <>
      <style>{SELECTION_STYLE}</style>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Outline panel */}
        <OutlinePanel
          deck={editor.deck}
          index={clampedIndex}
          onIndexChange={onIndexChange}
          onApply={editor.apply}
          onDesignChange={(design) => editor.apply({ kind: 'set-design', design })}
        />
        {/* Canvas area */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: canvas click-to-select is intentionally a plain div — no semantic role fits this pattern */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard block selection via panel; click-to-select on canvas is a pointer convenience */}
        <div
          ref={canvasWrapRef}
          className="paper relative min-h-0 min-w-0 flex-1 bg-canvas p-2 md:p-10"
          onClick={handleCanvasClick}
        >
          <SlideCanvas design={editor.deck.design}>{Page ? <Page /> : null}</SlideCanvas>
          {editor.error && (
            <div className="absolute bottom-2 left-2 right-2 rounded-[4px] bg-destructive/10 px-3 py-2 text-[11.5px] text-destructive">
              {editor.error}
            </div>
          )}
        </div>
        {/* Properties panel */}
        {currentSlide && (
          <PropsPanel
            deck={editor.deck}
            selectedBlockId={editor.selectedBlockId}
            currentSlideId={currentSlide.id}
            onApply={editor.apply}
            onSelect={editor.select}
            saveState={editor.saveState}
          />
        )}
      </div>
    </>
  );
}
