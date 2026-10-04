# Pi-wide change governance

## Purpose

This system is the conversational workflow for design documents, implementation plans, tests, documentation, source changes, and Git boundaries in any opted-in Git repository. The user speaks to one parent controller. The controller scopes each request and delegates only the required internal work.

It prevents unsupported repository claims, unapproved scope expansion, speculative architecture, stale vision records, unsafe worktree overlap, and unclear user-facing reporting. It keeps the user as the authority for product direction, rejection overrides, commits, branch changes, and destructive Git operations.

## Non-goals

The system does not prove code correctness, make product decisions, commit or publish changes, replace repository tests, infer unstated requirements, or turn a vision record into implementation authorization.

It does not impose one repository's naming, commit, architecture, or documentation style on another repository.

## Terms

A vision is a durable statement of intended outcomes, constraints, non-goals, and architectural direction. It is not a design document and does not authorize code, scaffolding, comments, or abstraction.

A design describes the smallest approved change for a present requirement. A plan orders approved implementation work and validation. An ADR records a durable architectural decision and its consequences.

A baseline is a user-accepted pre-existing Git diff. A gate is a required verdict before a workflow transition. A precedent is an existing repository pattern with the same responsibility and compatible constraints.

## Authority

The parent controller is the interactive Pi agent. It owns request scoping, session state, routing, artifacts, gate evaluation, implementation-task assignment, and final synthesis. The user communicates with the parent in ordinary requests such as "create a design", "implement the approved design", "review this change", or "fix this bug". Child agents are internal delegates; they do not launch other agents, route work, evaluate gates, mutate files unless explicitly assigned implementation work, or communicate with the user.

The controller records an approved design ID and revision with its plan and implementation state in managed session memory. It resolves "implement it" only when exactly one approved, unfinished design matches the request. A design is not implementation authorization until the user explicitly requests implementation. Before planning or implementation, the controller verifies that the request, applicable vision, and relevant repository boundaries still match the approved revision. A mismatch requires reconfirmation or a revised design.

The user alone may reopen a `reject` or `conflict` verdict. Reopening requires a changed requirement, an approved vision change, or an explicit new-pattern decision.

A new pattern blocks implementation until the user, vision aligner, and clean-design critic approve it. The approved decision becomes a cited precedent.

## Collaboration

Agents cooperate through explicit artifacts and verified evidence. They state agreements, disagreements, assumptions, and blockers directly. They critique artifacts, requirements, and evidence rather than other agents.

A cooperative role asks the parent for missing context, preserves another role's approved boundary, and returns work to the owning gate when it finds a conflict. Polite language does not soften a blocker, conceal uncertainty, or substitute praise for evidence.

## Layers

### Global Pi policy

`AGENTS.md` remains a short coding core. It holds authority boundaries, evidence requirements, mutation safety, validation requirements, and repository-preservation rules.

It excludes code style, comment standards, durable-prose rules, and user-briefing rules. Those policies live in separate global skills so an agent loads only the guidance relevant to its current role.

Global skills hold narrow procedures for code style, comment standards, user briefing, durable prose, repository facts, vision alignment, feasibility, pattern precedent, code smells, test strategy, documentation strategy, Git hygiene, and focused reviews. The parent loads the workflow controller for request routing. It loads specialist skills only for the selected path.

Global agents define role authority, tool limits, required artifacts, and stop conditions. They do not contain repository-specific architecture or terminology. The controller may fan out read-only agents only after scope is fixed and only when their evidence requests are independent.

A global extension provides Git preflight and review-console capabilities after the associated role contracts have been tested.

### Repository material

A repository opts in with its own vision records, ADRs, generated-output allowlist, terminology, documentation conventions, commit-style profile, and validation commands.

Repository policy names durable boundaries and owners. It does not duplicate global agent instructions.

## Truth and lifecycle

The vision document is the sole source of truth for long-term direction. ADRs record decisions and consequences, but cannot supersede, restate, or independently redefine vision.

Repository source, configuration, tests, and Git state are the source of truth for current repository behavior. Design documents, plans, scout reports, and prior agent output are evidence to verify against the repository. They are not current-state authority.

Agents create no repository status files, execution logs, dated lifecycle documents, review-report directories, or temporary documentation. The controller keeps temporary handoffs in managed session memory or a dedicated temporary area and removes them after the workflow reaches a terminal state, including failure and cancellation.

Only user-approved durable records remain: canonical vision documents, ADRs, approved design documents, approved plans, source changes, tests, and final user documentation. Durable records state decisions and behavior. They do not record agent lifecycle, run status, timestamps used as freshness proof, or temporary execution state.

