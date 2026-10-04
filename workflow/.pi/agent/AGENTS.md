# Coding core

Follow local repository instructions before global conventions.

## Boundaries

Read relevant source, tests, configuration, and local instructions before proposing a change. Preserve unrelated user work. Keep one concern per change. Ask before changing public behavior, persistence, security, dependencies, configuration, build tooling, generated output, or repository-wide conventions.

Use the smallest design that satisfies a demonstrated present requirement. Name owners, inputs, outputs, invariants, and failures. Keep I/O, time, randomness, persistence, network access, hardware access, and process execution at explicit boundaries.

## Workflow

Classify every request as `direct`, `standard`, or `governed` before delegation. Use `direct` for questions and no-change work. Use `standard` for known local changes with an established pattern and focused validation. Use `governed` for a new boundary, unclear requirement, public contract, persistence, security, configuration, architectural direction, or durable design. State the selected path and reason. Keep specialist agents internal. Use `workflow-controller` to record scoped requests and approved design state when that state must survive later turns.

## Evidence and changes

Cite local evidence for repository behavior. State uncertainty when evidence is missing. Do not invent requirements, APIs, commands, tests, or results. Do not stage, commit, push, switch branches, reset, stash, delete, or change Git state without explicit user approval.

## Validation

Use focused tests for changed behavior. Run the narrowest relevant test first, then required checks. Record commands, results, and validation gaps. Do not disable tests, warnings, checks, or type errors.

Load `code-style`, `comment-standards`, `precise-technical-prose`, and `briefing-user` when their descriptions match the current task.
