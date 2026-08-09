import type {
  AblationResult,
  AuditPolicy,
  AuditReport,
  CandidateRun,
  CategoryAudit,
  ContextCategory,
  ContextItem,
  ContextTrace,
  EvidenceStatus,
  ItemAudit,
} from "./types";

const CATEGORY_ORDER: ContextCategory[] = [
  "system",
  "history",
  "retrieval",
  "tool_schema",
  "tool_result",
  "memory",
  "scratchpad",
  "other",
];
const CATEGORY_SET = new Set<string>(CATEGORY_ORDER);
const NUMERIC_TOLERANCE = 1e-10;
const RUN_METRIC_KEYS = [
  "quality",
  "inputTokens",
  "outputTokens",
  "latencyMs",
  "costUsd",
  "attempts",
  "successes",
] as const;
const TRACE_KEYS = new Set([
  "schemaVersion",
  "traceId",
  "name",
  "description",
  "model",
  "framework",
  "capturedAt",
  "syntheticDemo",
  "experiment",
  "evaluator",
  "baseline",
  "contextItems",
  "candidates",
  "auditCostUsd",
]);
const EXPERIMENT_KEYS = new Set([
  "id",
  "dataset",
  "evaluatorVersion",
  "modelRevision",
  "temperature",
  "seed",
]);
const EVALUATOR_KEYS = new Set([
  "name",
  "epsilon",
  "confidence",
  "requiredSuccessRate",
  "higherIsBetter",
]);
const RUN_METRIC_KEY_SET = new Set<string>(RUN_METRIC_KEYS);
const ABLATION_KEYS = new Set([
  "quality",
  "latencyMs",
  "attempts",
  "successes",
  "qualityLossCi95",
]);
const CONTEXT_ITEM_KEYS = new Set([
  "id",
  "label",
  "category",
  "tokens",
  "source",
  "position",
  "required",
  "cached",
  "contentHash",
  "ablation",
]);
const CANDIDATE_KEYS = new Set([
  "id",
  "label",
  "dropItemIds",
  "qualityLossCi95",
  ...RUN_METRIC_KEYS,
]);
const RFC3339_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function round(value: number, places = 4) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export class TraceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TraceValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TraceValidationError(`${path} must be an object.`);
  return value;
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  path: string,
  allowedKeys: ReadonlySet<string>,
) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new TraceValidationError(`${path}[${JSON.stringify(key)}] is not allowed.`);
    }
  }
}

function requireString(value: unknown, path: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TraceValidationError(`${path} must be a non-empty string.`);
  }
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isRfc3339DateTime(value: string) {
  const match = RFC3339_DATE_TIME_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetSign = match[7];
  const offsetHour = Number(match[8] ?? 0);
  const offsetMinute = Number(match[9] ?? 0);
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) return false;
  if (hour > 23 || minute > 59 || second > 60) return false;
  if (offsetHour > 23 || offsetMinute > 59) return false;
  if (second < 60) return true;

  // RFC 3339 permits :60 only at the UTC minute where a June or December
  // leap second can occur. Offset timestamps must identify that same minute.
  const localMinute = new Date(0);
  localMinute.setUTCFullYear(year, month - 1, day);
  localMinute.setUTCHours(hour, minute, 0, 0);
  const offsetDirection = offsetSign === "-" ? -1 : 1;
  const offsetMs = offsetDirection * (offsetHour * 60 + offsetMinute) * 60_000;
  const utcMinute = new Date(localMinute.getTime() - offsetMs);
  const utcMonth = utcMinute.getUTCMonth() + 1;
  const utcDay = utcMinute.getUTCDate();

  return (
    utcMinute.getUTCHours() === 23 &&
    utcMinute.getUTCMinutes() === 59 &&
    ((utcMonth === 6 && utcDay === 30) || (utcMonth === 12 && utcDay === 31))
  );
}