## Vision records

A repository begins with one canonical `VISION.md` at its durable product or repository boundary. Add a component-level vision only when that component has an independent owner, outcome, architectural boundary, or delivery commitment.

A long-lived release or integration branch may use a short overlay when it has a separate owner, supported-version policy, and archival condition. Routine feature branches have no vision document. Their design records cite canonical vision IDs and revisions.

A vision contains:

- stable ID and owner
- intended users and outcomes
- current architectural constraints
- non-goals
- declared parent relationship, when one exists
- relationship type: repository, component, submodule, or release stream
- ADR and roadmap links
- review or archival condition
- local delta from the parent

A vision links to parent content rather than copying it. Parent visions may link stable child component visions. They do not track ordinary Git branches.

A change declares one vision impact: `none`, `aligned`, `update required`, or `conflict`. `aligned`, `update required`, and `conflict` require the vision aligner to inspect declared related records. The system reports the records checked. It does not claim global semantic freshness.

Vision review triggers on durable identity, ownership, parent relationship, supported release, public scope, or architectural direction changes. Git ref-only activity does not trigger a vision update.

## Workflow

### Entry and scope routing

The parent scopes every user request before delegation. It classifies the request as `direct`, `standard`, or `governed` and states the selected path and reason in user terms.

`direct` covers questions, explanation, and no-change work. The parent answers from local evidence without creating artifacts or launching a workflow.

`standard` covers a known, local change with an established pattern and focused validation. The parent inspects the relevant boundary, states the intended change, assigns one implementation worker when delegation helps, runs focused validation, and reports the result. A standard change enters the governed path when it exposes a new boundary, requirement ambiguity, incompatible precedent, public contract, persistence, security, configuration, or architectural direction change.

`governed` covers those escalations and requests for durable architecture or feature design. The controller runs the applicable gates below. It may fan out bounded, read-only repository scouts after it defines their independent evidence requests. It keeps one writer in the active repository unless independent writers have isolated workspaces.

The user does not address scouts, selectors, writers, or artifacts directly. The controller keeps temporary request, design, plan, approval, and report state outside the repository. It creates durable repository records only after the relevant approval gate.

### Git preflight

The Git-state guardian runs before repository inspection and before every writer starts. It returns one of:

- `ready`
- `blocked: operation`
- `blocked: uncommitted`
- `baseline accepted`
- `blocked: overlap`
- `blocked: branch state`

Ignored build artifacts and named generated outputs do not block work when they match Git ignore rules or an approved repository-local allowlist. Tracked generated files remain ordinary tracked changes.

A baseline records the pre-existing diff identity, changed paths, user ownership, and allowed scope. A new request blocks when its scope or changed paths overlap an uncommitted baseline without user authorization. The guardian suggests committing the existing feature on its current branch or isolating the new feature. It does not stage, commit, stash, reset, rebase, switch branches, or remove files.

### Request understanding

For governed work, the intent normalizer records requested outcome, constraints, non-goals, authority boundary, and blocking questions. It makes no repository claims and proposes no code.

The repository scout returns facts only: current behavior, affected boundaries, tests, ownership, relevant paths and symbols, assumptions, and unknowns. Every repository claim cites direct evidence.

The user confirms the normalized intent before architecture design begins. Standard work needs this gate only when its intended behavior or authority boundary is unclear.

### Direction and feasibility

The vision aligner returns applicable vision IDs, declared relationships, and `aligned`, `update required`, or `conflict` evidence. It may cite ADRs only to check decision consistency; ADRs do not define vision. Direct work does not trigger vision review. Standard work triggers it only when the change touches a declared vision boundary. Governed work runs it before architecture design.

The rebounder checks present fit, scope, existing boundaries, testability, current requirements, and unsupported assumptions. It returns `clean fit`, `reject`, or `needs clarification`. It does not generate options or code.

A rejection names the current constraint, its evidence, and the condition required for reconsideration.

### Pattern precedent

The pattern-precedent checker searches for the closest existing implementations with the same responsibility. It returns `precedent found`, `no precedent`, `conflicting precedents`, or `precedent unsafe`.

A true precedent matches responsibility and constraints. Superficial similarity does not qualify. A precedent is unsafe when it conflicts with an active vision or ADR, has an established defect, or has incompatible constraints.

A `no precedent` result blocks until the user, vision aligner, and clean-design critic approve a new pattern.

### Options, design, and contracts

The bounded option designer runs only after clean feasibility and an approved precedent or new pattern. It returns one direct approach and at most two materially distinct alternatives. Each option names changed surface, current justification, non-goals, risks, validation, and intentional divergence.

