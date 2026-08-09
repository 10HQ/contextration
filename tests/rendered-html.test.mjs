import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the ContextRation workbench shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>ContextRation — Make context earn its place<\/title>/i);
  assert.match(html, /Feed your agents/);
  assert.match(html, /Interactive audit workbench/);
  assert.match(html, /Returns support agent/);
  assert.match(html, /Evidence before deletion/);
  assert.doesNotMatch(html, /Your site is taking shape|Codex is working|react-loading-skeleton/);
});

test("ships semantic navigation and the core methodology", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /aria-label="Primary navigation"/);
  assert.match(html, /Context ledger/);
  assert.match(html, /Individually safe items are only candidates/);
  assert.match(html, /Validated policy/);
  assert.match(html, /Trace-native export/);
});

test("ships an actionable quickstart and accessible workbench semantics", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /href="https:\/\/github\.com\/10HQ\/contextration"/);
  assert.match(html, /git clone https:\/\/github\.com\/10HQ\//);
  assert.match(html, /role="group" aria-label="Demo trace"/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /role="tablist"/);
  assert.match(html, /role="table" aria-labelledby="ledger-title"/);
  assert.match(html, /role="columnheader"/);
  assert.match(html, /role="rowheader"/);
  assert.match(html, /role="cell"/);
  assert.match(html, /role="img" aria-label="Baseline: 14,580 input tokens, quality 91\.0%, baseline\."/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /class="workbench notranslate" translate="no"/);
  assert.match(html, /class="terminal-card notranslate" translate="no"/);
  assert.match(html, /<link(?=[^>]*rel="icon")(?=[^>]*href="[^"]*\/icon\.svg")[^>]*>/i);
  assert.match(html, /<meta(?=[^>]*property="og:image:width")(?=[^>]*content="1731")[^>]*>/i);
});

test("does not leak local build or font paths", async () => {
  const response = await render();
  const html = await response.text();

  assert.doesNotMatch(html, /C:\/Users/i);
  assert.doesNotMatch(html, /\\Users\\/i);
  assert.doesNotMatch(html, /signalkite/i);
});
