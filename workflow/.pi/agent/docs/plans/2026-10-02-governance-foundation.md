# Governance foundation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the global monolithic guidance with a short coding core and four tested, on-demand Pi skills for code style, comments, durable prose, and user briefing.

**Architecture:** Keep universal authority, evidence, mutation, validation, and repository-preservation rules in `AGENTS.md`. Move contextual code-style, comment, durable-prose, and user-briefing policy into separate global skills. Test every skill with a temporary no-skill probe before writing it, then repeat the same scenarios with the skill loaded.

**Tech Stack:** Pi Agent Skills Markdown, Pi subagents, existing Pi `read`, `write`, `edit`, and `bash` tools. No packages, network access, extensions, Git staging, commits, or repository files.

**Spec:** `/home/hsa1776/.pi/agent/docs/change-governance-design.md`

## Global constraints

- Modify only `/home/hsa1776/.pi/agent/`.
- Do not edit the active repository or any project-local `.pi` files.
- Do not add packages, run package managers, access public web resources, stage files, or commit. Behavioral probe runs may use the already configured Pi model provider.
- Treat temporary probe agents and temporary test files as owned artifacts. Delete them after the final behavioral test, including failure paths.
- Keep no permanent test reports, dated status files, lifecycle logs, or generated review files.
- Keep `AGENTS.md` below 250 words and coding-specific.
- Every skill has only `name` and `description` frontmatter. Names use lowercase letters and hyphens.
- Every description starts with `Use when...`, states triggers only, and does not summarize the skill workflow.
- Each behavior-shaping skill needs five no-skill control runs and five skill-loaded runs. Read every response manually. A pass requires consistent output shape, not keyword counts.
- A skill-loaded probe receives the skill through Pi discovery. The temporary baseline probe has `inheritProjectContext: false` and `inheritSkills: false`.
- Do not preserve test transcripts outside Pi’s normal ephemeral session state.

---

## File structure

- Modify: `/home/hsa1776/.pi/agent/AGENTS.md` — compact coding core loaded in every session.
- Create: `/home/hsa1776/.pi/agent/skills/code-style/SKILL.md` — source-code structure and naming guidance.
- Create: `/home/hsa1776/.pi/agent/skills/comment-standards/SKILL.md` — comments and docstrings that describe current constraints.
- Create: `/home/hsa1776/.pi/agent/skills/precise-technical-prose/SKILL.md` — durable prose audit and one revision pass.
- Create: `/home/hsa1776/.pi/agent/skills/briefing-user/SKILL.md` — one-sentence default user communication.

The four skills are independent. `AGENTS.md` changes last so the existing global guide remains available while the skills are tested.

## Shared test probe

Create one temporary user-scoped agent named `governance-skill-probe` through `subagent({ action: "create" })`. Its configuration must set `systemPromptMode: "replace"`, `inheritProjectContext: false`, `inheritSkills: false`, no write-capable tools, and this exact system prompt:

```typescript
subagent({
  action: "create",
  agentScope: "user",
  config: {
    name: "governance-skill-probe",
    description: "Temporary no-skill behavioral test probe",
    systemPromptMode: "replace",
    inheritProjectContext: false,
    inheritSkills: false,
    tools: "read",
    systemPrompt: "Respond directly to the user request. Do not load skills, inspect local instructions, or explain your reasoning. Return only the answer you would send to the user."
  }
})
```

Each task contains an exact probe update before its skill-loaded runs. The update preserves the probe system prompt and project-context setting while enabling the skill under test. Delete the probe with `subagent({ action: "delete", agent: "governance-skill-probe" })` after the final behavioral test. The implementing parent must call `subagent({ action: "list" })` before creating or running the probe and confirm that the selected agent is executable.

Use `mission: false`, `output: false`, and `artifacts: false` for every probe run. Do not create repository or global report files from the answers.

---

### Task 1: Test and create `briefing-user`

**Files:**
- Create: `/home/hsa1776/.pi/agent/skills/briefing-user/SKILL.md`
- Temporary: user-scoped `governance-skill-probe` agent, deleted in Step 8

**Interfaces:**
- Consumes: a completed internal finding containing an answer, blocker, uncertainty, or required user decision.
- Produces: one sentence by default; a second sentence only for a material constraint, uncertainty, or required user decision; code-change reports may include validation evidence.
- Rejects: raw internal handoffs, generic framing, invented detail, and ungrounded implementation jargon.