function requireBoolean(value: unknown, path: string) {
  if (typeof value !== "boolean") throw new TraceValidationError(`${path} must be a boolean.`);
}

function requireFinite(value: unknown, path: string, min?: number, max?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TraceValidationError(`${path} must be a finite number.`);
  }
  if (min !== undefined && value < min) throw new TraceValidationError(`${path} must be >= ${min}.`);
  if (max !== undefined && value > max) throw new TraceValidationError(`${path} must be <= ${max}.`);
}

function requireInteger(value: unknown, path: string, min: number) {
  requireFinite(value, path, min);
  if (!Number.isInteger(value)) throw new TraceValidationError(`${path} must be an integer.`);
}

function validateAttempts(value: Record<string, unknown>, path: string) {
  requireInteger(value.attempts, `${path}.attempts`, 1);
  requireInteger(value.successes, `${path}.successes`, 0);
  if ((value.successes as number) > (value.attempts as number)) {
    throw new TraceValidationError(`${path}.successes cannot exceed attempts.`);
  }
}

function validateQualityLossCi(
  value: unknown,
  expectedLoss: number,
  path: string,
) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length !== 2) {
    throw new TraceValidationError(`${path} must contain exactly two bounds.`);
  }
  requireFinite(value[0], `${path}[0]`, -1, 1);
  requireFinite(value[1], `${path}[1]`, -1, 1);
  if (value[0] > value[1]) throw new TraceValidationError(`${path} bounds are reversed.`);
  if (expectedLoss < value[0] - NUMERIC_TOLERANCE || expectedLoss > value[1] + NUMERIC_TOLERANCE) {
    throw new TraceValidationError(`${path} must contain the observed paired quality loss.`);
  }
}

function validateRunMetrics(value: Record<string, unknown>, path: string) {
  requireFinite(value.quality, `${path}.quality`, 0, 1);
  requireInteger(value.inputTokens, `${path}.inputTokens`, 1);
  requireInteger(value.outputTokens, `${path}.outputTokens`, 0);
  requireFinite(value.latencyMs, `${path}.latencyMs`, 0);
  requireFinite(value.costUsd, `${path}.costUsd`, 0);
  validateAttempts(value, path);
}

function validateAblation(
  value: unknown,
  baselineQuality: number,
  path: string,
): asserts value is AblationResult {
  const ablation = requireRecord(value, path);
  rejectUnknownKeys(ablation, path, ABLATION_KEYS);
  requireFinite(ablation.quality, `${path}.quality`, 0, 1);
  requireFinite(ablation.latencyMs, `${path}.latencyMs`, 0);
  validateAttempts(ablation, path);
  validateQualityLossCi(
    ablation.qualityLossCi95,
    baselineQuality - (ablation.quality as number),
    `${path}.qualityLossCi95`,
  );
}

