---
'@open-slide/core': minor
---

Add an optional prop-schema to `registerBlock(type, component, schema?)`. The WYSIWYG editor now renders typed fields (text, textarea, number, boolean, select, color, string-list) for any block that declares a schema — built-in or custom — and falls back to the generic JSON editor only when no schema is present. Built-in blocks now ship schemas.