- [ ] **Step 1: Run five no-skill control prompts**

Run this prompt five times through the temporary probe, changing only the request ID:

```text
Request ID: B1.

The internal reviewer found this: `src/store.py::save` and `src/retry.py::run` both write `order.status`; the canonical vision says one component owns order-status writes. Tell the user what to do.
```

Record in the live session whether each response puts the blocker first, stays within two sentences, avoids a recap, and avoids invented mechanisms. Do not write a report file.

- [ ] **Step 2: Verify the controls expose the missing contract**

Mark the baseline as failing only if at least one response uses an unnecessary preamble, restates the request, buries the blocker, exceeds two sentences, or invents a fact. If all five controls already meet the contract, stop this task and report that the proposed skill adds no demonstrated behavior.

- [ ] **Step 3: Create the minimal skill**

Write this file:

```markdown
---
name: briefing-user
description: Use when sending a user-facing answer, blocker, decision, or completed code-change report
---

# Briefing the user

State the answer, decision, or blocker in one sentence.

Add one sentence only for a material constraint, uncertainty, or required user decision. Completed code-change reports may add validation evidence and automatic minor fixes.

Use stable user terms. Name an implementation detail only when it identifies a distinct mechanism that matters, and ground it in an artifact, responsibility, boundary, or source location.

Remove preambles, recaps, praise, generic conclusions, closing offers, and raw internal handoffs.

If the relevant concepts cannot be named distinctly, report the terminology collision and return the work to design.

## Final check

Before delivery, verify that the first sentence answers the user and that every additional sentence is necessary.
```

- [ ] **Step 4: Reload Pi resources**

Run `/reload` in the interactive Pi session. Confirm that `briefing-user` appears in the discovered skill catalog.

- [ ] **Step 5: Load the skill and run five prompts**

Update the probe with:

```typescript
subagent({
  action: "update",
  agent: "governance-skill-probe",
  config: { inheritSkills: true, skills: "briefing-user" }
})
```

Run the exact Step 1 prompt five times. Read every answer. Each answer must begin with the blocker, use no more than two sentences, and avoid facts absent from the prompt.

- [ ] **Step 6: Run the terminology-pressure prompt**

Run this prompt once with the skill loaded:

```text
The reviewer cannot tell whether “session” means the browser login, database transaction, or background-worker run. Tell the user whether implementation can continue.
```

Expected shape:

```text
Blocked: “session” names three different mechanisms, so the design must define them before implementation.
```

- [ ] **Step 7: Check frontmatter and word count**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
path = Path('/home/hsa1776/.pi/agent/skills/briefing-user/SKILL.md')
text = path.read_text()
assert text.startswith('---\nname: briefing-user\ndescription: Use when')
assert text.count('---\n') >= 2
assert len(text.split()) <= 220
print('briefing-user frontmatter and size valid')
PY
```

Expected: `briefing-user frontmatter and size valid`.

- [ ] **Step 8: Delete the temporary probe**

Delete `governance-skill-probe`. Verify it no longer appears in `subagent({ action: "list" })`.

---

### Task 2: Test and create `precise-technical-prose`

**Files:**
- Create: `/home/hsa1776/.pi/agent/skills/precise-technical-prose/SKILL.md`
- Temporary: recreate and delete `governance-skill-probe`

**Interfaces:**
- Consumes: a user-approved durable prose draft and its required facts, identifiers, citations, and structure.
- Produces: a final draft after one audit and at most one revision.
- Preserves: technical claims, source citations, code identifiers, paths, commands, quotations, tables, and required document structure.
- Excludes: source code, configuration, generated content, command output, quotations, and fixed schemas.

- [ ] **Step 1: Run five no-skill control prompts**

Run this prompt five times through the temporary probe:

```text
Rewrite this release note for a maintainer:

“This update represents a major milestone in the ongoing evolution of the cache layer. It delivers a robust and seamless mechanism that enables developers to leverage the cache in order to improve performance. The cache stores successful lookups for 60 seconds.”
```

Record whether each response retains the measured fact, removes unsupported significance claims, removes promotional language, and avoids a generic closing.

- [ ] **Step 2: Verify the controls expose the missing contract**

Treat a response as a control failure when it retains unsupported significance or promotional claims, adds a new claim, or removes the 60-second fact. If every control passes, stop this task and report that the proposed skill adds no demonstrated behavior.

- [ ] **Step 3: Create the minimal skill**

Write this file:

```markdown
---
name: precise-technical-prose
description: Use when drafting or revising design documents, plans, ADRs, release notes, or other durable technical prose
---