/** Runtime boundary for JSON/CLI input. */
export function validateTrace(input: unknown): asserts input is ContextTrace {
  const trace = requireRecord(input, "trace");
  rejectUnknownKeys(trace, "trace", TRACE_KEYS);
  if (trace.schemaVersion !== "0.1") {
    throw new TraceValidationError(`Unsupported schema version: ${String(trace.schemaVersion)}`);
  }
  for (const key of ["traceId", "name", "description", "model", "framework", "capturedAt"] as const) {
    requireString(trace[key], `trace.${key}`);
  }
  if (!isRfc3339DateTime(trace.capturedAt as string)) {
    throw new TraceValidationError("trace.capturedAt must be an RFC 3339 date-time timestamp.");
  }
  requireBoolean(trace.syntheticDemo, "trace.syntheticDemo");

  const experiment = requireRecord(trace.experiment, "trace.experiment");
  rejectUnknownKeys(experiment, "trace.experiment", EXPERIMENT_KEYS);
  for (const key of ["id", "dataset", "evaluatorVersion", "modelRevision"] as const) {
    requireString(experiment[key], `trace.experiment.${key}`);
  }
  requireFinite(experiment.temperature, "trace.experiment.temperature", 0);
  requireInteger(experiment.seed, "trace.experiment.seed", 0);

  const evaluator = requireRecord(trace.evaluator, "trace.evaluator");
  rejectUnknownKeys(evaluator, "trace.evaluator", EVALUATOR_KEYS);
  requireString(evaluator.name, "trace.evaluator.name");
  requireFinite(evaluator.epsilon, "trace.evaluator.epsilon", 0, 1);
  if (evaluator.confidence !== 0.95) {
    throw new TraceValidationError("trace.evaluator.confidence must be 0.95 for schema 0.1.");
  }
  requireFinite(evaluator.requiredSuccessRate, "trace.evaluator.requiredSuccessRate", 0, 1);
  if (evaluator.higherIsBetter !== true) {
    throw new TraceValidationError("trace.evaluator.higherIsBetter must be true for schema 0.1.");
  }

  const baseline = requireRecord(trace.baseline, "trace.baseline");
  rejectUnknownKeys(baseline, "trace.baseline", RUN_METRIC_KEY_SET);
  validateRunMetrics(baseline, "trace.baseline");
  const baselineSuccessRate = (baseline.successes as number) / (baseline.attempts as number);
  if (baselineSuccessRate + NUMERIC_TOLERANCE < (evaluator.requiredSuccessRate as number)) {
    throw new TraceValidationError("Baseline does not meet evaluator.requiredSuccessRate.");
  }

  if (!Array.isArray(trace.contextItems) || trace.contextItems.length === 0) {
    throw new TraceValidationError("trace.contextItems must be a non-empty array.");
  }
  const itemIds = new Set<string>();
  const positions = new Set<number>();
  const itemTokens = new Map<string, number>();
  let attributedTokens = 0;
  for (const [index, rawItem] of trace.contextItems.entries()) {
    const path = `trace.contextItems[${index}]`;
    const item = requireRecord(rawItem, path);
    rejectUnknownKeys(item, path, CONTEXT_ITEM_KEYS);
    requireString(item.id, `${path}.id`);
    requireString(item.label, `${path}.label`);
    requireString(item.source, `${path}.source`);
    if (itemIds.has(item.id as string)) {
      throw new TraceValidationError(`Context item IDs must be unique: ${item.id as string}`);
    }
    itemIds.add(item.id as string);
    if (!CATEGORY_SET.has(String(item.category))) {
      throw new TraceValidationError(`${path}.category is not supported.`);
    }
    requireInteger(item.tokens, `${path}.tokens`, 1);
    requireInteger(item.position, `${path}.position`, 0);
    if (positions.has(item.position as number)) {
      throw new TraceValidationError(`Context item positions must be unique: ${item.position as number}`);
    }
    positions.add(item.position as number);
    if (item.required !== undefined) requireBoolean(item.required, `${path}.required`);
    if (item.cached !== undefined) requireBoolean(item.cached, `${path}.cached`);
    if (item.contentHash !== undefined) requireString(item.contentHash, `${path}.contentHash`);
    if (item.ablation !== undefined) {
      validateAblation(item.ablation, baseline.quality as number, `${path}.ablation`);
    }
    attributedTokens += item.tokens as number;
    itemTokens.set(item.id as string, item.tokens as number);
  }
  if (attributedTokens > (baseline.inputTokens as number)) {
    throw new TraceValidationError(
      `Attributed context (${attributedTokens}) exceeds baseline input (${baseline.inputTokens as number}).`,
    );
  }

  if (!Array.isArray(trace.candidates)) {
    throw new TraceValidationError("trace.candidates must be an array.");
  }
  const candidateIds = new Set<string>();
  for (const [index, rawCandidate] of trace.candidates.entries()) {
    const path = `trace.candidates[${index}]`;
    const candidate = requireRecord(rawCandidate, path);
    rejectUnknownKeys(candidate, path, CANDIDATE_KEYS);
    requireString(candidate.id, `${path}.id`);
    requireString(candidate.label, `${path}.label`);
    if (candidateIds.has(candidate.id as string)) {
      throw new TraceValidationError(`Candidate IDs must be unique: ${candidate.id as string}`);
    }
    candidateIds.add(candidate.id as string);
    validateRunMetrics(candidate, path);
    if (!Array.isArray(candidate.dropItemIds) || candidate.dropItemIds.length === 0) {
      throw new TraceValidationError(`${path}.dropItemIds must be a non-empty array.`);
    }
    const drops = new Set<string>();
    let droppedTokens = 0;
    for (const [dropIndex, id] of candidate.dropItemIds.entries()) {
      requireString(id, `${path}.dropItemIds[${dropIndex}]`);
      if (drops.has(id as string)) throw new TraceValidationError(`${path}.dropItemIds must be unique.`);
      drops.add(id as string);
      const tokens = itemTokens.get(id as string);
      if (tokens === undefined) {
        throw new TraceValidationError(`Candidate ${candidate.id as string} references unknown item ${id as string}.`);
      }
      droppedTokens += tokens;
    }
    const expectedTokens = (baseline.inputTokens as number) - droppedTokens;
    if (candidate.inputTokens !== expectedTokens) {
      throw new TraceValidationError(
        `${path}.inputTokens must equal baseline input minus dropped item tokens (${expectedTokens}).`,
      );
    }
    validateQualityLossCi(
      candidate.qualityLossCi95,
      (baseline.quality as number) - (candidate.quality as number),
      `${path}.qualityLossCi95`,
    );
  }
  requireFinite(trace.auditCostUsd, "trace.auditCostUsd", 0);
}

