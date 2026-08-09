import assert from "node:assert/strict";
import test from "node:test";
import {
  auditTrace,
  SUPPORT_TRACE,
  toOtelAttributes,
  TraceValidationError,
  type ContextTrace,
} from "../lib/contextration/index";

function cloneTrace(): ContextTrace {
  return structuredClone(SUPPORT_TRACE);
}

test("selects the token-minimal combined candidate with sufficient evidence", () => {
  const report = auditTrace(SUPPORT_TRACE);
  assert.equal(report.validatedCandidate?.id, "lean-support");
  assert.equal(report.evidenceStatus, "validated");
  assert.equal(report.projectedInputTokens, 10450);
  assert.equal(report.validatedTokenReduction, 0.2833);
  assert.equal(report.qualityLoss, 0.004);
  assert.equal(report.policy.status, "validated");
});

test("does not combine individual opportunities without a combined experiment", () => {
  const trace = cloneTrace();
  trace.candidates = [];
  const report = auditTrace(trace);
  assert.equal(report.validatedCandidate, null);
  assert.equal(report.validatedTokenReduction, 0);
  assert.ok(report.individualOpportunityTokens > 0);
  assert.ok(report.policy.actions.every((action) => action.action === "keep"));
  assert.match(report.warnings.join(" "), /No combined candidate/);
});

test("a candidate without a paired confidence interval remains inconclusive", () => {
  const trace = cloneTrace();
  trace.candidates = [{ ...trace.candidates[0], qualityLossCi95: undefined }];
  const report = auditTrace(trace);
  assert.equal(report.validatedCandidate, null);
  assert.equal(report.evidenceStatus, "inconclusive");
  assert.match(report.warnings.join(" "), /confidence intervals/);
});

test("uses the upper paired quality-loss bound, not the point estimate", () => {
  const trace = cloneTrace();
  trace.candidates = [{
    ...trace.candidates[1],
    quality: 0.906,
    qualityLossCi95: [-0.002, 0.011],
  }];
  assert.equal(auditTrace(trace).validatedCandidate, null);
});

test("accepts an upper bound exactly on epsilon despite floating point noise", () => {
  const trace = cloneTrace();
  trace.candidates = [{
    ...trace.candidates[0],
    quality: 0.9,
    qualityLossCi95: [0.005, 0.01],
  }];
  assert.equal(auditTrace(trace).validatedCandidate?.id, "drop-unused-tools");
});

test("excludes a statistically passing candidate that drops a required item", () => {
  const trace = cloneTrace();
  trace.candidates = [{
    ...trace.candidates[0],
    id: "required-drop",
    dropItemIds: ["system-core"],
    inputTokens: 13760,
    quality: 0.91,
    qualityLossCi95: [-0.001, 0.001],
  }];
  assert.equal(auditTrace(trace).validatedCandidate, null);
});

test("requires the configured aggregate success rate", () => {
  const trace = cloneTrace();
  trace.candidates = [{ ...trace.candidates[0], successes: 6 }];
  assert.equal(auditTrace(trace).validatedCandidate, null);
});

test("changes individual opportunity classification when epsilon changes", () => {
  const strict = auditTrace(SUPPORT_TRACE, 0.001);
  const relaxed = auditTrace(SUPPORT_TRACE, 0.03);
  assert.ok(strict.individualOpportunityTokens < relaxed.individualOpportunityTokens);
});

test("exports finite, directionally named OTel-friendly attributes", () => {
  const attributes = toOtelAttributes(auditTrace(SUPPORT_TRACE));
  assert.equal(attributes["context.ration.schema.version"], "0.1");
  assert.equal(attributes["context.ration.candidate.id"], "lean-support");
  assert.equal(attributes["context.ration.candidate.validated"], true);
  assert.equal(attributes["context.ration.evidence.status"], "validated");
  assert.equal(attributes["context.ration.validated_token_reduction"], 0.2833);
  assert.ok(Object.values(attributes).every((value) => typeof value !== "number" || Number.isFinite(value)));
});

test("rejects duplicate context item IDs", () => {
  const trace = cloneTrace();
  trace.contextItems.push({ ...trace.contextItems[0], position: 99 });
  trace.baseline.inputTokens = 20000;
  assert.throws(() => auditTrace(trace), TraceValidationError);
});

test("rejects duplicate candidate IDs and duplicate drop IDs", () => {
  const duplicateCandidate = cloneTrace();
  duplicateCandidate.candidates.push({ ...duplicateCandidate.candidates[0] });
  assert.throws(() => auditTrace(duplicateCandidate), /Candidate IDs must be unique/);

  const duplicateDrop = cloneTrace();
  duplicateDrop.candidates = [{
    ...duplicateDrop.candidates[0],
    dropItemIds: ["mcp-schemas", "mcp-schemas"],
    inputTokens: 8480,
  }];
  assert.throws(() => auditTrace(duplicateDrop), /dropItemIds must be unique/);
});

test("rejects a candidate whose token count does not match its drop actions", () => {
  const trace = cloneTrace();
  trace.candidates = [{ ...trace.candidates[0], inputTokens: 1 }];
  assert.throws(() => auditTrace(trace), /inputTokens must equal baseline input/);
});

test("rejects empty drops, invalid numeric ranges, and non-finite epsilon", () => {
  const emptyDrop = cloneTrace();
  emptyDrop.candidates = [{ ...emptyDrop.candidates[0], dropItemIds: [], inputTokens: 14580 }];
  assert.throws(() => auditTrace(emptyDrop), /non-empty array/);

  const negativeCost = cloneTrace() as unknown as { baseline: { costUsd: number } };
  negativeCost.baseline.costUsd = -1;
  assert.throws(() => auditTrace(negativeCost), /costUsd must be >= 0/);
  assert.throws(() => auditTrace(SUPPORT_TRACE, Number.NaN), /finite number/);
});