# Precise technical prose

State the decision or fact first. Preserve required evidence, identifiers, commands, paths, citations, quotations, tables, and document structure.

Use one claim per sentence. Remove unsupported significance claims, promotional wording, vague attribution, generic transitions, repeated conclusions, and future speculation without an approved purpose.

Use direct words. Keep the document as short as its decision and evidence permit.

Do not apply this skill to source code, configuration, generated content, command output, quoted evidence, or fixed schemas.

## Final check

Audit the draft once. Revise once only for a concrete violation. Return the final version without an editorial narrative.
```

- [ ] **Step 4: Load the skill and run five prompts**

Reload Pi resources. Update the probe with:

```typescript
subagent({
  action: "update",
  agent: "governance-skill-probe",
  config: { inheritSkills: true, skills: "precise-technical-prose" }
})
```

Run the Step 1 prompt five times. Every response must retain the 60-second fact and omit unsupported significance, promotional wording, generic closure, and invented claims.

- [ ] **Step 5: Run preservation pressure**

Run this prompt once with the skill loaded:

```text
Revise this design note without changing its identifiers or command:

Run `python -m app.sync --mode safe`. `SyncCoordinator` owns retries. The command completes only after `sync_complete` is emitted. This is a robust approach that highlights the project’s commitment to reliability.
```

Expected output retains `python -m app.sync --mode safe`, `SyncCoordinator`, and `sync_complete`, while removing the unsupported final sentence.

- [ ] **Step 6: Validate the file**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
path = Path('/home/hsa1776/.pi/agent/skills/precise-technical-prose/SKILL.md')
text = path.read_text()
assert text.startswith('---\nname: precise-technical-prose\ndescription: Use when')
assert len(text.split()) <= 220
print('precise-technical-prose frontmatter and size valid')
PY
```

Expected: `precise-technical-prose frontmatter and size valid`.

- [ ] **Step 7: Delete the temporary probe**

Delete `governance-skill-probe` and verify its removal with `subagent({ action: "list" })`.

---

### Task 3: Test and create `code-style`

**Files:**
- Create: `/home/hsa1776/.pi/agent/skills/code-style/SKILL.md`
- Temporary: recreate and delete `governance-skill-probe`

**Interfaces:**
- Consumes: an approved source-code change and current repository patterns.
- Produces: direct, explicit code that preserves current ownership and adds no speculative structure.
- Rejects: abstractions without a current consumer or boundary, future-only configuration, generic names, hidden policy, and compressed control flow that obscures failure behavior.

- [ ] **Step 1: Run five no-skill control prompts**

Run this prompt five times through the temporary probe:

```text
Add a function that sends one audit event. A second destination may exist someday, but no current caller needs it. Show the code structure you would introduce.
```

Record whether the response introduces a factory, strategy, registry, plug-in interface, cache, configuration flag, or other future-only structure.

- [ ] **Step 2: Verify the controls expose the missing contract**

Treat a response as a control failure when it introduces a future-only abstraction or hides the event policy behind a generic utility. If every control passes, stop this task and report that the proposed skill adds no demonstrated behavior.

- [ ] **Step 3: Create the minimal skill**

Write this file:

```markdown
---
name: code-style
description: Use when adding or changing source code, interfaces, module boundaries, names, control flow, or dependencies
---

# Code style

Follow current repository patterns when they match the approved responsibility and constraints. Prefer one direct owner, explicit data flow, named policy, ordinary control flow, and domain names.

Add an abstraction only for a current boundary, current independent consumers, a required alternative implementation, or an invariant it enforces. Do not add future-only factories, registries, plug-ins, caches, retries, configuration, flags, or extension points.

Keep functions and classes focused on one responsibility. Make failure behavior, mutation, ordering, and ownership visible. Use types and names that distinguish semantic concepts.

Reject generic names, magic values without a source, hidden policy, dense chains that mix work and recovery, and comments that compensate for unclear code.

## Final check

Name the present requirement and the owning boundary for every new structure. Remove any structure justified only by a possible future use.
```

- [ ] **Step 4: Load the skill and run five prompts**

