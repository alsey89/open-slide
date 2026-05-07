# @open-slide/core

## 1.1.0

### Minor Changes

- [#69](https://github.com/1weiho/open-slide/pull/69) [`b121230`](https://github.com/1weiho/open-slide/commit/b1212304329cf2b437b6c1e496b786dd088537e1) Thanks [@1weiho](https://github.com/1weiho)! - Add a shuffle button to the Design panel that swaps in a curated random preset for inspiration.

- [#72](https://github.com/1weiho/open-slide/pull/72) [`e81b7cd`](https://github.com/1weiho/open-slide/commit/e81b7cd93ebee3c6c9516688d2517db0d83eb864) Thanks [@1weiho](https://github.com/1weiho)! - Drag thumbnails vertically in the dev-mode rail to reorder pages — the new order is written back to the slide's `index.tsx`.

### Patch Changes

- [#64](https://github.com/1weiho/open-slide/pull/64) [`a65a51e`](https://github.com/1weiho/open-slide/commit/a65a51ec310c947706fe98f13782f2bce639b7dd) Thanks [@1weiho](https://github.com/1weiho)! - Align presenter window to design-system tokens and dark-mode palette.

- [#74](https://github.com/1weiho/open-slide/pull/74) [`c2ef916`](https://github.com/1weiho/open-slide/commit/c2ef916585b64e8e27895bd2122cdf591f7e6508) Thanks [@1weiho](https://github.com/1weiho)! - Hide the mouse cursor immediately when navigating slides with the keyboard in fullscreen presentation mode. Cursor reappears as soon as the mouse moves.

- [#57](https://github.com/1weiho/open-slide/pull/57) [`5d780b3`](https://github.com/1weiho/open-slide/commit/5d780b3277732e63ee63be18c181a857b6321df4) Thanks [@1weiho](https://github.com/1weiho)! - Preserve aspect ratio on image-placeholder replacement and add a Crop dialog (with double-click shortcut) for framing images in the inspector.

## 1.0.6

### Patch Changes

- [#49](https://github.com/1weiho/open-slide/pull/49) [`efbcb4e`](https://github.com/1weiho/open-slide/commit/efbcb4eaa38fa9203266caeae750e49fabd06417) Thanks [@1weiho](https://github.com/1weiho)! - Remove redundant section dividers, module headers, and what-comments across the runtime.

- [#54](https://github.com/1weiho/open-slide/pull/54) [`6bcb88e`](https://github.com/1weiho/open-slide/commit/6bcb88e8824c6fe83aa260be8707b28afca2bdd1) Thanks [@Willaiem](https://github.com/Willaiem)! - Fix dev server on Windows: normalize `/@fs/` URL for drive-letter paths and pre-bundle `react`, `react-dom`, `react-dom/client`, and `next-themes`.

- [#53](https://github.com/1weiho/open-slide/pull/53) [`5e674a8`](https://github.com/1weiho/open-slide/commit/5e674a8816479750149b946374ecbfd9128e72d7) Thanks [@chentyke](https://github.com/chentyke)! - Keep the inspect highlight aligned while the inspector panel opens.

## 1.0.5

### Patch Changes

- ca53712: Add i18n support for the slide UI. Set `locale` in `OpenSlideConfig` using one of the presets (`en`, `zhTW`, `zhCN`, `ja`) from `@open-slide/core/locale`.
- fb0c2fa: Inspector edits on repeated content now scope to the clicked instance: typing updates only that DOM node, and saving rewrites the matching source literal — either the call-site prop on a reused component (`<Card title="…" />`) or the matching field of an `.map()`-iterated array entry (`{ tag, label }` objects).
- 2a23011: Inspector text edits now land in more places: descend into wrapper elements, fall through `{children}` slots to component call sites (e.g. `<Eyebrow>` → consumer), and disambiguate sibling text leaves via the pre-edit DOM value. Commit failures are surfaced via toast instead of silently swallowed, and failed edits stay buffered for retry.
- 27d2900: Replace spinner with a hairline + sliding bar for slide and presenter loading states.
- fa709d8: Polish sidebar folder UX: pick color/emoji while creating, success/error toasts on create/delete and slide drag-drop, right-aligned counts.
- 6a4b816: Hide the total folder count next to the sidebar "Folders" header.
- 2b4d0a8: Align sidebar theme toggle flush with the right column of folder counts.

## 1.0.4

### Patch Changes

- 05fb7ca: Make the `create-slide` skill propose aesthetic options tailored to the deck's topic instead of a fixed preset list. Step 2 now requires gathering the topic first and brainstorming three concrete, distinct visual directions for that topic (vibe + palette/typography/motif), so users can actually picture each choice.

## 1.0.3

### Patch Changes

- 802fd51: Add the required `radius` field to the `slide-authoring` skill's starter template. Without it, slides scaffolded from the template fail TypeScript because `DesignSystem` requires `radius: number`.

## 1.0.2

### Patch Changes

- 39780b1: Flatten `DesignSystem.radius` from `{ md: number }` to `number`. CSS var renamed `--osd-radius-md` → `--osd-radius`; `DesignRadius` type removed.

## 1.0.1

### Patch Changes

- 8333608: `create-slide` and `slide-authoring` skills now default new slides to a top-level `export const design: DesignSystem = { … }` consumed via `var(--osd-X)`, so a freshly generated slide is tweakable from the Design panel without extra prompting. The local `palette` constants pattern remains as the explicit fallback for one-off slides whose palette is intentionally locked. The starter template and self-review checklist are updated to match.
