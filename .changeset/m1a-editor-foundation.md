---
'@open-slide/core': minor
---

Add the new direct-manipulation editor foundation (dev preview, behind `?editor=next`): a host-agnostic DeckHost boundary, an editor store with inverse-op undo/redo and debounced save, and a minimal shell. `POST /__deck/:id` now returns the applied deck.