function successRate(value: { attempts: number; successes: number }) {
  return value.successes / value.attempts;
}

function evidenceStatus(
  result: { attempts: number; successes: number; qualityLossCi95?: [number, number] },
  epsilon: number,
  requiredSuccessRate: number,
): EvidenceStatus {
  if (successRate(result) + NUMERIC_TOLERANCE < requiredSuccessRate) return "failed";
  if (!result.qualityLossCi95) return "insufficient-evidence";
  return result.qualityLossCi95[1] <= epsilon + NUMERIC_TOLERANCE ? "non-inferior" : "inferior";
}

function auditItem(
  item: ContextItem,
  baselineQuality: number,
  epsilon: number,
  requiredSuccessRate: number,
): ItemAudit {
  if (!item.ablation) {
    return {
      ...item,
      qualityLoss: null,
      qualityLossCi95: null,
      leaveOneOutImpactPer1kTokens: null,
      evidenceStatus: "insufficient-evidence",
      recommendation: item.required ? "keep" : "measure",
      rationale: item.required
        ? "Protected by the trace contract."
        : "No paired ablation result is available yet.",
    };
  }

  const qualityLoss = baselineQuality - item.ablation.quality;
  const status = evidenceStatus(item.ablation, epsilon, requiredSuccessRate);
  const impactPer1k = qualityLoss / (item.tokens / 1000);
  const common = {
    ...item,
    qualityLoss: round(qualityLoss),
    qualityLossCi95: item.ablation.qualityLossCi95 ?? null,
    leaveOneOutImpactPer1kTokens: round(impactPer1k),
    evidenceStatus: status,
  };

  if (item.required) {
    return {
      ...common,
      recommendation: "keep",
      rationale: "Required item; ContextRation will not remove it automatically.",
    };
  }
  if (status === "non-inferior") {
    return {
      ...common,
      recommendation: "experiment-candidate",
      rationale: `Its paired 95% quality-loss bound stayed within ε=${epsilon.toFixed(3)}; test combinations separately.`,
    };
  }
  if (status === "insufficient-evidence") {
    return {
      ...common,
      recommendation: "measure",
      rationale: "A paired quality-loss confidence interval is required before promotion.",
    };
  }
  return {
    ...common,
    recommendation: "keep",
    rationale:
      status === "failed"
        ? `Observed success rate fell below ${(requiredSuccessRate * 100).toFixed(0)}%.`
        : `The paired 95% quality-loss bound exceeded ε=${epsilon.toFixed(3)}.`,
  };
}

