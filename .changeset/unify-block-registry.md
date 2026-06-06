---
'@open-slide/core': patch
---

Alias the `@open-slide/core` specifier to its source entry in the dev/build config so project custom blocks share one block/layout registry with the app — previously custom blocks/layouts registered into a second (dist) registry the renderer never read, rendering as "unknown layout/block".
