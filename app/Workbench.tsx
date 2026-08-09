"use client";

import { useMemo, useState } from "react";
import { auditTrace, DEMO_TRACES, toOtelAttributes } from "@/lib/contextration";
import type { CandidateRun, ContextCategory, ContextTrace } from "@/lib/contextration";

const CATEGORY_LABELS: Record<ContextCategory, string> = {
  system: "System",
  history: "History",
  retrieval: "Retrieval",
  tool_schema: "Tool schema",
  tool_result: "Tool result",
  memory: "Memory",
  scratchpad: "Scratchpad",
  other: "Other",
};

const CATEGORY_COLORS: Record<ContextCategory, string> = {
  system: "var(--signal)",
  history: "#ff8d62",
  retrieval: "#7aa8ff",
  tool_schema: "#c79aff",
  tool_result: "#36c7a1",
  memory: "#ffc857",
  scratchpad: "#ef7bb0",
  other: "#9ba3a1",
};

function percent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function compactTokens(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}k`;
  return value.toLocaleString();
}

function formatDelta(value: number | null) {
  if (value === null) return "unmeasured";
  const points = value * 100;
  return `${points > 0 ? "−" : points < 0 ? "+" : ""}${Math.abs(points).toFixed(1)} pts`;
}

function MetricCard({
  index,
  label,
  value,
  note,
  signal,
}: {
  index: string;
  label: string;
  value: string;
  note: string;
  signal?: boolean;
}) {
  return (
    <article className={`metric-card${signal ? " metric-card--signal" : ""}`}>
      <div className="metric-topline">
        <span>{index}</span>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function CandidatePlot({ trace, epsilon }: { trace: ContextTrace; epsilon: number }) {
  const allRuns: Array<(CandidateRun & { baseline?: boolean })> = [
    {
      id: "baseline",
      label: "Baseline",
      dropItemIds: [],
      ...trace.baseline,
      baseline: true,
    },
    ...trace.candidates,
  ];
  const minTokens = Math.min(...allRuns.map((run) => run.inputTokens)) * 0.92;
  const maxTokens = Math.max(...allRuns.map((run) => run.inputTokens)) * 1.03;
  const qualities = allRuns.map((run) => run.quality);
  const minQuality = Math.min(...qualities, trace.baseline.quality - epsilon) - 0.012;
  const maxQuality = Math.max(...qualities) + 0.01;
  const x = (tokens: number) => ((tokens - minTokens) / (maxTokens - minTokens)) * 100;
  const y = (quality: number) => 100 - ((quality - minQuality) / (maxQuality - minQuality)) * 100;
  const floorY = y(trace.baseline.quality - epsilon);

  return (
    <div className="plot-shell" aria-label="Candidate quality versus input tokens">
      <div className="plot-heading">
        <div>
          <span className="eyebrow">Counterfactual frontier</span>
          <h3>Quality vs. input tokens</h3>
        </div>
        <span className="demo-pill">DEMO DATA</span>
      </div>
      <div className="plot-area">
        <div className="plot-grid plot-grid--x" />
        <div className="plot-grid plot-grid--y" />
        <div className="quality-zone" style={{ height: `${Math.max(0, floorY)}%` }}>
          <span>non-inferior zone</span>
        </div>
        <div className="epsilon-line" style={{ top: `${floorY}%` }}>
          <span>baseline − ε</span>
        </div>
        {allRuns.map((run) => {
          const isValid = run.baseline || (
            run.successes / run.attempts >= trace.evaluator.requiredSuccessRate &&
            Boolean(run.qualityLossCi95) &&
            (run.qualityLossCi95?.[1] ?? Number.POSITIVE_INFINITY) <= epsilon + 1e-10
          );
          return (
            <div
              className={`plot-point${run.baseline ? " plot-point--baseline" : ""}${isValid ? " plot-point--valid" : ""}`}
              key={run.id}
              style={{ left: `${x(run.inputTokens)}%`, top: `${y(run.quality)}%` }}
            >
              <span className="plot-dot" />
              <span className="plot-label">{run.label}</span>
            </div>
          );
        })}
        <span className="axis-label axis-label--y">QUALITY ↑</span>
        <span className="axis-label axis-label--x">FEWER TOKENS ←</span>
      </div>
    </div>
  );
}

function JsonPanel({ policy, traceId }: { policy: unknown; traceId: string }) {
  const [copied, setCopied] = useState(false);
  const value = JSON.stringify(policy, null, 2);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="json-panel" aria-labelledby="policy-title">
      <div className="panel-heading panel-heading--dark">
        <div>
          <span className="eyebrow">Machine-readable output</span>
          <h3 id="policy-title">Validated policy</h3>
        </div>
        <button type="button" className="copy-button" onClick={copy}>
          {copied ? "Copied" : "Copy JSON"}
        </button>
      </div>
      <div className="code-meta">
        <span>trace/{traceId}</span>
        <span>schema 0.1</span>
      </div>
      <pre><code>{value}</code></pre>
    </section>
  );
}

export function Workbench() {
  const [traceIndex, setTraceIndex] = useState(0);
  const [epsilon, setEpsilon] = useState(DEMO_TRACES[0].evaluator.epsilon);
  const [commandCopied, setCommandCopied] = useState(false);
  const trace = DEMO_TRACES[traceIndex];
  const report = useMemo(() => auditTrace(trace, epsilon), [trace, epsilon]);
  const otel = useMemo(() => toOtelAttributes(report), [report]);
  const maxItemTokens = Math.max(...report.items.map((item) => item.tokens));

  function chooseTrace(index: number) {
    setTraceIndex(index);
    setEpsilon(DEMO_TRACES[index].evaluator.epsilon);
  }

  async function copyCommand() {
    await navigator.clipboard.writeText("npm run audit:demo");
    setCommandCopied(true);
    window.setTimeout(() => setCommandCopied(false), 1600);
  }

  return (
    <main>
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label="ContextRation home">
          <span className="wordmark-mark" aria-hidden="true">CR</span>
          <span>ContextRation</span>
        </a>
        <div className="nav-links">
          <a href="#lab">Lab</a>
          <a href="#method">Method</a>
          <a href="#quickstart">Quickstart</a>
        </div>
        <a className="nav-cta" href="#quickstart">Run locally <span>↗</span></a>
      </nav>

      <header className="hero" id="top">
        <div className="hero-grid hero-grid--top" aria-hidden="true" />
        <div className="hero-copy">
          <div className="status-line"><span className="status-dot" /> Open source · v0.1 · Apache-2.0</div>
          <h1>Feed your agents<br />only what <em>matters.</em></h1>
          <p className="hero-lede">
            Test which context costs tokens without improving measured outcomes. ContextRation turns agent traces into a token ledger, paired ablations, and policies validated under your evaluation scope.
          </p>
          <div className="hero-actions">
            <a className="button button--primary" href="#lab">Open the live audit <span>↓</span></a>
            <a className="button button--ghost" href="#method">Read the method</a>
          </div>
        </div>
        <aside className="hero-proof">
          <div className="proof-index">01 / THESIS</div>
          <p>More context is not the same as more intelligence.</p>
          <div className="proof-rule" />
          <div className="proof-row"><span>Measure</span><strong>marginal utility</strong></div>
          <div className="proof-row"><span>Protect</span><strong>task quality</strong></div>
          <div className="proof-row"><span>Ship</span><strong>validated policy</strong></div>
        </aside>
        <div className="hero-rail" aria-hidden="true">
          <span>TRACE</span><i /> <span>ABLATE</span><i /> <span>VALIDATE</span><i /> <span>EXPORT</span>
        </div>
      </header>

      <section className="lab" id="lab">
        <div className="section-intro">
          <span className="section-number">02</span>
          <div>
            <span className="eyebrow">Interactive audit workbench</span>
            <h2>See every token earn its place.</h2>
          </div>
          <p>Switch workloads and change the accepted quality margin. Every recommendation is recalculated in your browser from the open fixture.</p>
        </div>

        <div className="workbench">
          <div className="workbench-toolbar">
            <div className="trace-tabs" role="tablist" aria-label="Demo trace">
              {DEMO_TRACES.map((item, index) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={traceIndex === index}
                  className={traceIndex === index ? "active" : ""}
                  key={item.traceId}
                  onClick={() => chooseTrace(index)}
                >
                  <span>0{index + 1}</span>{item.name}
                </button>
              ))}
            </div>
            <div className="epsilon-control">
              <label htmlFor="epsilon">Non-inferiority margin <strong>ε = {epsilon.toFixed(3)}</strong></label>
              <input
                id="epsilon"
                type="range"
                min="0"
                max="0.04"
                step="0.001"
                value={epsilon}
                onChange={(event) => setEpsilon(Number(event.target.value))}
              />
              <div><span>strict</span><span>permissive</span></div>
            </div>
          </div>

          <div className="trace-summary">
            <div>
              <span className="trace-label">Active trace · synthetic fixture</span>
              <h3>{trace.name}</h3>
              <p>{trace.description}</p>
            </div>
            <dl>
              <div><dt>MODEL</dt><dd>{trace.model}</dd></div>
              <div><dt>EVALUATOR</dt><dd>{trace.evaluator.name}</dd></div>
              <div><dt>ATTEMPTS</dt><dd>{trace.baseline.attempts + trace.candidates.reduce((sum, run) => sum + run.attempts, 0) + trace.contextItems.reduce((sum, item) => sum + (item.ablation?.attempts ?? 0), 0)}</dd></div>
            </dl>
          </div>

          <div className="metrics-grid">
            <MetricCard index="A" label="Attribution coverage" value={percent(report.attributionCoverage)} note={`${compactTokens(report.attributedTokens)} of ${compactTokens(trace.baseline.inputTokens)} input tokens mapped`} />
            <MetricCard index="B" label="Validated reduction" value={percent(report.validatedTokenReduction)} note={report.validatedCandidate ? `${report.validatedCandidate.label} cleared the 95% bound` : "No combined candidate validated"} signal />
            <MetricCard index="C" label="Outcome delta vs. baseline" value={formatDelta(report.qualityLoss)} note={`Baseline ${(trace.baseline.quality * 100).toFixed(1)} / candidate ${((report.validatedCandidate?.quality ?? trace.baseline.quality) * 100).toFixed(1)}`} />
            <MetricCard index="D" label="Evidence status" value={report.evidenceStatus === "validated" ? "Validated" : "Inconclusive"} note={`${Math.round(report.confidence * 100)}% paired CI · ε ${report.epsilon.toFixed(3)} · scoped result`} />
          </div>

          <div className="audit-grid">
            <section className="ledger" aria-labelledby="ledger-title">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Context ledger</span>
                  <h3 id="ledger-title">Marginal utility by item</h3>
                </div>
                <span className="item-count">{report.items.length} items · {compactTokens(report.contextTokens)} tokens</span>
              </div>
              <div className="ledger-header" aria-hidden="true">
                <span>Context item</span><span>Tokens</span><span>Δ quality</span><span>Evidence</span>
              </div>
              <div className="ledger-list">
                {report.items.map((item) => (
                  <article className="ledger-row" key={item.id}>
                    <div className="item-name">
                      <span className="category-dot" style={{ background: CATEGORY_COLORS[item.category] }} />
                      <div><strong>{item.label}</strong><span>{CATEGORY_LABELS[item.category]} · {item.source}</span></div>
                    </div>
                    <div className="token-cell">
                      <strong>{item.tokens.toLocaleString()}</strong>
                      <span><i style={{ width: `${(item.tokens / maxItemTokens) * 100}%`, background: CATEGORY_COLORS[item.category] }} /></span>
                    </div>
                    <span className={`delta ${item.evidenceStatus === "non-inferior" ? "delta--safe" : ""}`}>{formatDelta(item.qualityLoss)}</span>
                    <span className={`verdict verdict--${item.recommendation}`}>
                      {item.recommendation === "experiment-candidate" ? "candidate" : item.recommendation}
                    </span>
                  </article>
                ))}
              </div>
              <div className="ledger-note">
                <span>Important</span>
                Individually safe items are only candidates. ContextRation exports a drop action after that exact combination passes a full rerun.
              </div>
            </section>

            <div className="right-stack">
              <CandidatePlot trace={trace} epsilon={epsilon} />
              <JsonPanel policy={report.policy} traceId={trace.traceId} />
            </div>
          </div>

          <div className="otel-strip">
            <span className="otel-mark">OTel</span>
            <div><strong>Trace-native export</strong><span>{Object.keys(otel).length} stable <code>context.ration.*</code> attributes</span></div>
            <code>context.ration.validated_token_reduction={report.validatedTokenReduction}</code>
          </div>
        </div>
      </section>

      <section className="method" id="method">
        <div className="section-intro section-intro--light">
          <span className="section-number">03</span>
          <div>
            <span className="eyebrow">A stricter optimization loop</span>
            <h2>Evidence before deletion.</h2>
          </div>
          <p>ContextRation does not infer that several individually safe removals are safe together. It reruns the combined candidate and keeps failures in the record.</p>
        </div>
        <div className="method-flow">
          {[
            ["01", "Ledger", "Map system prompts, history, retrieval, tools, memory, and results back to input tokens."],
            ["02", "Ablate", "Remove one item or an explicit group, then rerun paired attempts under the same evaluator."],
            ["03", "Validate", "Require task success and quality loss within the configured non-inferiority margin."],
            ["04", "Export", "Emit a reviewable JSON policy and OTel-friendly attributes for CI and production traces."],
          ].map(([number, title, body], index) => (
            <article className="method-step" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
              {index < 3 && <i aria-hidden="true">→</i>}
            </article>
          ))}
        </div>
        <div className="principles">
          <article><span>01</span><h3>No magic compression score</h3><p>Every recommendation points back to a trace item and a measured counterfactual.</p></article>
          <article><span>02</span><h3>Failures stay in the denominator</h3><p>Timeouts and invalid outputs cannot disappear from a flattering benchmark.</p></article>
          <article><span>03</span><h3>Your evaluator defines quality</h3><p>Use tests, groundedness, exact match, or a domain rubric—normalized to a 0–1 score.</p></article>
        </div>
      </section>

      <section className="quickstart" id="quickstart">
        <div className="quickstart-copy">
          <span className="section-number">04</span>
          <span className="eyebrow">Two-minute local proof</span>
          <h2>Clone. Audit.<br /><em>Question the context.</em></h2>
          <p>The repository ships with three reproducible fixtures, a typed schema, a CLI, tests, and the same browser workbench you are using now.</p>
        </div>
        <div className="terminal-card">
          <div className="terminal-bar"><span /><span /><span /><strong>contextration / terminal</strong></div>
          <div className="terminal-body">
            <p><span>$</span> npm install</p>
            <p><span>$</span> npm run audit:demo</p>
            <div className="terminal-output">
              <span>✓ attribution coverage</span><strong>{percent(report.attributionCoverage)}</strong>
              <span>✓ validated reduction</span><strong>{percent(report.validatedTokenReduction)}</strong>
              <span>✓ outcome delta</span><strong>{formatDelta(report.qualityLoss)}</strong>
              <span>→ policy</span><strong>{report.validatedCandidate?.id ?? "none"}</strong>
            </div>
            <button type="button" onClick={copyCommand}>{commandCopied ? "Command copied" : "Copy audit command"}</button>
          </div>
        </div>
      </section>

      <footer>
        <a className="wordmark wordmark--footer" href="#top"><span className="wordmark-mark">CR</span><span>ContextRation</span></a>
        <p>Make context earn its place.</p>
        <div><a href="#lab">Lab</a><a href="#method">Method</a><a href="#quickstart">Quickstart</a></div>
        <span>Apache-2.0 · Built in the open</span>
      </footer>
    </main>
  );
}
