#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { auditTrace, toOtelAttributes } from "../lib/contextration/index";

function usage() {
  return `
ContextRation — context efficiency auditor

Usage:
  npx tsx cli/audit.ts <trace.json> [--epsilon=0.01] [--json | --otel]

The input must follow benchmarks/schema.json. Quality is normalized to 0..1.
A validated policy requires a paired quality-loss 95% CI whose upper bound
does not exceed the predeclared non-inferiority margin.
`;
}

function parseArgs(argv: string[]) {
  const options = { file: "", epsilon: undefined as number | undefined, json: false, otel: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") return { ...options, help: true };
    if (arg === "--json") options.json = true;
    else if (arg === "--otel") options.otel = true;
    else if (arg.startsWith("--epsilon=")) {
      const epsilon = Number(arg.slice(10));
      if (!Number.isFinite(epsilon)) throw new Error("--epsilon must be a finite number.");
      options.epsilon = epsilon;
    } else if (!arg.startsWith("-") && !options.file) options.file = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.json && options.otel) throw new Error("Choose either --json or --otel, not both.");
  return { ...options, help: false };
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function signedOutcomeDelta(qualityLoss: number) {
  if (Math.abs(qualityLoss) < 1e-12) return "0.000";
  return `${qualityLoss > 0 ? "−" : "+"}${Math.abs(qualityLoss).toFixed(3)}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file) {
    console.log(usage());
    if (!args.help) process.exitCode = 1;
    return;
  }

  const input: unknown = JSON.parse(await readFile(resolve(args.file), "utf8"));
  const report = auditTrace(input, args.epsilon);

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (args.otel) {
    console.log(JSON.stringify(toOtelAttributes(report), null, 2));
    return;
  }

  console.log(`\nContextRation audit · ${report.traceName}`);
  console.log("─".repeat(68));
  console.log(`Evidence status             ${report.evidenceStatus}`);
  console.log(`Attribution coverage        ${percent(report.attributionCoverage)}`);
  console.log(`Individual opportunities    ${report.individualOpportunityTokens.toLocaleString()} tokens`);
  console.log(`Validated token reduction   ${percent(report.validatedTokenReduction)}`);
  console.log(`Outcome delta vs. baseline  ${signedOutcomeDelta(report.qualityLoss)}`);
  console.log(`Validated candidate         ${report.validatedCandidate?.label ?? "none"}`);
  console.log(`Projected cost change       ${report.projectedCostReductionUsd >= 0 ? "−" : "+"}$${Math.abs(report.projectedCostReductionUsd).toFixed(4)} / run`);
  console.log(`Projected audit payback     ${report.paybackRuns !== null ? `${report.paybackRuns} runs` : "not reached"}`);
  console.log("");

  const rows = report.items.map((item) => ({
    item: item.label,
    category: item.category,
    tokens: item.tokens,
    "quality loss": item.qualityLoss === null ? "—" : item.qualityLoss.toFixed(3),
    evidence: item.evidenceStatus,
    recommendation: item.recommendation,
  }));
  console.table(rows);

  if (report.warnings.length) {
    console.log("Warnings:");
    for (const warning of report.warnings) console.log(`- ${warning}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ContextRation failed: ${message}`);
  process.exitCode = 1;
});
