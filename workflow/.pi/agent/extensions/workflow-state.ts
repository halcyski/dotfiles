import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import { resolve } from "node:path";

const SCOPE_TYPES = ["direct", "standard", "governed"] as const;
const DESIGN_ACTIONS = ["propose", "approve", "start-implementation", "complete", "require-reconfirmation", "reconfirm"] as const;
const PLAN_ACTIONS = ["propose", "approve"] as const;

type WorkflowScope = (typeof SCOPE_TYPES)[number];
type DesignAction = (typeof DESIGN_ACTIONS)[number];
type PlanAction = (typeof PLAN_ACTIONS)[number];
type DesignStatus = "proposed" | "approved" | "implementing" | "completed" | "reconfirmation-required";
type PlanStatus = "proposed" | "approved";

interface ScopeRecord {
	schema: "workflow-scope/v1";
	request_id: string;
	scope: WorkflowScope;
	reason: string;
}

interface DesignRecord {
	schema: "workflow-design/v1";
	design_id: string;
	revision: number;
	scope: WorkflowScope;
	outcome: string;
	status: DesignStatus;
}

interface PlanTask {
	id: string;
	allowed_paths: string[];
}

interface PlanRecord {
	schema: "workflow-plan/v1";
	design_id: string;
	design_revision: number;
	plan_revision: number;
	base_commit: string;
	task_ids: string[];
	tasks?: PlanTask[];
	status: PlanStatus;
}

interface SessionManager {
	getEntries(): unknown[];
	appendCustomEntry(customType: string, data?: unknown): string;
}

