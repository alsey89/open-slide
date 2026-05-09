---
'@open-slide/core': minor
---

Publish the user's current slide, page, and inspector-selected element to `node_modules/.open-slide/current.json` whenever they navigate or pick an element, and add a `current-slide` skill that teaches agents to resolve references like "this page" or "this element". Surface this in the dev UI with a live "Agent connected" badge in the slide header and an "Agent is watching" badge in the inspector panel; rename the inspector comments section from "note" to "comment" terminology to match the existing `@slide-comment` / `apply-comments` vocabulary.
