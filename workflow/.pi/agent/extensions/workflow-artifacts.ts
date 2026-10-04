import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const SCHEMAS = ["request-normalization/v1", "architecture-design/v1", "implementation-plan/v1", "implementation-report/v1", "review-findings/v1"] as const;
type ArtifactSchema = (typeof SCHEMAS)[number];
type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

function stringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every(nonEmptyString);
}

function exactKeys(value: JsonObject, keys: readonly string[], violations: string[]) {
	for (const key of Object.keys(value)) {
		if (!keys.includes(key)) violations.push(`unexpected field: ${key}`);
	}
	for (const key of keys) {
		if (!(key in value)) violations.push(`missing field: ${key}`);
	}
}

function requiredString(value: JsonObject, field: string, violations: string[]) {
	if (!nonEmptyString(value[field])) violations.push(`${field} must be a non-empty string`);
}

function requiredStringArray(value: JsonObject, field: string, violations: string[]) {
	if (!stringArray(value[field])) violations.push(`${field} must be an array of non-empty strings`);
}

function objectArray(
	value: JsonObject,
	field: string,
	keys: readonly string[],
	stringFields: readonly string[],
	violations: string[],
	allowEmpty = false,
) {
	if (!Array.isArray(value[field]) || (!allowEmpty && value[field].length === 0)) {
		violations.push(`${field} must be ${allowEmpty ? "an" : "a non-empty"} array`);
		return;
	}
	for (const [index, item] of value[field].entries()) {
		if (!isObject(item)) {
			violations.push(`${field}[${index}] must be an object`);
			continue;
		}
		exactKeys(item, keys, violations);
		for (const key of stringFields) {
			if (!nonEmptyString(item[key])) violations.push(`${field}[${index}].${key} must be a non-empty string`);
		}
		if (keys.includes("evidence") && !stringArray(item.evidence)) {
			violations.push(`${field}[${index}].evidence must be an array of non-empty strings`);
		}
		if (keys.includes("step") && (!Number.isInteger(item.step) || (item.step as number) < 1)) {
			violations.push(`${field}[${index}].step must be a positive integer`);
		}
	}
}

function validateNormalization(artifact: unknown): string[] {
	if (!isObject(artifact)) return ["artifact must be an object"];
	const violations: string[] = [];
	exactKeys(artifact, ["schema", "requested_outcome", "constraints", "non_goals", "authority_boundary", "blocking_questions"], violations);
	if (artifact.schema !== "request-normalization/v1") violations.push("schema must equal request-normalization/v1");
	requiredString(artifact, "requested_outcome", violations);
	requiredStringArray(artifact, "constraints", violations);
	requiredStringArray(artifact, "non_goals", violations);
	requiredString(artifact, "authority_boundary", violations);
	requiredStringArray(artifact, "blocking_questions", violations);
	return violations;
}

function validateDesign(artifact: unknown): string[] {
	if (!isObject(artifact)) return ["artifact must be an object"];
	const violations: string[] = [];
	exactKeys(artifact, ["schema", "outcome", "changed_boundaries", "owners", "data_flow", "invariants", "failures", "validation", "non_goals", "open_decisions"], violations);
	if (artifact.schema !== "architecture-design/v1") violations.push("schema must equal architecture-design/v1");
	requiredString(artifact, "outcome", violations);
	objectArray(artifact, "changed_boundaries", ["name", "owner", "input", "output", "invariant", "failure"], ["name", "owner", "input", "output", "invariant", "failure"], violations);
	objectArray(artifact, "owners", ["name", "responsibility", "evidence"], ["name", "responsibility"], violations);
	objectArray(artifact, "data_flow", ["step", "from", "to", "data", "evidence"], ["from", "to", "data"], violations);
	objectArray(artifact, "invariants", ["name", "statement", "evidence"], ["name", "statement"], violations);
	objectArray(artifact, "failures", ["boundary", "condition", "required_behavior", "evidence"], ["boundary", "condition", "required_behavior"], violations);
	objectArray(artifact, "validation", ["name", "assertion", "evidence"], ["name", "assertion"], violations);
	objectArray(artifact, "non_goals", ["statement", "evidence"], ["statement"], violations);
	objectArray(artifact, "open_decisions", ["decision", "reason", "evidence"], ["decision", "reason"], violations, true);
	return violations;
}