interface ToolContext {
	sessionManager: SessionManager;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScope(value: unknown): value is WorkflowScope {
	return typeof value === "string" && SCOPE_TYPES.includes(value as WorkflowScope);
}

function isDesignStatus(value: unknown): value is DesignStatus {
	return value === "proposed" || value === "approved" || value === "implementing" || value === "completed" || value === "reconfirmation-required";
}

function isDesignRecord(value: unknown): value is DesignRecord {
	return isRecord(value)
		&& value.schema === "workflow-design/v1"
		&& typeof value.design_id === "string"
		&& Number.isInteger(value.revision)
		&& value.revision > 0
		&& isScope(value.scope)
		&& typeof value.outcome === "string"
		&& isDesignStatus(value.status);
}

function planKey(designId: string, designRevision: number, planRevision: number) {
	return `${designId}@${designRevision}@${planRevision}`;
}

function isPlanTask(value: unknown): value is PlanTask {
	return isRecord(value)
		&& typeof value.id === "string" && value.id.length > 0
		&& Array.isArray(value.allowed_paths) && value.allowed_paths.every((path) => typeof path === "string" && path.length > 0);
}

function isPlanRecord(value: unknown): value is PlanRecord {
	return isRecord(value)
		&& value.schema === "workflow-plan/v1"
		&& typeof value.design_id === "string"
		&& Number.isInteger(value.design_revision) && value.design_revision > 0
		&& Number.isInteger(value.plan_revision) && value.plan_revision > 0
		&& typeof value.base_commit === "string" && value.base_commit.length > 0
		&& Array.isArray(value.task_ids) && value.task_ids.every((taskId) => typeof taskId === "string" && taskId.length > 0)
		&& (value.tasks === undefined || Array.isArray(value.tasks) && value.tasks.every(isPlanTask))
		&& (value.status === "proposed" || value.status === "approved");
}

function currentScope(sessionManager: SessionManager): ScopeRecord | null {
	let scope: ScopeRecord | null = null;
	for (const entry of sessionManager.getEntries()) {
		if (!isRecord(entry) || entry.type !== "custom" || entry.customType !== "workflow-controller/scope" || !isRecord(entry.data)) continue;
		if (entry.data.schema === "workflow-scope/v1" && typeof entry.data.request_id === "string" && isScope(entry.data.scope) && typeof entry.data.reason === "string") {
			scope = entry.data as ScopeRecord;
		}
	}
	return scope;
}

function currentDesigns(sessionManager: SessionManager): Map<string, DesignRecord> {
	const designs = new Map<string, DesignRecord>();
	for (const entry of sessionManager.getEntries()) {
		if (!isRecord(entry) || entry.type !== "custom" || entry.customType !== "workflow-controller/design" || !isDesignRecord(entry.data)) {
			continue;
		}
		designs.set(`${entry.data.design_id}@${entry.data.revision}`, entry.data);
	}
	return designs;
}

function currentPlans(sessionManager: SessionManager): Map<string, PlanRecord> {
	const plans = new Map<string, PlanRecord>();
	for (const entry of sessionManager.getEntries()) {
		if (!isRecord(entry) || entry.type !== "custom" || entry.customType !== "workflow-controller/plan" || !isPlanRecord(entry.data)) continue;
		plans.set(planKey(entry.data.design_id, entry.data.design_revision, entry.data.plan_revision), entry.data);
	}
	return plans;
}

function requireDesign(designs: Map<string, DesignRecord>, designId: string, revision: number): DesignRecord {
	const design = designs.get(`${designId}@${revision}`);
	if (!design) throw new Error(`design does not exist: ${designId}@${revision}`);
	return design;
}

function nextDesignRecord(
	designs: Map<string, DesignRecord>,
	params: {
		action: DesignAction;
		design_id: string;
		revision: number;
		scope?: WorkflowScope;
		outcome?: string;
	},
): DesignRecord {
	if (params.action === "propose") {
		if (!params.scope || !params.outcome) throw new Error("proposed designs require scope and outcome");
		const key = `${params.design_id}@${params.revision}`;
		if (designs.has(key)) throw new Error(`design revision already exists: ${key}`);
		return {
			schema: "workflow-design/v1",
			design_id: params.design_id,
			revision: params.revision,
			scope: params.scope,
			outcome: params.outcome,
			status: "proposed",
		};
	}

	const current = requireDesign(designs, params.design_id, params.revision);
	const transitions: Record<Exclude<DesignAction, "propose">, [DesignStatus, DesignStatus]> = {
		approve: ["proposed", "approved"],
		"start-implementation": ["approved", "implementing"],
		complete: ["implementing", "completed"],
		"require-reconfirmation": ["approved", "reconfirmation-required"],
		reconfirm: ["reconfirmation-required", "approved"],
	};
	const [expected, next] = transitions[params.action];
	if (current.status !== expected) {
		throw new Error(`${params.action} requires a ${expected} design: ${params.design_id}@${params.revision}`);
	}
	return { ...current, status: next };
}

function nextPlanRecord(designs: Map<string, DesignRecord>, plans: Map<string, PlanRecord>, params: { action: PlanAction; design_id: string; design_revision: number; plan_revision: number; base_commit?: string; task_ids?: string[]; tasks?: PlanTask[] }): PlanRecord {
	const key = planKey(params.design_id, params.design_revision, params.plan_revision);
	if (params.action === "propose") {
		if (requireDesign(designs, params.design_id, params.design_revision).status !== "approved") throw new Error("proposed plans require an approved design");
		if (!params.base_commit || !params.task_ids || params.task_ids.length === 0) throw new Error("proposed plans require base_commit and task_ids");
		if (params.tasks && (params.tasks.length !== params.task_ids.length || params.tasks.some((task, index) => task.id !== params.task_ids![index]))) throw new Error("plan tasks must match task_ids");
		if (plans.has(key)) throw new Error(`plan revision already exists: ${key}`);
		return { schema: "workflow-plan/v1", design_id: params.design_id, design_revision: params.design_revision, plan_revision: params.plan_revision, base_commit: params.base_commit, task_ids: params.task_ids, ...(params.tasks ? { tasks: params.tasks } : {}), status: "proposed" };
	}
	const plan = plans.get(key);
	if (!plan) throw new Error(`plan does not exist: ${key}`);
	if (plan.status !== "proposed") throw new Error(`approve requires a proposed plan: ${key}`);
	return { ...plan, status: "approved" };
}

function toolResult<T>(details: T) {
	return {
		content: [{ type: "text" as const, text: JSON.stringify(details) }],
		details,
	};
}

function reviewViolations(review: unknown): string[] {
	if (!isRecord(review)) return ["artifact must be an object"];
	const violations: string[] = [];
	const keys = ["schema", "findings", "validated_scope", "residual_risks"];
	for (const key of Object.keys(review)) if (!keys.includes(key)) violations.push(`unexpected field: ${key}`);
	for (const key of keys) if (!(key in review)) violations.push(`missing field: ${key}`);
	if (review.schema !== "review-findings/v1") violations.push("schema must equal review-findings/v1");
	for (const field of ["validated_scope", "residual_risks"]) {
		if (!Array.isArray(review[field]) || !review[field].every((value) => typeof value === "string" && value.length > 0)) violations.push(`${field} must be an array of non-empty strings`);
	}
	if (!Array.isArray(review.findings)) violations.push("findings must be an array");
	else for (const [index, finding] of review.findings.entries()) {
		if (!isRecord(finding)) {
			violations.push(`findings[${index}] must be an object`);
			continue;
		}
		const findingKeys = ["severity", "location", "evidence", "failure_mode", "smallest_correction"];
		for (const key of Object.keys(finding)) if (!findingKeys.includes(key)) violations.push(`unexpected field: ${key}`);
		for (const key of findingKeys) if (!(key in finding)) violations.push(`missing field: ${key}`);
		for (const field of ["severity", "location", "failure_mode", "smallest_correction"]) if (typeof finding[field] !== "string" || finding[field].length === 0) violations.push(`findings[${index}].${field} must be a non-empty string`);
		if (!Array.isArray(finding.evidence) || !finding.evidence.every((value) => typeof value === "string" && value.length > 0)) violations.push(`findings[${index}].evidence must be an array of non-empty strings`);
	}
	return violations;
}

function reviewConsoleAction(designs: DesignRecord[], plans: PlanRecord[], gitState: Record<string, unknown> | null, freshness: Record<string, unknown> | null, review: Record<string, unknown> | null): string {
	if (gitState && (gitState.blocked === true || Array.isArray(gitState.operations) && gitState.operations.length > 0)) return "inspect";
	if (freshness?.status === "stale" || review && Array.isArray(review.findings) && review.findings.length > 0) return "repair";
	if (designs.some((design) => design.status === "proposed")) return "await-design-approval";
	if (plans.some((plan) => plan.status === "proposed")) return "await-plan-approval";
	if (review && freshness?.status === "fresh" && Array.isArray(review.findings) && review.findings.length === 0 && designs.some((design) => design.status === "implementing" || design.status === "completed")) return "complete";
	if (plans.some((plan) => plan.status === "approved") && designs.some((design) => design.status === "approved" || design.status === "implementing")) return "assign-task";
	return "inspect";
}

interface GitCommandResult {
	exitCode: number;
	stdout: Buffer;
	stderr: Buffer;
}

interface GitState {
	repository_root: string;
	head: string | null;
	branch: string | null;
	detached: boolean;
	operation_flags: {
		merge: boolean;
		rebase: boolean;
		cherry_pick: boolean;
		revert: boolean;
		bisect: boolean;
	};
	staged_paths: string[];
	unstaged_paths: string[];
	untracked_paths: string[];
	fingerprint: string;
}

function runGit(repositoryRoot: string, arguments_: string[]): Promise<GitCommandResult> {
	return new Promise((resolveCommand, rejectCommand) => {
		const child = spawn("git", arguments_, { cwd: repositoryRoot, stdio: ["ignore", "pipe", "pipe"] });
		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
		child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
		child.on("error", rejectCommand);
		child.on("close", (exitCode) => resolveCommand({ exitCode: exitCode ?? 1, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) }));
	});
}