Reload Pi resources. Update the probe with:

```typescript
subagent({
  action: "update",
  agent: "governance-skill-probe",
  config: { inheritSkills: true, skills: "code-style" }
})
```

Run the Step 1 prompt five times. Every response must use one direct sending path and must not add future-only structure.

- [ ] **Step 5: Run an ownership pressure prompt**

Run this prompt once with the skill loaded:

```text
A request handler validates an invoice, writes it, sends an email, updates a cache, and retries failures. Propose the smallest structure that makes the owners visible.
```

Expected behavior: identify separate responsibilities and name the current owner for each required action without adding a generic manager or future-only extension framework.

- [ ] **Step 6: Validate the file and delete the probe**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
path = Path('/home/hsa1776/.pi/agent/skills/code-style/SKILL.md')
text = path.read_text()
assert text.startswith('---\nname: code-style\ndescription: Use when')
assert len(text.split()) <= 220
print('code-style frontmatter and size valid')
PY
```

Expected: `code-style frontmatter and size valid`.

Delete `governance-skill-probe` and verify its removal.

---

### Task 4: Test and create `comment-standards`

**Files:**
- Create: `/home/hsa1776/.pi/agent/skills/comment-standards/SKILL.md`
- Temporary: recreate and delete `governance-skill-probe`

**Interfaces:**
- Consumes: current code, its tests, and a proposed comment or docstring.
- Produces: a short comment only when it records a current non-obvious invariant, external constraint, compatibility behavior, dangerous failure, unusual source of truth, or ordering requirement.
- Rejects: syntax narration, generic claims, future design notes, subsystem biographies, and comments that mask unclear names or boundaries.

- [ ] **Step 1: Run five no-skill control prompts**

Run this prompt five times through the temporary probe:

```text
Add comments to this function:

def save(invoice):
    if invoice.id in saved_ids:
        return
    saved_ids.add(invoice.id)
    write(invoice)
```

Record whether the response writes syntax narration, claims generic quality, or invents a future design purpose.

- [ ] **Step 2: Verify the controls expose the missing contract**

Treat a response as a control failure when it comments visible syntax or adds a generic claim. If every control passes, stop this task and report that the proposed skill adds no demonstrated behavior.

- [ ] **Step 3: Create the minimal skill**

Write this file:

```markdown
---
name: comment-standards
description: Use when adding, changing, reviewing, or removing comments and docstrings in source code
---

# Comment standards

Write a comment only for a current non-obvious invariant, external constraint, compatibility behavior, dangerous failure prevented here, unusual source of truth, or ordering requirement.

A comment states one constraint that code and tests do not make clear. It uses current names and behavior.

Do not narrate syntax, claim generic quality, explain a future architecture, promise an untracked feature, or attach a subsystem history to a small code unit. Move future direction to a vision record, ADR, or approved design document.

When a comment is needed to explain a function’s basic responsibility, improve the function boundary or name first.

## Final check

Delete the comment when the reader can infer its claim directly from the code, type, test, or name.
```

- [ ] **Step 4: Load the skill and run five prompts**

Reload Pi resources. Update the probe with:

```typescript
subagent({
  action: "update",
  agent: "governance-skill-probe",
  config: { inheritSkills: true, skills: "comment-standards" }
})
```

Run the Step 1 prompt five times. Every response must either return no comment or state the current idempotency invariant without narrating visible syntax.

- [ ] **Step 5: Run future-direction pressure**

Run this prompt once with the skill loaded:

```text
The vision says a future queue adapter may replace the current direct sender. Add comments to prepare the code for that future adapter.
```

Expected behavior: reject future-oriented comments and state that the vision does not authorize code scaffolding or future design notes.

- [ ] **Step 6: Validate the file and delete the probe**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
path = Path('/home/hsa1776/.pi/agent/skills/comment-standards/SKILL.md')
text = path.read_text()
assert text.startswith('---\nname: comment-standards\ndescription: Use when')
assert len(text.split()) <= 220
print('comment-standards frontmatter and size valid')
PY
```

Expected: `comment-standards frontmatter and size valid`.

Delete `governance-skill-probe` and verify its removal.

---

### Task 5: Reduce `AGENTS.md` after all skills pass

**Files:**
- Modify: `/home/hsa1776/.pi/agent/AGENTS.md`
- Uses: all four skills created in Tasks 1–4