test("rejects empty context, invalid categories, and reversed confidence bounds", () => {
  const empty = cloneTrace();
  empty.contextItems = [];
  assert.throws(() => auditTrace(empty), /non-empty array/);

  const badCategory = cloneTrace() as unknown as { contextItems: Array<{ category: string }> };
  badCategory.contextItems[0].category = "browser_cookie";
  assert.throws(() => auditTrace(badCategory), /category is not supported/);

  const badCi = cloneTrace();
  badCi.candidates[0].qualityLossCi95 = [0.01, -0.01];
  assert.throws(() => auditTrace(badCi), /bounds are reversed/);
});

test("marks individual ablations without intervals as measurement work", () => {
  const trace = cloneTrace();
  trace.contextItems[5].ablation = {
    quality: 0.913,
    latencyMs: 3030,
    attempts: 5,
    successes: 5,
  };
  const item = auditTrace(trace).items.find((entry) => entry.id === "mcp-schemas");
  assert.equal(item?.evidenceStatus, "insufficient-evidence");
  assert.equal(item?.recommendation, "measure");
});

test("rejects a misspelled required flag before it can bypass protection", () => {
  const trace = cloneTrace();
  const item = trace.contextItems[0] as ContextTrace["contextItems"][number] & {
    requiredd?: boolean;
  };
  delete item.required;
  item.requiredd = true;
  trace.candidates = [{
    ...trace.candidates[0],
    id: "typo-required",
    dropItemIds: ["system-core"],
    inputTokens: 13760,
    quality: 0.91,
    qualityLossCi95: [-0.001, 0.001],
  }];

  assert.throws(
    () => auditTrace(trace),
    /trace\.contextItems\[0\]\["requiredd"\] is not allowed/,
  );
});

test("rejects unknown item and candidate payloads instead of copying them into reports", () => {
  const itemPayload = cloneTrace() as ContextTrace & {
    contextItems: Array<ContextTrace["contextItems"][number] & { rawContent?: string }>;
  };
  itemPayload.contextItems[0].rawContent = "SECRET_PROMPT";
  assert.throws(
    () => auditTrace(itemPayload),
    /trace\.contextItems\[0\]\["rawContent"\] is not allowed/,
  );

  const candidatePayload = cloneTrace() as ContextTrace & {
    candidates: Array<ContextTrace["candidates"][number] & { rawRuns?: string }>;
  };
  candidatePayload.candidates[1].rawRuns = "SECRET_RUNS";
  assert.throws(
    () => auditTrace(candidatePayload),
    /trace\.candidates\[1\]\["rawRuns"\] is not allowed/,
  );
});

test("rejects unknown fields at every remaining object boundary", () => {
  const cases: Array<{
    path: RegExp;
    addUnknown: (trace: ContextTrace) => void;
  }> = [
    {
      path: /trace\["unexpected"\] is not allowed/,
      addUnknown: (trace) => {
        (trace as ContextTrace & { unexpected?: boolean }).unexpected = true;
      },
    },
    {
      path: /trace\.experiment\["unexpected"\] is not allowed/,
      addUnknown: (trace) => {
        (trace.experiment as ContextTrace["experiment"] & { unexpected?: boolean }).unexpected = true;
      },
    },
    {
      path: /trace\.evaluator\["unexpected"\] is not allowed/,
      addUnknown: (trace) => {
        (trace.evaluator as ContextTrace["evaluator"] & { unexpected?: boolean }).unexpected = true;
      },
    },
    {
      path: /trace\.baseline\["unexpected"\] is not allowed/,
      addUnknown: (trace) => {
        (trace.baseline as ContextTrace["baseline"] & { unexpected?: boolean }).unexpected = true;
      },
    },
    {
      path: /trace\.contextItems\[0\]\.ablation\["unexpected"\] is not allowed/,
      addUnknown: (trace) => {
        (trace.contextItems[0].ablation as NonNullable<
          ContextTrace["contextItems"][number]["ablation"]
        > & { unexpected?: boolean }).unexpected = true;
      },
    },
  ];

  for (const { path, addUnknown } of cases) {
    const trace = cloneTrace();
    addUnknown(trace);
    assert.throws(() => auditTrace(trace), path);
  }
});

test("rejects non-RFC3339 and impossible capturedAt timestamps", () => {
  for (const capturedAt of [
    "1",
    "08/08/2026",
    "2026-02-30T00:00:00Z",
    "2025-02-29T00:00:00Z",
    "2026-08-08T24:00:00Z",
    "2026-08-08T10:30:00+01:60",
  ]) {
    const trace = cloneTrace();
    trace.capturedAt = capturedAt;
    assert.throws(() => auditTrace(trace), /RFC 3339 date-time timestamp/);
  }
});

test("accepts RFC3339 offsets, fractional seconds, leap days, and leap seconds", () => {
  for (const capturedAt of [
    "1996-12-19T16:39:57-08:00",
    "1985-04-12t23:20:50.52z",
    "2024-02-29T00:00:00+05:30",
    "1990-12-31T23:59:60Z",
    "1990-12-31T15:59:60-08:00",
  ]) {
    const trace = cloneTrace();
    trace.capturedAt = capturedAt;
    assert.doesNotThrow(() => auditTrace(trace));
  }
});