function validatePlan(artifact: unknown): string[] {
	if (!isObject(artifact)) return ["artifact must be an object"];
	const violations: string[] = [];
	exactKeys(artifact, ["schema", "design_id", "design_revision", "tasks", "validation", "stop_conditions"], violations);
	if (artifact.schema !== "implementation-plan/v1") violations.push("schema must equal implementation-plan/v1");
	requiredString(artifact, "design_id", violations);
	if (!Number.isInteger(artifact.design_revision) || (artifact.design_revision as number) < 1) violations.push("design_revision must be a positive integer");
	objectArray(artifact, "tasks", ["id", "outcome", "allowed_paths", "required_tests", "validation_commands", "stop_conditions"], ["id", "outcome"], violations);
	for (const task of Array.isArray(artifact.tasks) ? artifact.tasks : []) if (isObject(task)) for (const field of ["allowed_paths", "required_tests", "validation_commands", "stop_conditions"]) requiredStringArray(task, field, violations);
	requiredStringArray(artifact, "validation", violations);
	requiredStringArray(artifact, "stop_conditions", violations);
	return violations;
}

function validateReviewFindings(artifact: unknown): string[] {
	if (!isObject(artifact)) return ["artifact must be an object"];
	const violations: string[] = [];
	exactKeys(artifact, ["schema", "findings", "validated_scope", "residual_risks"], violations);
	if (artifact.schema !== "review-findings/v1") violations.push("schema must equal review-findings/v1");
	requiredStringArray(artifact, "validated_scope", violations);
	requiredStringArray(artifact, "residual_risks", violations);
	if (!Array.isArray(artifact.findings)) {
		violations.push("findings must be an array");
		return violations;
	}
	for (const [index, finding] of artifact.findings.entries()) {
		if (!isObject(finding)) {
			violations.push(`findings[${index}] must be an object`);
			continue;
		}
		exactKeys(finding, ["severity", "location", "evidence", "failure_mode", "smallest_correction"], violations);
		for (const field of ["severity", "location", "failure_mode", "smallest_correction"]) {
			if (!nonEmptyString(finding[field])) violations.push(`findings[${index}].${field} must be a non-empty string`);
		}
		if (!stringArray(finding.evidence)) violations.push(`findings[${index}].evidence must be an array of non-empty strings`);
	}
	return violations;
}

function validateReport(artifact: unknown): string[] {
	if (!isObject(artifact)) return ["artifact must be an object"];
	const violations: string[] = [];
	exactKeys(artifact, ["schema", "task_id", "changed_paths", "validation", "blockers", "residual_risks"], violations);
	if (artifact.schema !== "implementation-report/v1") violations.push("schema must equal implementation-report/v1");
	requiredString(artifact, "task_id", violations);
	requiredStringArray(artifact, "changed_paths", violations);
	requiredStringArray(artifact, "blockers", violations);
	requiredStringArray(artifact, "residual_risks", violations);
	if (!Array.isArray(artifact.validation)) violations.push("validation must be an array");
	else for (const [index, item] of artifact.validation.entries()) {
		if (!isObject(item)) { violations.push(`validation[${index}] must be an object`); continue; }
		exactKeys(item, ["command", "result", "output_summary"], violations);
		for (const field of ["command", "result", "output_summary"]) if (!nonEmptyString(item[field])) violations.push(`validation[${index}].${field} must be a non-empty string`);
	}
	return violations;
}

function result(violations: string[]) {
	const details = { valid: violations.length === 0, violations };
	return { content: [{ type: "text" as const, text: JSON.stringify(details) }], details };
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "validate_workflow_artifact",
		label: "Validate Workflow Artifact",
		description: "Validate a parent-controlled workflow artifact without mutation.",
		parameters: Type.Object({
			schema: Type.Union(SCHEMAS.map((schema) => Type.Literal(schema))),
			artifact: Type.Unknown(),
		}),
		async execute(_toolCallId, params: { schema: ArtifactSchema; artifact: unknown }) {
			if (params.schema === "request-normalization/v1") return result(validateNormalization(params.artifact));
			if (params.schema === "architecture-design/v1") return result(validateDesign(params.artifact));
			if (params.schema === "implementation-plan/v1") return result(validatePlan(params.artifact));
			if (params.schema === "review-findings/v1") return result(validateReviewFindings(params.artifact));
			return result(validateReport(params.artifact));
		},
	});
}
