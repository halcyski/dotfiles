---
name: workflow-controller
description: Use when the parent must route specialist agents, validate structured handoffs, and synthesize a user-facing result
---

# Workflow controller

The parent owns routing, child launch, artifact validation, retry limits, gate evaluation, implementation-task assignment, and user communication. Children return artifacts only. Do not forward raw child prose to the user.

## Scope requests

Classify each request once as `direct`, `standard`, or `governed`. State the selected path and reason in user terms before delegation.

Use `direct` for questions, explanation, and no-change work. Answer from local evidence without workflow artifacts.

Use `standard` for a known local change with an established pattern and focused validation. Inspect the boundary, state the intended change, assign one implementation worker only when delegation helps, validate the result, and report it. Escalate to `governed` when the work exposes a new boundary, requirement ambiguity, incompatible precedent, public contract, persistence, security, configuration, or architectural direction change.

Use `governed` for those escalations and for durable architecture or feature design. Fan out read-only delegates only after defining independent evidence requests. Keep one writer in the active repository unless independent writers have isolated workspaces.

Record the classification with `workflow_record_scope` when it must survive later turns.

## Controller inputs

Record the requested outcome, constraints, authority boundary, and applicable stop conditions. For durable prose, the parent also supplies `reader`, `decision`, required literals, and labeled source paragraphs.

When proposing a design, record its ID, revision, scope, and outcome with `workflow_record_design` using `propose`. Record `approve` only after explicit user approval. A design approval does not authorize repository changes. When the user asks to implement a design, call `workflow_resolve_implementation`. Proceed only for its single `resolved` design, then record `start-implementation`. Report `none` or `ambiguous` results to the user without choosing a design.

## Governed design path

1. Launch `request-normalizer` with the user request and confirmed constraints. Validate its result with `validate_workflow_artifact` for `request-normalization/v1`. Return violations to the child for bounded correction. Stop for unresolved blocking questions. Ask the user to confirm the normalized intent before architecture work.
2. Gather current repository evidence in the parent. Check applicable repository direction and established precedents. Do not reuse the prose-only `repository-scout` for general architecture evidence.
3. Launch `architecture-designer` with the confirmed intent and labeled evidence. Validate its result with `validate_workflow_artifact` for `architecture-design/v1`. Return violations to the child for bounded correction. Stop for open decisions that prevent a coherent design.
4. Record the proposed design state, present the design to the user, and wait for explicit approval. Do not launch `plan-author`, `implementation-worker`, or `change-reviewer` during this path.

## Implementation path

1. On an explicit implementation request, call `workflow_resolve_implementation`. Stop unless it resolves exactly one approved design.
2. Launch `plan-author` with the approved design and evidence. Validate `implementation-plan/v1`, record it with `workflow_record_plan` using `propose`, and wait for explicit user plan approval before recording `approve`.
3. Call `workflow_inspect_git_state` before assignment. Stop for an active Git operation or any state that prevents a reliable base commit and diff fingerprint.
4. Assign one approved plan task to `implementation-worker`. Supply its allowed paths, tests, validation commands, stop conditions, base commit, and current diff fingerprint. Validate the returned `implementation-report/v1`. A no-edit verification rerun with a valid implementation report and empty `changed_paths` is not a harness failure.
5. Call `workflow_check_report_freshness` with the report binding and current base commit and diff fingerprint. Stop on `stale`; do not review or repair it.
6. Launch `change-reviewer` only for a fresh report. The reviewer may report findings, but cannot authorize repair or completion. New scope, a new pattern, or unresolved findings returns to the earlier gate.
7. Call `workflow_review_console` after the fresh review to select the next action; it does not authorize repair or completion.

## Child protocol

Launch only the child needed for the current gate. A child may not launch another agent, route work, evaluate a gate, mutate files, or communicate with the user.

Validate every handoff before launching another child. Reject malformed JSON, unsupported claims, lost required literals, unverified citations, and fields outside the role schema. Return the exact rejected field or fragment to the owning child. The parent owns retry limits.

## Prose workflow

1. Launch `precise-prose-selector` with the parent-supplied `source_id`, `reader`, `decision`, required literals, and labeled source paragraphs.
2. Require a valid `precise-prose-selection/v1` artifact. Its `reader` and `decision` fields must match the parent inputs. Each decision must use an allowed action and schema type.
3. When the parent gate classifies `material_issue` as missing direct evidence, launch `repository-scout` with the repository root, selector inputs, required literals, and the exact evidence gap. Require a valid `repository-scout/v1` artifact. Before accepting it, call `validate_source_evidence_artifact` with the supplied repository root and the complete scout artifact. If `valid` is false, stop; return its `violations` to `repository-scout` for correction or to the owning gate when the retry limit is exhausted. Only when `valid` is true may the parent accept the artifact. Its carried fields must match the parent inputs; every excerpt path must remain inside the repository root, and its quoted line range and content must match the source before reuse. Re-run `precise-prose-selector` with the validated scout excerpts as labeled source paragraphs. Do not give scout output directly to the writer.
4. Stop before the writer when no retained or rewritten content remains, the scout finds no direct evidence, or `material_issue` is ambiguity, an unsupported vision claim, or an unsupported correction. Return the exact gap or unsupported assertion to the owning parent gate.
5. Launch `precise-prose-writer` only when the selection has retained or rewritten content and no material issue. Do not give the writer discarded source paragraphs.
6. Reject a result that loses a required literal, adds a claim outside the artifact, repeats a heading, includes a component tour, acceptance artifact, scorecard, checklist, editorial narrative, or a parent-facing blocker.
7. Synthesize the accepted result for the user with `briefing-user`.

## Final check

Before delivery, confirm that the parent made every routing and gate decision, every child artifact was validated, and no raw child prose reached the user.
