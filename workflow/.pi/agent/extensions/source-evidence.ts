import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { spawn } from "node:child_process";

const MAX_EXCERPTS = 24;
const MAX_LINES_PER_EXCERPT = 200;
const MAX_BYTES_PER_EXCERPT = 32 * 1024;
const MAX_SEARCH_RESULTS = 100;
const MAX_SEARCH_OUTPUT_BYTES = 512 * 1024;
const SEARCH_TIMEOUT_MS = 5_000;

interface SourceExcerptRequest {
	source_label: string;
	path: string;
	line_start: number;
	line_end: number;
}

function requireDescendant(root: string, candidate: string, description: string): void {
	const pathRelative = relative(root, candidate);
	if (pathRelative === "" || pathRelative.startsWith(`..${sep}`) || pathRelative === "..") {
		throw new Error(`${description} must be inside repository_root`);
	}
}

interface RepositoryMatch {
	path: string;
	line: number;
	text: string;
}

interface SourceSnapshot {
	path: string;
	content: string;
	sha256: string;
}

function validateSearchLiterals(literals: string[]): string[] {
	const unique = new Set<string>();
	for (const literal of literals) {
		if (literal.trim() !== literal || /[\r\n\0]/.test(literal)) {
			throw new Error("repository search literals must be non-empty, trimmed single-line text");
		}
		if (unique.has(literal)) {
			throw new Error(`repository search literals must be unique: ${literal}`);
		}
		unique.add(literal);
	}
	return [...unique];
}

