---
'@open-slide/core': patch
---

Dedupe react/react-dom so project custom blocks (which import React via the automatic JSX runtime from outside the Vite root) don't load a second React instance and crash with "invalid hook call".
