# esbuild-wasm block-compile spike — findings

- esbuild.wasm payload: 11.36 MB
- initialize(): 40 ms (one-time, cold)
- build() one block: 68 ms
- compiled output size: 311 bytes
- output is ESM exporting the component: yes
- react kept external (host provides it): yes

## Verdict
11.36 MB wasm + 40 ms cold init is acceptable for a Tauri desktop webview (one-time load, not hot path); 68 ms per-block compile is workable for a dev-time authoring loop but should be parallelised for batch rebuilds. Go.

## Raw compiled output
```js
// timeline.tsx
import { jsx } from "react/jsx-runtime";
function Timeline({ block }) {
  const events = block.props.events ?? [];
  return /* @__PURE__ */ jsx("ol", { style: { display: "grid", gap: 8 }, children: events.map((e, i) => /* @__PURE__ */ jsx("li", { children: e }, i)) });
}
export {
  Timeline
};
```