The clean-design critic checks ownership, present requirements, vision, precedent, testability, scope, complexity cost, and unexplained terminology. It can reject every option.

The design author writes the approved design only. Boundary and evidence reviewers inspect it independently.

The plan author converts the approved design into ordered work, seams, validation, and stop conditions. The test strategist creates a test contract. The documentation strategist creates a reader contract. These contracts exist before production implementation.

The pre-production gate requires explicit approval of all applicable design, plan, vision, precedent, test, documentation, and Git results.

### Production and verification

The user requests implementation of one approved design and plan. The controller selects the next task, supplies its approved boundary, precedent, required tests, validation commands, and stop conditions, and assigns one implementation worker to the active repository. The worker may inspect and change only the assigned task. It returns changed paths, validation evidence, and blockers. It may not expand the design, choose a new pattern, commit, switch branches, or launch agents.

The test writer creates failing tests from the approved test contract before production implementation.

One implementation worker changes the active repository. Documentation work follows the reader contract and is checked against implemented behavior. The controller binds each implementation report to the approved design and plan revision, base commit, changed paths, diff fingerprint, and validation results. It treats a report as stale when the current diff, request, applicable vision, or relevant boundary no longer matches. Stale reports cannot authorize review, repair, or completion; the controller reruns affected validation and review against the current state.

Fresh-context reviewers inspect the actual diff and evidence for correctness, contracts, tests, simplicity, code smells, documentation, Git scope, and domain-specific risk. Validators execute applicable checks.

The repair worker changes code only for accepted review findings, failed validation, or unmet acceptance criteria. Repair is bounded. New scope, unresolved design choices, or a new pattern returns to the appropriate earlier gate.

A fix checker may authorize an automatic correction only when the finding is concrete, the correction stays within approved scope, preserves every `3/3` criterion, changes no public contract, persistence, security, configuration, vision, or architectural boundary, and needs no new pattern. The parent reports major design flaws, architectural changes, and scope changes to the user before a writer acts.

The final code-change report lists every fix checker-authorized correction made during the run. Each entry names the finding, changed files, reason it remained in scope, and validation evidence. The report omits the section when no automatic correction was made.

## Code-smell inspection

The code-smell inspector reports only concrete current findings. Each finding contains the affected location, smell, trigger, failure mode, and smallest correction.

Conditional checks include test timing and polling, mixed ownership, multiple responsibilities, long or dense methods, excessive parameter lists, unclear types, magic values, invalid state representation, control-flow depth, duplicated variants, ripple changes, dependency direction, misleading comments, non-meaningful names, cognitive load, and dead code.

Method length, class size, switch statements, and open-closed pressure are review signals. They are not automatic failures. A finding needs a concrete maintenance, correctness, or comprehension risk.

## Review findings and scorecards

A user-facing finding defaults to one sentence. It states one blocker in user terminology without invented mechanisms or ungrounded jargon.

The reviewer stores exact evidence, vision references, suggested fix, alternatives, trade-offs, and validation internally. It reveals them only on request.

Every vision conflict cites the vision document, section, revision, conflicting design or code artifact, and the specific contradiction.

A suggested fix passes through a fix proposer, vision aligner, and clean-design critic before it appears in the review console. No clean fix is presented as an approved direction.

The claim verifier is an independent hallucination check. It classifies every score justification as observed, inferred, predicted, or unverified. A `3/3` criterion needs direct repository or approved-artifact evidence. An unverified claim blocks approval and is never rounded up to fit a scorecard.

Options use evidence-based scorecards rather than false-precision percentages. Each criterion is `0/3`, `1/3`, `2/3`, or `3/3` with a citation or an explicit evidence gap.

- `3/3`: acceptable and a good fit within the current design; safe to implement.
- `2/3`: feasible, but additional ergonomics or supporting work may be needed.
- `1/3`: needs serious reconsideration; a better approach may exist.
- `0/3`: moves away from the intended design and has a concrete evidenced failure mode.

A code change requires `3/3` on every applicable criterion. An overall vision-direction rating may summarize how well a rejected option advances the vision, but it never converts a failed criterion into approval. A failed critical check also blocks regardless of the total.

No `3/3` option is a design signal. The report names whether the cause is the proposed approach, current architecture, missing evidence, or incompatible requirements. It does not assign blame. An intended extension boundary may need redesign before a later feature can fit it.

## User communication

`briefing-user` is separate from `AGENTS.md` and controls messages shown to the user. Its default output is one sentence that states the answer, decision, or blocker.

