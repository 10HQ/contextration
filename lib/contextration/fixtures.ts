import type { AblationResult, ContextTrace } from "./types";

function demoAblation(
  quality: number,
  latencyMs: number,
  qualityLossCi95: [number, number],
  attempts = 5,
  successes = attempts,
): AblationResult {
  return { quality, latencyMs, qualityLossCi95, attempts, successes };
}

export const SUPPORT_TRACE: ContextTrace = {
  schemaVersion: "0.1",
  traceId: "trace_support_018",
  name: "Returns support agent",
  description: "A customer-support agent resolves a damaged-order return using policy retrieval and one order lookup.",
  model: "frontier-medium",
  framework: "OpenTelemetry GenAI export",
  capturedAt: "2026-08-08T10:30:00.000Z",
  syntheticDemo: true,
  experiment: {
    id: "exp_support_demo_v1",
    dataset: "fixture://support-cases@1",
    evaluatorVersion: "goal-success-v2@demo-1",
    modelRevision: "frontier-medium@demo-2026-08",
    temperature: 0,
    seed: 42,
  },
  evaluator: {
    name: "goal-success-v2",
    epsilon: 0.01,
    confidence: 0.95,
    requiredSuccessRate: 1,
    higherIsBetter: true,
  },
  baseline: {
    quality: 0.91,
    inputTokens: 14580,
    outputTokens: 482,
    latencyMs: 4210,
    costUsd: 0.0438,
    attempts: 7,
    successes: 7,
  },
  contextItems: [
    { id: "system-core", label: "Core support policy", category: "system", tokens: 820, source: "prompt://support/core@12", position: 0, required: true, ablation: demoAblation(0.42, 3780, [0.47, 0.51]) },
    { id: "policy-guardrails", label: "Refund guardrails", category: "system", tokens: 1240, source: "prompt://support/refunds@8", position: 1, required: true, ablation: demoAblation(0.55, 3820, [0.34, 0.38]) },
    { id: "conversation", label: "Conversation history", category: "history", tokens: 2810, source: "trace://messages/0-14", position: 2, ablation: demoAblation(0.888, 3310, [0.015, 0.029]) },
    { id: "pricing-page", label: "Pricing page retrieval", category: "retrieval", tokens: 1850, source: "https://docs.example/pricing", position: 3, ablation: demoAblation(0.902, 3550, [0.003, 0.012]) },
    { id: "returns-page", label: "Returns policy retrieval", category: "retrieval", tokens: 2140, source: "https://docs.example/returns", position: 4, ablation: demoAblation(0.74, 3490, [0.155, 0.185]) },
    { id: "mcp-schemas", label: "14 MCP tool definitions", category: "tool_schema", tokens: 3050, source: "mcp://support-tools", position: 5, ablation: demoAblation(0.913, 3030, [-0.007, 0.002]) },
    { id: "order-result", label: "Order lookup result", category: "tool_result", tokens: 970, source: "tool://orders/get", position: 6, required: true, ablation: demoAblation(0.61, 3090, [0.28, 0.32]) },
    { id: "customer-memory", label: "Customer preference memory", category: "memory", tokens: 1080, source: "memory://customer/hashed", position: 7, ablation: demoAblation(0.908, 3150, [-0.003, 0.007]) },
  ],
  candidates: [
    { id: "drop-unused-tools", label: "Remove unused tool schemas", dropItemIds: ["mcp-schemas"], quality: 0.913, inputTokens: 11530, outputTokens: 476, latencyMs: 3180, costUsd: 0.0347, attempts: 7, successes: 7, qualityLossCi95: [-0.007, 0.002] },
    { id: "lean-support", label: "Remove tools + preference memory", dropItemIds: ["mcp-schemas", "customer-memory"], quality: 0.906, inputTokens: 10450, outputTokens: 481, latencyMs: 2940, costUsd: 0.0314, attempts: 7, successes: 7, qualityLossCi95: [-0.002, 0.009] },
    { id: "over-trimmed", label: "Aggressive retrieval trim", dropItemIds: ["mcp-schemas", "customer-memory", "pricing-page", "returns-page"], quality: 0.824, inputTokens: 6460, outputTokens: 430, latencyMs: 2310, costUsd: 0.0198, attempts: 7, successes: 7, qualityLossCi95: [0.075, 0.098] },
  ],
  auditCostUsd: 0.91,
};