function requireGitSuccess(result: GitCommandResult, description: string): Buffer {
	if (result.exitCode === 0) return result.stdout;
	const detail = result.stderr.toString("utf8").trim();
	throw new Error(`${description}${detail ? `: ${detail}` : ""}`);
}

function diffRecords(output: Buffer): Array<{ path: string; status: string }> {
	const fields = output.toString("utf8").split("\0");
	const records: Array<{ path: string; status: string }> = [];
	for (let index = 0; index < fields.length - 1; index += 2) {
		const status = fields[index];
		const renamedOrCopied = status[0] === "R" || status[0] === "C";
		records.push({ path: fields[index + (renamedOrCopied ? 2 : 1)], status: status[0] });
		if (renamedOrCopied) index += 1;
	}
	return records;
}

function porcelainStatus(staged: Buffer, unstaged: Buffer, untracked: Buffer): Buffer {
	const paths = new Map<string, { index: string; worktree: string }>();
	for (const { path, status } of diffRecords(staged)) paths.set(path, { index: status, worktree: paths.get(path)?.worktree ?? " " });
	for (const { path, status } of diffRecords(unstaged)) paths.set(path, { index: paths.get(path)?.index ?? " ", worktree: status });
	for (const path of untracked.toString("utf8").split("\0").filter(Boolean)) paths.set(path, { index: "?", worktree: "?" });
	return Buffer.from([...paths.entries()].sort(([left], [right]) => Buffer.compare(Buffer.from(left), Buffer.from(right))).map(([path, status]) => `${status.index}${status.worktree} ${path}\0`).join(""));
}