**Interfaces:**
- Consumes: the approved foundation skills.
- Produces: global coding-core rules that apply to every agent without duplicating role-specific guidance.
- Preserves: evidence, safety, ownership, validation, and user-change protection.

- [ ] **Step 1: Confirm the four skills are discovered**

Reload Pi resources. Confirm the discovered skill catalog includes `briefing-user`, `precise-technical-prose`, `code-style`, and `comment-standards`.

- [ ] **Step 2: Replace `AGENTS.md` with the compact coding core**

Replace the full file with:

```markdown
# Coding core

Follow local repository instructions before global conventions.

## Boundaries

Read relevant source, tests, configuration, and local instructions before proposing a change. Preserve unrelated user work. Keep one concern per change. Ask before changing public behavior, persistence, security, dependencies, configuration, build tooling, generated output, or repository-wide conventions.

Use the smallest design that satisfies a demonstrated present requirement. Name owners, inputs, outputs, invariants, and failures. Keep I/O, time, randomness, persistence, network access, hardware access, and process execution at explicit boundaries.

## Evidence and changes

Cite local evidence for repository behavior. State uncertainty when evidence is missing. Do not invent requirements, APIs, commands, tests, or results. Do not stage, commit, push, switch branches, reset, stash, delete, or change Git state without explicit user approval.

## Validation

Use focused tests for changed behavior. Run the narrowest relevant test first, then required checks. Record commands, results, and validation gaps. Do not disable tests, warnings, checks, or type errors.

Load `code-style`, `comment-standards`, `precise-technical-prose`, and `briefing-user` when their descriptions match the current task.
```

- [ ] **Step 3: Verify the compact core**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
path = Path('/home/hsa1776/.pi/agent/AGENTS.md')
text = path.read_text()
assert len(text.split()) < 250
for forbidden in ('Anti-AI writing rules', 'Comments and documentation', 'Harness and chat communication'):
    assert forbidden not in text
for required in ('code-style', 'comment-standards', 'precise-technical-prose', 'briefing-user'):
    assert required in text
print('AGENTS.md is a compact coding core')
PY
```

Expected: `AGENTS.md is a compact coding core`.

- [ ] **Step 4: Run end-to-end selection checks**

Run these commands without saving output to files. The temporary directory prevents project-local instructions from affecting the check and is removed when the shell exits:

```bash
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT
cd "$test_dir"
pi --no-session --no-extensions --print --skill /home/hsa1776/.pi/agent/skills/code-style 'Add a direct audit-event send path with no future abstraction.'
pi --no-session --no-extensions --print --skill /home/hsa1776/.pi/agent/skills/comment-standards 'Review this future-adapter comment: “A queue adapter will go here.”'
pi --no-session --no-extensions --print --skill /home/hsa1776/.pi/agent/skills/precise-technical-prose 'Rewrite this release note: “This pivotal update delivers a seamless cache. The cache stores lookups for 60 seconds.”'
pi --no-session --no-extensions --print --skill /home/hsa1776/.pi/agent/skills/briefing-user 'Tell the user whether a design may continue when two files write the same order status.'
```

Verify that each response follows its matching contract. Do not retain printed output in a file.

- [ ] **Step 5: Check that no temporary artifacts remain**

Run:

```bash
if find /home/hsa1776/.pi/agent/agents -type f -name 'governance-skill-probe.md' -print -quit | grep -q .; then
  echo 'temporary probe remains'
  exit 1
fi
if find /home/hsa1776/.pi/agent -type f -name 'governance-test-*' -print -quit | grep -q .; then
  echo 'temporary governance test artifact remains'
  exit 1
fi
echo 'no governance temporary artifacts remain'
```

Expected: `no governance temporary artifacts remain`.

---

## Plan self-review

- Spec coverage: Tasks 1–5 implement the first delivery milestone from the approved specification: a short coding core plus tested briefing, durable-prose, code-style, and comment-standard skills.
- Deferred scope: read-only role contracts, claim verification, parent workflow, Git guardian, review console, vision records, and repository opt-in material require separate plans because each adds an independently reviewable subsystem.
- Placeholder scan: this plan contains no unresolved markers, generic validation steps, or unnamed interfaces.
- Consistency: all temporary probes use the same name and deletion requirement; all global skills use the documented discovery location; `AGENTS.md` references the four created skills.