function searchRepository(repositoryRoot: string, literals: string[], maxResults: number): Promise<RepositoryMatch[]> {
	return new Promise((resolveSearch, rejectSearch) => {
		const arguments_ = [
			"--json",
			"--fixed-strings",
			"--line-number",
			"--no-heading",
			"--color",
			"never",
			"--max-count",
			"3",
			"--glob",
			"!**/{.git,node_modules,vendor,.venv,venv,build,dist,out,target,__pycache__,.cache,.mypy_cache,.pytest_cache,.ruff_cache}/**",
			...literals.flatMap((literal) => ["-e", literal]),
			".",
		];
		const process = spawn("rg", arguments_, { cwd: repositoryRoot, shell: false });
		let output = "";
		let error = "";
		let overflowed = false;
		let timedOut = false;
		const timeout = setTimeout(() => {
			timedOut = true;
			process.kill();
		}, SEARCH_TIMEOUT_MS);

		process.stdout.on("data", (chunk: Buffer) => {
			if (Buffer.byteLength(output, "utf8") + chunk.length > MAX_SEARCH_OUTPUT_BYTES) {
				overflowed = true;
				process.kill();
				return;
			}
			output += chunk.toString("utf8");
		});
		process.stderr.on("data", (chunk: Buffer) => {
			error += chunk.toString("utf8");
		});
		process.on("error", rejectSearch);
		process.on("close", (code) => {
			clearTimeout(timeout);
			if (timedOut) {
				rejectSearch(new Error(`repository search timed out after ${SEARCH_TIMEOUT_MS}ms`));
				return;
			}
			if (overflowed) {
				rejectSearch(new Error(`repository search exceeded ${MAX_SEARCH_OUTPUT_BYTES} bytes`));
				return;
			}
			if (code !== 0 && code !== 1) {
				rejectSearch(new Error(`rg failed: ${error.trim() || `exit ${code}`}`));
				return;
			}
			const matches: RepositoryMatch[] = [];
			for (const line of output.split("\n")) {
				if (!line) continue;
				const event = JSON.parse(line) as { type?: string; data?: { path?: { text?: string }; line_number?: number; lines?: { text?: string } } };
				if (event.type !== "match" || !event.data?.path?.text || event.data.line_number === undefined) continue;
				matches.push({
					path: event.data.path.text.replace(/^\.\//, ""),
					line: event.data.line_number,
					text: (event.data.lines?.text ?? "").replace(/\r?\n$/, "").slice(0, 500),
				});
				if (matches.length === maxResults) break;
			}
			resolveSearch(matches);
		});
	});
}

async function snapshotSourceFile(repositoryRoot: string, path: string): Promise<SourceSnapshot> {
	if (!path || path.startsWith("/") || path.split(/[\\/]/).includes("..")) {
		throw new Error(`excerpt path must be a relative path without traversal: ${path}`);
	}

	const sourcePath = resolve(repositoryRoot, path);
	requireDescendant(repositoryRoot, sourcePath, "excerpt path");
	const canonicalPath = await realpath(sourcePath);
	requireDescendant(repositoryRoot, canonicalPath, "excerpt path");
	if (!(await lstat(canonicalPath)).isFile()) {
		throw new Error(`excerpt path is not a regular file: ${path}`);
	}

	const bytes = await readFile(canonicalPath);
	return {
		path,
		content: bytes.toString("utf8"),
		sha256: createHash("sha256").update(bytes).digest("hex"),
	};
}

async function extractSourceExcerpt(
	repositoryRoot: string,
	request: SourceExcerptRequest,
): Promise<SourceExcerptRequest & SourceSnapshot> {
	if (request.line_start < 1 || request.line_end < request.line_start) {
		throw new Error(`excerpt has an invalid line range: ${request.path}:${request.line_start}-${request.line_end}`);
	}
	if (request.line_end - request.line_start + 1 > MAX_LINES_PER_EXCERPT) {
		throw new Error(`excerpt exceeds ${MAX_LINES_PER_EXCERPT} lines: ${request.path}`);
	}

	const snapshot = await snapshotSourceFile(repositoryRoot, request.path);
	const lines = snapshot.content.split("\n");
	if (request.line_end > lines.length) {
		throw new Error(`excerpt range exceeds file length: ${request.path}:${request.line_end}`);
	}
	const content = lines.slice(request.line_start - 1, request.line_end).join("\n");
	if (Buffer.byteLength(content, "utf8") > MAX_BYTES_PER_EXCERPT) {
		throw new Error(`excerpt exceeds ${MAX_BYTES_PER_EXCERPT} bytes: ${request.path}`);
	}

	return { ...request, ...snapshot, content };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function validateSourceEvidenceArtifact(repositoryRoot: string, artifact: Record<string, unknown>): Promise<string[]> {
	const violations: string[] = [];
	const isRepositoryScout = artifact.schema === "repository-scout/v1";
	const isArchitectureEvidence = artifact.schema === "architecture-evidence/v1";
	const requiredLiterals = Array.isArray(artifact.required_literals) && artifact.required_literals.every((literal) => typeof literal === "string")
		? artifact.required_literals
		: null;
	const questions = Array.isArray(artifact.questions) && artifact.questions.every((question) => typeof question === "string")
		? artifact.questions
		: null;
	const evidenceParagraphs = Array.isArray(artifact.evidence_paragraphs) ? artifact.evidence_paragraphs : null;
	if (!isRepositoryScout && !isArchitectureEvidence) violations.push("schema must be repository-scout/v1 or architecture-evidence/v1");
	if (isRepositoryScout && !requiredLiterals) violations.push("required_literals must be a string array");
	if (isArchitectureEvidence && !questions) violations.push("questions must be a string array");
	if (!evidenceParagraphs) violations.push("evidence_paragraphs must be an array");

	if (evidenceParagraphs && evidenceParagraphs.length === 0) {
		if (artifact.provenance !== null) violations.push("no-evidence artifact provenance must be null");
		const issue = artifact.material_issue;
		if (!isRecord(issue) || typeof issue.content !== "string" || !Array.isArray(issue.evidence) || !issue.evidence.every((item) => typeof item === "string") || (issue.uncertainty !== null && typeof issue.uncertainty !== "string")) {
			violations.push("no-evidence artifact material_issue is malformed");
		}
		return violations;
	}

	if (!evidenceParagraphs) return violations;
	if (artifact.material_issue !== null) violations.push("direct-evidence artifact material_issue must be null");
	const provenance = isRecord(artifact.provenance) ? artifact.provenance : null;
	const sources = provenance && Array.isArray(provenance.sources) ? provenance.sources : null;
	if (!provenance || (provenance.git_head !== null && typeof provenance.git_head !== "string") || !sources) {
		violations.push("direct-evidence artifact provenance is malformed");
		return violations;
	}

	if (provenance.git_head !== null && provenance.git_head !== await readGitHead(repositoryRoot)) {
		violations.push("provenance git_head does not match current repository HEAD");
	}

	const sourceHashes = new Map<string, string>();
	for (const source of sources) {
		if (!isRecord(source) || typeof source.path !== "string" || !/^[0-9a-f]{64}$/.test(String(source.sha256))) {
			violations.push("provenance source is malformed");
			continue;
		}
		if (sourceHashes.has(source.path)) {
			violations.push(`provenance source paths must be unique: ${source.path}`);
			continue;
		}
		sourceHashes.set(source.path, source.sha256);
	}
	const evidencePaths = new Set<string>();
	const contents: string[] = [];
	for (const paragraph of evidenceParagraphs) {
		if (!isRecord(paragraph) || typeof paragraph.source_label !== "string" || typeof paragraph.path !== "string" || !Number.isInteger(paragraph.line_start) || !Number.isInteger(paragraph.line_end) || typeof paragraph.content !== "string") {
			violations.push("evidence paragraph is malformed");
			continue;
		}
		evidencePaths.add(paragraph.path);
		try {
			const extracted = await extractSourceExcerpt(repositoryRoot, {
				source_label: paragraph.source_label,
				path: paragraph.path,
				line_start: paragraph.line_start,
				line_end: paragraph.line_end,
			});
			if (paragraph.content !== extracted.content) violations.push(`excerpt content does not match ${paragraph.path}`);
			if (sourceHashes.get(paragraph.path) !== extracted.sha256) violations.push(`source hash does not match ${paragraph.path}`);
			contents.push(paragraph.content);
		} catch (error) {
			violations.push(`excerpt cannot be validated: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	if (sourceHashes.size !== evidencePaths.size || [...evidencePaths].some((path) => !sourceHashes.has(path))) {
		violations.push("provenance source paths must exactly match evidence paragraph paths");
	}
	for (const literal of requiredLiterals ?? []) {
		if (!contents.some((content) => content.includes(literal))) violations.push(`required literal lacks evidence: ${literal}`);
	}
	return violations;
}

async function readGitHead(repositoryRoot: string): Promise<string | null> {
	const gitDirectory = resolve(repositoryRoot, ".git");
	try {
		if (!(await lstat(gitDirectory)).isDirectory()) return null;
		const head = (await readFile(resolve(gitDirectory, "HEAD"), "utf8")).trim();
		if (/^[0-9a-f]{40}$/i.test(head)) return head;
		const reference = head.match(/^ref: (refs\/[A-Za-z0-9._/-]+)$/)?.[1];
		if (!reference || reference.split("/").includes("..")) return null;
		const referencePath = resolve(gitDirectory, reference);
		requireDescendant(gitDirectory, referencePath, "git reference");
		return (await readFile(referencePath, "utf8")).trim().match(/^[0-9a-f]{40}$/i)?.[0] ?? null;
	} catch {
		return null;
	}
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "repository_search",
		label: "Repository Search",
		description: "Search a repository with bounded literal ripgrep matches.",
		promptSnippet: "Search a repository for bounded literal path-and-line candidates",
		promptGuidelines: [
			"Use repository_search before broad file reads when locating evidence in a repository.",
		],
		parameters: Type.Object({
			repository_root: Type.String({ description: "Absolute repository root to search." }),
			literals: Type.Array(Type.String({ minLength: 1 }), { minItems: 1, maxItems: 12 }),
			max_results: Type.Optional(Type.Integer({ minimum: 1, maximum: MAX_SEARCH_RESULTS })),
		}),
		async execute(_toolCallId, params) {
			if (!isAbsolute(params.repository_root)) {
				throw new Error("repository_root must be an absolute path");
			}
			const repositoryRoot = await realpath(params.repository_root);
			if (!(await lstat(repositoryRoot)).isDirectory()) {
				throw new Error(`repository_root is not a directory: ${params.repository_root}`);
			}
			const matches = await searchRepository(
				repositoryRoot,
				validateSearchLiterals(params.literals),
				params.max_results ?? 40,
			);
			return {
				content: [{ type: "text", text: JSON.stringify({ matches }) }],
				details: { matches },
			};
		},
	});

	pi.registerTool({
		name: "validate_source_evidence_artifact",
		label: "Validate Source Evidence Artifact",
		description: "Validate a scout artifact against current source files without mutation.",
		parameters: Type.Object({
			repository_root: Type.String({ description: "Absolute repository root for every artifact source." }),
			artifact: Type.Record(Type.String(), Type.Unknown()),
		}),
		async execute(_toolCallId, params) {
			if (!isAbsolute(params.repository_root)) throw new Error("repository_root must be an absolute path");
			const repositoryRoot = await realpath(params.repository_root);
			if (!(await lstat(repositoryRoot)).isDirectory()) {
				throw new Error(`repository_root is not a directory: ${params.repository_root}`);
			}
			const violations = await validateSourceEvidenceArtifact(repositoryRoot, params.artifact);
			const validation = { valid: violations.length === 0, violations };
			return {
				content: [{ type: "text", text: JSON.stringify(validation) }],
				details: { validation },
			};
		},
	});

	pi.registerTool({
		name: "source_evidence_artifact",
		label: "Source Evidence Artifact",
		description: "Build a JSON artifact with deterministic source excerpts from declared repository file ranges.",
		promptSnippet: "Build an evidence artifact from exact repository file ranges",
		promptGuidelines: [
			"Use source_evidence_artifact as the final action when a read-only evidence handoff requires exact source excerpts.",
		],
		parameters: Type.Object({
			repository_root: Type.String({ description: "Absolute repository root containing every requested excerpt." }),
			envelope: Type.Record(Type.String(), Type.Unknown(), {
				description: "Artifact fields other than evidence_paragraphs; the tool preserves these values unchanged.",
			}),
			excerpts: Type.Array(Type.Object({
				source_label: Type.String(),
				path: Type.String({ description: "Path relative to repository_root." }),
				line_start: Type.Integer({ minimum: 1 }),
				line_end: Type.Integer({ minimum: 1 }),
			}), { maxItems: MAX_EXCERPTS }),
		}),
		async execute(_toolCallId, params) {
			if (Object.hasOwn(params.envelope, "evidence_paragraphs") || Object.hasOwn(params.envelope, "provenance")) {
				throw new Error("envelope must not define evidence_paragraphs or provenance");
			}
			if (!isAbsolute(params.repository_root)) {
				throw new Error("repository_root must be an absolute path");
			}

			const repositoryRoot = await realpath(params.repository_root);
			if (!(await lstat(repositoryRoot)).isDirectory()) {
				throw new Error(`repository_root is not a directory: ${params.repository_root}`);
			}

			const extracted = await Promise.all(
				params.excerpts.map((request) => extractSourceExcerpt(repositoryRoot, request)),
			);
			const evidence_paragraphs = extracted.map(({ source_label, path, line_start, line_end, content }) => ({
				source_label,
				path,
				line_start,
				line_end,
				content,
			}));
			const sourceHashes = new Map<string, string>();
			for (const excerpt of extracted) sourceHashes.set(excerpt.path, excerpt.sha256);
			const provenance = {
				git_head: await readGitHead(repositoryRoot),
				sources: [...sourceHashes].map(([path, sha256]) => ({ path, sha256 })),
			};
			const artifact = { ...params.envelope, evidence_paragraphs, provenance };

			return {
				content: [{ type: "text", text: JSON.stringify(artifact) }],
				details: { artifact },
			};
		},
	});
}
