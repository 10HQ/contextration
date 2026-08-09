export type ContextCategory =
  | "system"
  | "history"
  | "retrieval"
  | "tool_schema"
  | "tool_result"
  | "memory"
  | "scratchpad"
  | "other";

export type EvidenceStatus =
  | "non-inferior"
  | "inferior"
  | "failed"
  | "insufficient-evidence";

export interface ExperimentScope {
  id: string;
  dataset: string;
  evaluatorVersion: string;
  modelRevision: string;
  temperature: number;
  seed: number;
}

export interface TrialAggregate {
  quality: number;
  latencyMs: number;
  attempts: number;
  successes: number;
  /** Paired 95% CI for baseline quality minus candidate quality. */
  qualityLossCi95?: [number, number];
}

export type AblationResult = TrialAggregate;

export interface ContextItem {
  id: string;
  label: string;
  category: ContextCategory;
  tokens: number;
  source: string;
  position: number;
  required?: boolean;
  cached?: boolean;
  contentHash?: string;
  ablation?: AblationResult;
}

export interface RunMetrics {
  quality: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd: number;
  attempts: number;
  successes: number;
}

export interface CandidateRun extends RunMetrics {
  id: string;
  label: string;
  dropItemIds: string[];
  /** Paired 95% CI for baseline quality minus candidate quality. */
  qualityLossCi95?: [number, number];
}

export interface ContextTrace {
  schemaVersion: "0.1";
  traceId: string;
  name: string;
  description: string;
  model: string;
  framework: string;
  capturedAt: string;
  syntheticDemo: boolean;
  experiment: ExperimentScope;
  evaluator: {
    name: string;
    epsilon: number;
    confidence: 0.95;
    requiredSuccessRate: number;
    higherIsBetter: true;
  };
  baseline: RunMetrics;
  contextItems: ContextItem[];
  candidates: CandidateRun[];
  auditCostUsd: number;
}

export type Recommendation = "keep" | "experiment-candidate" | "measure";

export interface ItemAudit extends ContextItem {
  qualityLoss: number | null;
  qualityLossCi95: [number, number] | null;
  leaveOneOutImpactPer1kTokens: number | null;
  evidenceStatus: EvidenceStatus;
  recommendation: Recommendation;
  rationale: string;
}

export interface CategoryAudit {
  category: ContextCategory;
  tokens: number;
  share: number;
  itemCount: number;
  individualOpportunityTokens: number;
}

export interface AuditPolicy {
  schemaVersion: "0.1";
  traceId: string;
  epsilon: number;
  confidence: 0.95;
  status: "validated" | "inconclusive";
  validatedCandidateId: string | null;
  scope: {
    experimentId: string;
    dataset: string;
    evaluatorVersion: string;
    modelRevision: string;
  };
  actions: Array<{
    itemId: string;
    action: "keep" | "drop";
    reason: string;
  }>;
}

export interface AuditReport {
  traceId: string;
  traceName: string;
  syntheticDemo: boolean;
  epsilon: number;
  confidence: 0.95;
  evidenceStatus: "validated" | "inconclusive";
  contextTokens: number;
  attributedTokens: number;
  attributionCoverage: number;
  individualOpportunityTokens: number;
  individualOpportunityRatio: number;
  validatedTokenReduction: number;
  projectedInputTokens: number;
  qualityLoss: number;
  projectedCostUsd: number;
  projectedCostReductionUsd: number;
  paybackRuns: number | null;
  validatedCandidate: CandidateRun | null;
  items: ItemAudit[];
  categories: CategoryAudit[];
  policy: AuditPolicy;
  warnings: string[];
}