export const RESEARCH_TRACE: ContextTrace = {
  schemaVersion: "0.1",
  traceId: "trace_research_044",
  name: "Competitive research agent",
  description: "A research agent synthesizes recent primary sources and produces a citation-backed market brief.",
  model: "frontier-large",
  framework: "OpenTelemetry GenAI export",
  capturedAt: "2026-08-07T15:10:00.000Z",
  syntheticDemo: true,
  experiment: {
    id: "exp_research_demo_v1",
    dataset: "fixture://research-briefs@1",
    evaluatorVersion: "citation-groundedness@demo-1",
    modelRevision: "frontier-large@demo-2026-08",
    temperature: 0,
    seed: 73,
  },
  evaluator: {
    name: "citation-groundedness",
    epsilon: 0.01,
    confidence: 0.95,
    requiredSuccessRate: 1,
    higherIsBetter: true,
  },
  baseline: { quality: 0.88, inputTokens: 28200, outputTokens: 1260, latencyMs: 11840, costUsd: 0.132, attempts: 7, successes: 7 },
  contextItems: [
    { id: "research-system", label: "Research contract", category: "system", tokens: 900, source: "prompt://research/core@5", position: 0, required: true, ablation: demoAblation(0.31, 9100, [0.54, 0.60]) },
    { id: "research-plan", label: "Query and source plan", category: "scratchpad", tokens: 1300, source: "trace://plan", position: 1, ablation: demoAblation(0.84, 10020, [0.03, 0.05]) },
    { id: "research-history", label: "Prior research turns", category: "history", tokens: 4200, source: "trace://messages/0-22", position: 2, ablation: demoAblation(0.876, 9210, [-0.001, 0.009]) },
    { id: "search-snippets", label: "Search result snippets", category: "retrieval", tokens: 4800, source: "search://batch/8", position: 3, ablation: demoAblation(0.883, 9620, [-0.007, 0.002]) },
    { id: "source-documents", label: "Primary source documents", category: "retrieval", tokens: 9900, source: "artifact://sources/primary", position: 4, required: true, ablation: demoAblation(0.48, 7210, [0.37, 0.43]) },
    { id: "research-tools", label: "Browser and search schemas", category: "tool_schema", tokens: 3600, source: "mcp://research-tools", position: 5, ablation: demoAblation(0.884, 9310, [-0.009, 0.001]) },
    { id: "scratch-notes", label: "Unresolved scratch notes", category: "scratchpad", tokens: 2500, source: "trace://scratch", position: 6, ablation: demoAblation(0.872, 9010, [0.003, 0.014]) },
    { id: "research-memory", label: "Project vocabulary memory", category: "memory", tokens: 500, source: "memory://project/glossary", position: 7, ablation: demoAblation(0.871, 9160, [0.004, 0.015]) },
  ],
  candidates: [
    { id: "drop-research-tools", label: "Drop inactive tool schemas", dropItemIds: ["research-tools"], quality: 0.884, inputTokens: 24600, outputTokens: 1240, latencyMs: 10100, costUsd: 0.115, attempts: 7, successes: 7, qualityLossCi95: [-0.009, 0.001] },
    { id: "research-lean", label: "Drop tools + prior turns", dropItemIds: ["research-tools", "research-history"], quality: 0.876, inputTokens: 20400, outputTokens: 1254, latencyMs: 8710, costUsd: 0.095, attempts: 7, successes: 7, qualityLossCi95: [-0.001, 0.009] },
    { id: "research-overtrim", label: "Drop tools + turns + planning", dropItemIds: ["research-tools", "research-history", "research-plan", "scratch-notes"], quality: 0.852, inputTokens: 16600, outputTokens: 1120, latencyMs: 7300, costUsd: 0.077, attempts: 7, successes: 7, qualityLossCi95: [0.02, 0.036] },
  ],
  auditCostUsd: 2.8,
};

