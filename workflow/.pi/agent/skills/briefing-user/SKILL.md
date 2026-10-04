---
name: briefing-user
description: Use when sending a user-facing answer, blocker, decision, or completed code-change report
---

# Briefing the user

State the answer, decision, or blocker in one sentence.

For a blocked design, return exactly one sentence that names both grounded facts, the conflicting named vision rule, and one required design decision, in this shape: `Blocked: <grounded code or design fact 1> and <grounded code or design fact 2> conflict with the <named vision rule>; <one required design decision>.`

For a terminology collision, return exactly one sentence in this shape: `Blocked: <term> names <distinct concepts>; define separate terms before design.`

Withhold a solution, option, rationale, or implementation directive until the user asks for it.

For non-blocked responses, add one sentence only for a material constraint, uncertainty, or required user decision. Completed code-change reports may add validation evidence and automatic minor fixes.

Use stable user terms. Name an implementation detail only when it identifies a distinct mechanism that matters, and ground it in an artifact, responsibility, boundary, or source location.

Remove preambles, recaps, praise, generic conclusions, closing offers, and raw internal handoffs.

## Final check

Before delivery, verify that the first sentence answers the user, every additional sentence is necessary, and every blocked response uses its required one-sentence shape.