function candidateIsValidated(
  candidate: CandidateRun,
  trace: ContextTrace,
  epsilon: number,
  requiredIds: Set<string>,
) {
  return (
    evidenceStatus(candidate, epsilon, trace.evaluator.requiredSuccessRate) === "non-inferior" &&
    !candidate.dropItemIds.some((id) => requiredIds.has(id))
  );
}

function chooseTokenMinimalValidatedCandidate(trace: ContextTrace, epsilon: number) {
  const requiredIds = new Set(trace.contextItems.filter((item) => item.required).map((item) => item.id));
  return (
    trace.candidates
      .filter((candidate) => candidateIsValidated(candidate, trace, epsilon, requiredIds))
      .sort((left, right) => {
        if (left.inputTokens !== right.inputTokens) return left.inputTokens - right.inputTokens;
        if (left.quality !== right.quality) return right.quality - left.quality;
        return left.latencyMs - right.latencyMs;
      })[0] ?? null
  );
}

function categoryBreakdown(items: ItemAudit[], totalTokens: number): CategoryAudit[] {
  return CATEGORY_ORDER.map((category) => {
    const group = items.filter((item) => item.category === category);
    const tokens = group.reduce((total, item) => total + item.tokens, 0);
    return {
      category,
      tokens,
      share: round(tokens / totalTokens),
      itemCount: group.length,
      individualOpportunityTokens: group
        .filter((item) => item.recommendation === "experiment-candidate")
        .reduce((total, item) => total + item.tokens, 0),
    };
  }).filter((group) => group.itemCount > 0);
}

function buildPolicy(
  trace: ContextTrace,
  epsilon: number,
  validatedCandidate: CandidateRun | null,
): AuditPolicy {
  const dropIds = new Set(validatedCandidate?.dropItemIds ?? []);
  return {
    schemaVersion: "0.1",
    traceId: trace.traceId,
    epsilon,
    confidence: trace.evaluator.confidence,
    status: validatedCandidate ? "validated" : "inconclusive",
    validatedCandidateId: validatedCandidate?.id ?? null,
    scope: {
      experimentId: trace.experiment.id,
      dataset: trace.experiment.dataset,
      evaluatorVersion: trace.experiment.evaluatorVersion,
      modelRevision: trace.experiment.modelRevision,
    },
    actions: trace.contextItems.map((item) => ({
      itemId: item.id,
      action: dropIds.has(item.id) ? "drop" : "keep",
      reason: dropIds.has(item.id)
        ? `Validated under this evaluation scope by combined candidate ${validatedCandidate?.id}.`
        : item.required
          ? "Required by trace contract."
          : "No validated combined candidate supports its removal.",
    })),
  };
}

