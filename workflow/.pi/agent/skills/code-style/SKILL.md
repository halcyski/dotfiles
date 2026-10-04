---
name: code-style
description: Use when implementing an approved source-code task with established boundaries and patterns
---

# Code style

Follow the approved task and current repository pattern. Use direct domain names, explicit data flow, ordinary control flow, and one clear owner for each local operation.

Keep functions and classes focused. Make mutation, ordering, failure behavior, and input validation visible. Preserve documented current compatibility behavior. Reject unknown input with an actionable error.

Do not add speculative helpers, factories, registries, plug-ins, caches, retries, flags, configuration, or extension points. Do not add a wrapper when the assigned task already has one concrete destination.

Use types and names that distinguish semantic concepts. Reject generic names, magic values without a source, hidden policy, and dense chains that mix normal work with recovery.

Return to the parent when the task requires a new boundary, interface, public contract, persistence model, security decision, configuration decision, alternative implementation, or new pattern.

## Final check

Name the approved task and its local owner for every new structure. Remove structure justified only by a possible future use.