export const CODING_TRACE: ContextTrace = {
  schemaVersion: "0.1",
  traceId: "trace_code_107",
  name: "Repository repair agent",
  description: "A coding agent diagnoses a regression, edits two files, and validates the targeted test suite.",
  model: "frontier-coding",
  framework: "OpenTelemetry GenAI export",
  capturedAt: "2026-08-09T08:45:00.000Z",
  syntheticDemo: true,
  experiment: {
    id: "exp_code_demo_v1",
    dataset: "fixture://repository-repairs@1",
    evaluatorVersion: "tests-plus-review@demo-1",
    modelRevision: "frontier-coding@demo-2026-08",
    temperature: 0,
    seed: 107,
  },
  evaluator: {
    name: "tests-plus-review",
    epsilon: 0.01,
    confidence: 0.95,
    requiredSuccessRate: 1,
    higherIsBetter: true,
  },
  baseline: { quality: 0.932, inputTokens: 22600, outputTokens: 1820, latencyMs: 19400, costUsd: 0.168, attempts: 7, successes: 7 },
  contextItems: [
    { id: "coding-system", label: "Repository instructions", category: "system", tokens: 700, source: "repo://AGENTS.md", position: 0, required: true, ablation: demoAblation(0.44, 16200, [0.46, 0.52]) },
    { id: "repo-map", label: "Repository map", category: "retrieval", tokens: 3100, source: "repo://tree", position: 1, ablation: demoAblation(0.901, 17100, [0.021, 0.041]) },
    { id: "issue", label: "Issue and acceptance criteria", category: "history", tokens: 900, source: "trace://request", position: 2, required: true, ablation: demoAblation(0.22, 9200, [0.68, 0.75], 5, 2) },
    { id: "coding-history", label: "Exploration history", category: "history", tokens: 2600, source: "trace://messages/0-18", position: 3, ablation: demoAblation(0.925, 16500, [0.002, 0.012]) },
    { id: "coding-tools", label: "Tool definitions", category: "tool_schema", tokens: 4100, source: "mcp://coding-tools", position: 4, required: true, ablation: demoAblation(0.54, 9800, [0.36, 0.42], 5, 3) },
    { id: "related-files", label: "Related source files", category: "retrieval", tokens: 5200, source: "repo://src/related", position: 5, required: true, ablation: demoAblation(0.63, 14200, [0.28, 0.33]) },
    { id: "unrelated-files", label: "Broad neighboring files", category: "retrieval", tokens: 4800, source: "repo://src/neighbors", position: 6, ablation: demoAblation(0.934, 15600, [-0.007, 0.003]) },
    { id: "test-output", label: "Targeted test output", category: "tool_result", tokens: 850, source: "tool://test/targeted", position: 7, required: true, ablation: demoAblation(0.78, 15100, [0.13, 0.17]) },
  ],
  candidates: [
    { id: "drop-neighbors", label: "Drop unrelated neighboring files", dropItemIds: ["unrelated-files"], quality: 0.934, inputTokens: 17800, outputTokens: 1790, latencyMs: 16800, costUsd: 0.132, attempts: 7, successes: 7, qualityLossCi95: [-0.006, 0.002] },
    { id: "focused-code", label: "Drop neighbors + exploration history", dropItemIds: ["unrelated-files", "coding-history"], quality: 0.925, inputTokens: 15200, outputTokens: 1812, latencyMs: 15100, costUsd: 0.113, attempts: 7, successes: 7, qualityLossCi95: [0.002, 0.009] },
    { id: "code-overtrim", label: "Drop map + neighbors + history", dropItemIds: ["repo-map", "unrelated-files", "coding-history"], quality: 0.889, inputTokens: 12100, outputTokens: 1600, latencyMs: 12900, costUsd: 0.09, attempts: 7, successes: 7, qualityLossCi95: [0.035, 0.051] },
  ],
  auditCostUsd: 3.2,
};

export const DEMO_TRACES = [SUPPORT_TRACE, RESEARCH_TRACE, CODING_TRACE] as const;