function porcelainPaths(status: Buffer): Pick<GitState, "staged_paths" | "unstaged_paths" | "untracked_paths"> {
	const stagedPaths: string[] = [];
	const unstagedPaths: string[] = [];
	const untrackedPaths: string[] = [];
	for (const record of status.toString("utf8").split("\0").filter(Boolean)) {
		if (record.startsWith("?? ")) untrackedPaths.push(record.slice(3));
		else {
			if (record[0] !== " ") stagedPaths.push(record.slice(3));
			if (record[1] !== " ") unstagedPaths.push(record.slice(3));
		}
	}
	return { staged_paths: stagedPaths, unstaged_paths: unstagedPaths, untracked_paths: untrackedPaths };
}

async function exists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function inspectGitState(repositoryRoot: string): Promise<GitState> {
	const rootResult = await runGit(repositoryRoot, ["rev-parse", "--show-toplevel"]);
	const repositoryRootPath = requireGitSuccess(rootResult, "repository_root is not a Git repository").toString("utf8").trim();
	const [headResult, branchResult, stagedResult, unstagedResult, untrackedResult, gitDirResult] = await Promise.all([
		runGit(repositoryRootPath, ["rev-parse", "--verify", "HEAD"]),
		runGit(repositoryRootPath, ["symbolic-ref", "--quiet", "--short", "HEAD"]),
		runGit(repositoryRootPath, ["diff", "--cached", "--name-status", "-z", "--no-ext-diff"]),
		runGit(repositoryRootPath, ["diff", "--name-status", "-z", "--no-ext-diff"]),
		runGit(repositoryRootPath, ["ls-files", "--others", "--exclude-standard", "-z"]),
		runGit(repositoryRootPath, ["rev-parse", "--git-dir"]),
	]);
	const head = headResult.exitCode === 0 ? headResult.stdout.toString("utf8").trim() : null;
	const branch = branchResult.exitCode === 0 ? branchResult.stdout.toString("utf8").trim() : null;
	const status = porcelainStatus(
		requireGitSuccess(stagedResult, "could not inspect staged Git status"),
		requireGitSuccess(unstagedResult, "could not inspect unstaged Git status"),
		requireGitSuccess(untrackedResult, "could not inspect untracked Git status"),
	);
	const gitDir = requireGitSuccess(gitDirResult, "could not locate Git metadata").toString("utf8").trim();
	const gitMetadata = resolve(repositoryRootPath, gitDir);
	const [merge, rebaseApply, rebaseMerge, cherryPick, revert, bisect] = await Promise.all([
		exists(resolve(gitMetadata, "MERGE_HEAD")),
		exists(resolve(gitMetadata, "rebase-apply")),
		exists(resolve(gitMetadata, "rebase-merge")),
		exists(resolve(gitMetadata, "CHERRY_PICK_HEAD")),
		exists(resolve(gitMetadata, "REVERT_HEAD")),
		exists(resolve(gitMetadata, "BISECT_LOG")),
	]);
	return {
		repository_root: repositoryRootPath,
		head,
		branch,
		detached: head !== null && branch === null,
		operation_flags: { merge, rebase: rebaseApply || rebaseMerge, cherry_pick: cherryPick, revert, bisect },
		...porcelainPaths(status),
		fingerprint: createHash("sha256").update(head ?? "unborn").update("\0").update(status).digest("hex"),
	};
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "workflow_inspect_git_state",
		label: "Inspect Git State",
		description: "Read the current Git state without modifying the repository.",
		parameters: Type.Object({
			repository_root: Type.String({ minLength: 1 }),
		}),
		async execute(_toolCallId, params) {
			return toolResult({ git_state: await inspectGitState(params.repository_root) });
		},
	});

	pi.registerTool({
		name: "workflow_record_scope",
		label: "Record Workflow Scope",
		description: "Persist a parent controller request classification in the current Pi session.",
		parameters: Type.Object({
			request_id: Type.String({ minLength: 1 }),
			scope: Type.Union(SCOPE_TYPES.map((scope) => Type.Literal(scope))),
			reason: Type.String({ minLength: 1 }),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, context: ToolContext) {
			const scope: ScopeRecord = {
				schema: "workflow-scope/v1",
				request_id: params.request_id,
				scope: params.scope,
				reason: params.reason,
			};
			context.sessionManager.appendCustomEntry("workflow-controller/scope", scope);
			return toolResult({ scope });
		},
	});

	pi.registerTool({
		name: "workflow_record_design",
		label: "Record Workflow Design",
		description: "Persist a proposed, approved, active, completed, or reconfirmed design state in the current Pi session.",
		parameters: Type.Object({
			action: Type.Union(DESIGN_ACTIONS.map((action) => Type.Literal(action))),
			design_id: Type.String({ minLength: 1 }),
			revision: Type.Integer({ minimum: 1 }),
			scope: Type.Optional(Type.Union(SCOPE_TYPES.map((scope) => Type.Literal(scope)))),
			outcome: Type.Optional(Type.String({ minLength: 1 })),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, context: ToolContext) {
			const design = nextDesignRecord(currentDesigns(context.sessionManager), params);
			context.sessionManager.appendCustomEntry("workflow-controller/design", design);
			return toolResult({ design });
		},
	});

	pi.registerTool({
		name: "workflow_record_plan",
		label: "Record Workflow Plan",
		description: "Persist a proposed or approved implementation plan in the current Pi session.",
		parameters: Type.Object({
			action: Type.Union(PLAN_ACTIONS.map((action) => Type.Literal(action))),
			design_id: Type.String({ minLength: 1 }),
			design_revision: Type.Integer({ minimum: 1 }),
			plan_revision: Type.Integer({ minimum: 1 }),
			base_commit: Type.Optional(Type.String({ minLength: 1 })),
			task_ids: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })),
			tasks: Type.Optional(Type.Array(Type.Object({
				id: Type.String({ minLength: 1 }),
				allowed_paths: Type.Array(Type.String({ minLength: 1 })),
			}))),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, context: ToolContext) {
			const plan = nextPlanRecord(currentDesigns(context.sessionManager), currentPlans(context.sessionManager), params);
			context.sessionManager.appendCustomEntry("workflow-controller/plan", plan);
			return toolResult({ plan });
		},
	});

	pi.registerTool({
		name: "workflow_review_console",
		label: "Workflow Review Console",
		description: "Read session workflow state and supplied review inputs without mutation or Git subprocesses.",
		parameters: Type.Object({
			git_state: Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
			freshness: Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
			review: Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
		}),
		async execute(_toolCallId, params: { git_state: Record<string, unknown> | null; freshness: Record<string, unknown> | null; review: Record<string, unknown> | null }, _signal, _onUpdate, context: ToolContext) {
			const violations = params.review === null ? [] : reviewViolations(params.review);
			if (violations.length > 0) throw new Error(violations.join("; "));
			const designs = [...currentDesigns(context.sessionManager).values()].sort((left, right) => left.design_id.localeCompare(right.design_id) || left.revision - right.revision);
			const plans = [...currentPlans(context.sessionManager).values()].sort((left, right) => left.design_id.localeCompare(right.design_id) || left.design_revision - right.design_revision || left.plan_revision - right.plan_revision);
			return toolResult({ console: {
				scope: currentScope(context.sessionManager), designs, plans,
				git_state: params.git_state, freshness: params.freshness, review: params.review,
				next_action: reviewConsoleAction(designs, plans, params.git_state, params.freshness, params.review),
			} });
		},
	});

	pi.registerTool({
		name: "workflow_validate_implementation_report",
		label: "Validate Workflow Implementation Report",
		description: "Validate report task and changed paths against an approved implementation plan.",
		parameters: Type.Object({
			design_id: Type.String({ minLength: 1 }), design_revision: Type.Integer({ minimum: 1 }), plan_revision: Type.Integer({ minimum: 1 }),
			task_id: Type.String({ minLength: 1 }), changed_paths: Type.Array(Type.String({ minLength: 1 })),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, context: ToolContext) {
			const plan = currentPlans(context.sessionManager).get(planKey(params.design_id, params.design_revision, params.plan_revision));
			const violations: string[] = [];
			if (!plan || plan.status !== "approved") violations.push("approved plan not found");
			else {
				const task = plan.tasks?.find((candidate) => candidate.id === params.task_id);
				if (!task) violations.push("task is not in approved plan");
				else for (const path of params.changed_paths) if (!task.allowed_paths.includes(path)) violations.push(`changed path is outside approved task paths: ${path}`);
			}
			return toolResult({ report: { status: violations.length === 0 ? "valid" : "invalid", violations } });
		},
	});

	pi.registerTool({
		name: "workflow_check_report_freshness",
		label: "Check Workflow Report Freshness",
		description: "Check an implementation report binding against its approved plan and current diff identity.",
		parameters: Type.Object({
			design_id: Type.String({ minLength: 1 }), design_revision: Type.Integer({ minimum: 1 }), plan_revision: Type.Integer({ minimum: 1 }),
			base_commit: Type.String({ minLength: 1 }), diff_fingerprint: Type.String({ minLength: 1 }),
			current_base_commit: Type.String({ minLength: 1 }), current_diff_fingerprint: Type.String({ minLength: 1 }),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, context: ToolContext) {
			const plan = currentPlans(context.sessionManager).get(planKey(params.design_id, params.design_revision, params.plan_revision));
			const violations: string[] = [];
			if (!plan || plan.status !== "approved") violations.push("approved plan not found");
			else if (plan.base_commit !== params.base_commit || plan.base_commit !== params.current_base_commit) violations.push("base commit changed");
			if (params.diff_fingerprint !== params.current_diff_fingerprint) violations.push("diff fingerprint changed");
			return toolResult({ freshness: { status: violations.length === 0 ? "fresh" : "stale", violations } });
		},
	});

	pi.registerTool({
		name: "workflow_resolve_implementation",
		label: "Resolve Workflow Implementation",
		description: "Resolve the one approved unfinished design that may enter implementation.",
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, _signal, _onUpdate, context: ToolContext) {
			const candidates = [...currentDesigns(context.sessionManager).values()]
				.filter((design) => design.status === "approved")
				.sort((left, right) => left.design_id.localeCompare(right.design_id) || left.revision - right.revision);
			if (candidates.length === 1) return toolResult({ resolution: { status: "resolved", design: candidates[0] } });
			if (candidates.length === 0) return toolResult({ resolution: { status: "none" } });
			return toolResult({ resolution: { status: "ambiguous", design_ids: candidates.map((design) => `${design.design_id}@${design.revision}`) } });
		},
	});
}
