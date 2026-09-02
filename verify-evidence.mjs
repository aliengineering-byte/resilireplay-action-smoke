import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(".");
const runs = join(root, "runs");

async function findCampaignRuns(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await findCampaignRuns(path)));
    else if (entry.name === "campaign-run.json") found.push(path);
  }
  return found;
}

const paths = await findCampaignRuns(runs);
if (paths.length !== 1) {
  throw new Error(`Expected exactly one campaign-run.json under runs, found ${paths.length}`);
}

const path = paths[0];
const evidence = JSON.parse(await readFile(path, "utf8"));
const expectedSummary = {
  passed: true,
  total: 2,
  passedCount: 2,
  failedCount: 0,
  invalidCount: 0,
  cancelledCount: 0,
  faultCoverage: 1,
};

for (const [field, expected] of Object.entries({
  schemaVersion: "1.0",
  kind: "resilireplay-campaign-run",
  productVersion: "0.7.0",
  campaignId: "released-action-smoke",
  status: "complete",
  telemetry: false,
})) {
  if (evidence[field] !== expected) {
    throw new Error(`Expected ${field}=${JSON.stringify(expected)}, got ${JSON.stringify(evidence[field])}`);
  }
}

for (const [field, expected] of Object.entries(expectedSummary)) {
  if (evidence.summary?.[field] !== expected) {
    throw new Error(
      `Expected summary.${field}=${JSON.stringify(expected)}, got ${JSON.stringify(evidence.summary?.[field])}`,
    );
  }
}

if (!/^[a-f0-9]{64}$/u.test(evidence.runHash)) {
  throw new Error("campaign-run.json does not contain a SHA-256 runHash");
}

const results = new Map(evidence.results?.map((result) => [result.id, result]) ?? []);
const clean = results.get("clean-control");
if (clean?.status !== "passed" || clean.fault !== "none" || clean.faultApplied !== false) {
  throw new Error("Clean control did not pass without an injected fault");
}
const recovery = results.get("bounded-rate-limit-recovery");
if (
  recovery?.status !== "passed" ||
  recovery.fault !== "http-429" ||
  recovery.faultApplied !== true ||
  recovery.metrics?.retryCount > 1 ||
  recovery.metrics?.duplicateSideEffectAttempts !== 0 ||
  recovery.metrics?.recoverySuccess !== true ||
  recovery.metrics?.retryBudgetCompliant !== true ||
  recovery.metrics?.safetyPolicyCompliance !== true
) {
  throw new Error("Bounded rate-limit recovery evidence did not meet the downstream contract");
}

console.log(
  `Verified released ResiliReplay ${evidence.productVersion} evidence: ${relative(root, path).replaceAll("\\", "/")} (${evidence.runHash})`,
);
