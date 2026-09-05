# ResiliReplay released Action smoke

This repository is intentionally small and independent. Its only job is to prove that a released
[ResiliReplay](https://github.com/aliengineering-byte/resilireplay) GitHub Action works from a clean
downstream repository; it does not publish a package, duplicate ResiliReplay implementation code, or
claim separate product adoption.

The workflow pins the ResiliReplay `v0.7.0` release commit, runs on Ubuntu and Windows with Node.js
22 and 24, and grants only `contents: read`. Its trace-only campaign performs a clean control and one
deterministic HTTP 429 fault with bounded recovery. The downstream
[`verify-evidence.mjs`](verify-evidence.mjs) then fails unless the released Action produced exactly
one `campaign-run.json` with:

- product version `0.7.0` and campaign schema `1.0`;
- a complete, passing two-scenario result;
- a passing fault-free control;
- an applied `http-429` fault, safe recovery, at most one retry, and zero duplicate side effects;
- telemetry disabled and a SHA-256-shaped run integrity field.

Passing evidence and the dependency-free validator are retained together as a short-lived workflow
artifact. The upload keeps the `runs/` directory, so after downloading and extracting an artifact,
run `node verify-evidence.mjs` from the extracted root. The scheduled run is a canary for the pinned
release and GitHub runner environment; it does not silently follow `latest`. A new ResiliReplay
release must be reviewed and pinned explicitly here.

Maintainer validation uses the released Action in GitHub Actions. The evidence validator itself is
dependency-free and can be rerun with `node verify-evidence.mjs` after a campaign has populated
`runs/`.

## AgentTX released Action smoke

The independent [`agenttx.yml`](.github/workflows/agenttx.yml) workflow installs the exact public
`agenttx@0.3.0` CLI, creates a real committed proof on Linux and Windows with Node.js 20 and 24,
and verifies it with the immutable AgentTX v0.3.0 release commit. It fails closed unless the
Action reports `PASS`, the transaction is `COMMITTED`, the receipt digest is SHA-256-shaped, and
both the JSON receipt and rendered Proof Card exist. The complete proof pack is retained as a
short-lived artifact; the workflow grants only `contents: read` and never pushes its local commit.