export function auditTrace(input: unknown, epsilonOverride?: number): AuditReport {
  validateTrace(input);
  const trace = input;
  const epsilon = epsilonOverride ?? trace.evaluator.epsilon;
  requireFinite(epsilon, "epsilon", 0, 1);

  const contextTokens = trace.contextItems.reduce((total, item) => total + item.tokens, 0);
  const items = trace.contextItems
    .map((item) =>
      auditItem(item, trace.baseline.quality, epsilon, trace.evaluator.requiredSuccessRate),
    )
    .sort((left, right) => {
      const leftImpact = left.leaveOneOutImpactPer1kTokens ?? Number.POSITIVE_INFINITY;
      const rightImpact = right.leaveOneOutImpactPer1kTokens ?? Number.POSITIVE_INFINITY;
      return leftImpact - rightImpact;
    });
  const individualOpportunityTokens = items
    .filter((item) => item.recommendation === "experiment-candidate")
    .reduce((total, item) => total + item.tokens, 0);
  const validatedCandidate = chooseTokenMinimalValidatedCandidate(trace, epsilon);
  const projectedInputTokens = validatedCandidate?.inputTokens ?? trace.baseline.inputTokens;
  const projectedCostUsd = validatedCandidate?.costUsd ?? trace.baseline.costUsd;
  const projectedCostReductionUsd = trace.baseline.costUsd - projectedCostUsd;
  const paybackRuns = projectedCostReductionUsd > 0
    ? Math.ceil(trace.auditCostUsd / projectedCostReductionUsd)
    : null;
  const attributionCoverage = clamp01(contextTokens / trace.baseline.inputTokens);
  const warnings: string[] = [];

  if (attributionCoverage < 0.95) {
    warnings.push("Context attribution coverage is below the recommended 95% threshold.");
  }
  if (!validatedCandidate) {
    warnings.push("No combined candidate has sufficient evidence within the configured margin.");
  }
  if (trace.candidates.some((candidate) => !candidate.qualityLossCi95)) {
    warnings.push("Candidates without paired confidence intervals remain inconclusive.");
  }
  if (trace.candidates.some((candidate) => successRate(candidate) < trace.evaluator.requiredSuccessRate)) {
    warnings.push("Failed counterfactual attempts remain in the experiment denominator.");
  }
  if (projectedCostReductionUsd < 0) {
    warnings.push("The token-minimal validated candidate has a higher observed cost than baseline.");
  }
  if (trace.syntheticDemo) {
    warnings.push("This report uses synthetic demonstration data, not a production benchmark.");
  }

  return {
    traceId: trace.traceId,
    traceName: trace.name,
    syntheticDemo: trace.syntheticDemo,
    epsilon,
    confidence: trace.evaluator.confidence,
    evidenceStatus: validatedCandidate ? "validated" : "inconclusive",
    contextTokens,
    attributedTokens: contextTokens,
    attributionCoverage: round(attributionCoverage),
    individualOpportunityTokens,
    individualOpportunityRatio: round(individualOpportunityTokens / contextTokens),
    validatedTokenReduction: round(1 - projectedInputTokens / trace.baseline.inputTokens),
    projectedInputTokens,
    qualityLoss: round(trace.baseline.quality - (validatedCandidate?.quality ?? trace.baseline.quality)),
    projectedCostUsd: round(projectedCostUsd, 6),
    projectedCostReductionUsd: round(projectedCostReductionUsd, 6),
    paybackRuns,
    validatedCandidate,
    items,
    categories: categoryBreakdown(items, contextTokens),
    policy: buildPolicy(trace, epsilon, validatedCandidate),
    warnings,
  };
}

export function toOtelAttributes(report: AuditReport): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {
    "context.ration.schema.version": "0.1",
    "context.ration.trace.id": report.traceId,
    "context.ration.evidence.status": report.evidenceStatus,
    "context.ration.attribution.coverage": report.attributionCoverage,
    "context.ration.individual_opportunity.ratio": report.individualOpportunityRatio,
    "context.ration.validated_token_reduction": report.validatedTokenReduction,
    "context.ration.projected_input_tokens": report.projectedInputTokens,
    "context.ration.quality.loss": report.qualityLoss,
    "context.ration.non_inferiority.epsilon": report.epsilon,
    "context.ration.non_inferiority.confidence": report.confidence,
    "context.ration.candidate.validated": Boolean(report.validatedCandidate),
    "context.ration.candidate.id": report.validatedCandidate?.id ?? "none",
  };
  for (const [key, value] of Object.entries(attributes)) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new TraceValidationError(`OTel attribute ${key} is not finite.`);
    }
  }
  return attributes;
}
