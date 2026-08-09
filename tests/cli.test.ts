import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

function runCli(...args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", "cli/audit.ts", ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

test("rejects an empty epsilon value instead of treating it as zero", () => {
  const result = runCli("examples/support-agent.json", "--epsilon=", "--json");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--epsilon must include a finite number/);
});

test("continues to accept an explicit zero epsilon", () => {
  const result = runCli("examples/support-agent.json", "--epsilon=0", "--json");

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout) as { epsilon: number };
  assert.equal(report.epsilon, 0);
});

test("escapes terminal control characters in human-readable output and errors", () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "contextration-cli-"));
  try {
    const fixture = JSON.parse(
      readFileSync(join(repositoryRoot, "examples/support-agent.json"), "utf8"),
    ) as { name: string; contextItems: Array<{ label: string }> };
    fixture.name = "trace\u001b[2J\nspoof";
    fixture.contextItems[0].label = "item\u001b]8;;https://example.com\u0007link";
    const fixturePath = join(temporaryDirectory, "control-characters.json");
    writeFileSync(fixturePath, JSON.stringify(fixture));

    const report = runCli(fixturePath);
    assert.equal(report.status, 0, report.stderr);
    assert.doesNotMatch(report.stdout, /[\u001b\u0007]/);
    assert.match(report.stdout, /trace\\u001b\[2J\\u000aspoof/);
    assert.match(report.stdout, /item/);
    assert.match(report.stdout, /u001b/);
    assert.match(report.stdout, /u0007/);

    const error = runCli("--unknown=\u001b[2J");
    assert.notEqual(error.status, 0);
    assert.doesNotMatch(error.stderr, /\u001b/);
    assert.match(error.stderr, /--unknown=\\u001b\[2J/);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
