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