A second sentence is allowed only for a material constraint, uncertainty, or required user decision. Completed code-change reports may add validation evidence and any automatic minor-fix entries. Detailed plans, source research, review reports, and explanations appear only when the user asks for them.

User-facing messages use stable terms. An implementation term appears only when it identifies a distinct mechanism relevant to the decision. It is grounded in an artifact, responsibility, boundary, or source location. The system avoids near-synonyms and does not use one term for different mechanisms.

An unresolved terminology collision is a design issue. The reviewer identifies the conflicting concepts and returns the workflow to design rather than concealing the ambiguity with jargon.

Internal handoffs use role-specific schemas. The parent controller synthesizes them and does not forward raw agent prose to the user.

## Review console

The review console is a parent-owned Pi terminal extension. Child reviewers return structured findings; they do not directly own user interaction.

The default row contains one short finding. The user may request a fix, options, evidence, or deferral. Selecting a fix shows only the fix, then asks whether to show its rationale. The rationale names the relevant vision evidence, current boundary, and concrete trade-off. A later explicit action accepts the design direction.

The console does not implement code, override a rejection, stage files, commit, or switch branches.

## Commit proposals

The Git guardian proposes a commit only when every applicable vision, design, plan, test, documentation, code-style, comment-style, validation, review, claim-verification, and Git gate passes; the final diff stays within approved scope; and no unresolved Git operation or unclassified change remains.

A proposed commit contains one feature or one tightly coupled correction. The guardian classifies every changed hunk as included, retained baseline, generated output, or unexplained. It preserves unrelated hunks and blocks a proposal that mixes features or overlaps another uncommitted feature boundary.

A proposal contains a repository-local commit subject, optional rationale body, exact included-hunk and changed-file list, gate evidence, and residual risks. It never adds an AI co-author tag. The guardian derives local subject conventions from repository history, but does not automatically imitate unusually long messages or bodies. It asks the user whether extra detail is warranted before proposing a long commit message.

A proposal is not a commit. The user explicitly authorizes every commit, push, merge, branch change, stash, reset, or destructive operation.

## Prose policy

`precise-technical-prose` governs durable prose. It requires conclusion-first writing, direct verbs, concrete evidence, preserved technical meaning, and one self-audit followed by one revision when a concrete violation exists.

It excludes source code, configuration, generated content, command output, quotations, and fixed schemas. It does not duplicate the code-style, comment-standard, or user-briefing skills.

A later prose guard independently returns `pass` or `rewrite required` for durable prose. The author remains responsible for revision. A prose detector may later provide optional detect-only findings after local calibration. It does not determine factual correctness, technical quality, or authorship.

### Prose evidence workflow

The prose evidence workflow is one specialist path beneath the parent controller. The controller invokes it only when a durable document needs evidence selection or repository fact recovery. Read-only selectors classify supplied paragraphs. A repository scout may retrieve direct excerpts for a preclassified missing-evidence gap. A writer receives only accepted evidence and required literals. The controller validates each artifact, including deterministic provenance checks when available, before passing it to the next delegate. This workflow does not own request scope, architecture decisions, implementation routing, or user communication.

## Delivery sequence

1. Reduce `AGENTS.md` to the shared coding core and move code style, comment standards, durable prose, and user briefing into separate skills.
2. Create and test the parent scope router for `direct`, `standard`, and `governed` requests.
3. Test and create `briefing-user`.
4. Test and create `precise-technical-prose`.
5. Create read-only role contracts and structured artifacts, including claim verification, deterministic artifact validation, and terminal temporary-artifact cleanup.
6. Build parent-controlled gates, design-session state, stale-report checks, and decision records.
7. Add Git-state guardian behavior and hunk-boundary classification.
8. Add the review-console extension.
9. Pilot direct, standard, and governed requests in one repository without automatic mutations except fix-checker-authorized corrections.
10. Measure unsupported scout claims, false blocks, accepted review findings, missed defects, response length, user-requested detail, elapsed time, repair-loop count, and claim-verifier disagreements.
11. Tighten or remove rules only from measured pilot evidence.

## Rejected alternatives

One vision document per Git branch is rejected because transient branches create documentation churn, conflicts, and stale duplicate intent.

Automatic commits and branch manipulation are rejected because they exceed user authority.

An unbounded recursive agent graph is rejected because it hides routing, increases cost, and makes stop conditions unclear.

A universal raw alignment percentage is rejected because it creates false precision. Evidence-backed scorecards retain the underlying facts.

A detector-only definition of AI-shaped writing is rejected because it does not establish factual accuracy, technical clarity, or context-sensitive style.

Persistent repository status documents and date-based agent lifecycle records are rejected because source and canonical vision records already own those facts.
