# Tramora light — runnable app (T1-01)

This is the **runnable light walkthrough** of Tramora, implemented in `app/`. It is **not** a product, not a plugin, and not connected to Codex or any real agent session: the data is a declared **fictitious fixture**. It demonstrates the full walkthrough loop with a local web surface:

> observed activity → avatar and log → contextual question → explanation with source → node saved and marked for review → recovery after reopening.

## Facts and limits

- **Everything shown is fixture data.** `src/capture/fixture-hooks.js` declares an invented session; the UI states it is a fixture demo on screen.
- **Only observed events are shown.** An event without an observable result shows a declared gap; nobody is invented, no handoff is reconstructed.
- **`observed` ≠ `generated`.** The explanation is generated locally by rules over the already-redacted stored context; it is labeled `generated` and is never presented as the agent's internal thinking. Export keeps both dimensions.
- **No remote sending by default.** Generation is local; the API `permission` flag (currently `false`) gates any remote route. A question that cannot be answered because the event is missing returns a visible error, never a fabricated success.
- **Redaction before persist.** The fixture includes `TRAMORA_TEST_SECRET_*` values; they never reach storage, the explanation, or the export (verified by absence in tests).
- **The map is not rewritten silently.** Saving a node keeps `previous_version`; changing a node's `project_revision` proposes a review and keeps the previous version.
- **Storage is local, independent of the panel.** Single-file embedded SQLite (Node <code>node:sqlite</code>); closing the UI does not erase tasks, sessions, events, nodes or marks.

## Install and run (development)

Requires **Node.js 22.5+** (uses the built-in `node:sqlite`; tested on Node 24).

```bash
cd app
npm install
npm test          # 63 tests: unit (contracts, store, adapter, operations) + Playwright a11y/cross-site e2e
npm run lint      # node --check on every source file
npm start         # serves the web surface on http://127.0.0.1:4210
```

If Playwright's chromium is missing: `npx playwright install chromium`.

The server listens on `127.0.0.1:4210` by default (`TRAMORA_PORT` overrides). It writes `tramora.db` in the working directory (`TRAMORA_DB` overrides); the file is git-ignored.

## Capturing a real session

`npm start` serves a declared fixture. To serve events captured from a real, authorized Codex session:

1. Copy [`hooks/tramora-hook.js`](hooks/tramora-hook.js) into `<project>/.codex/hooks/` and point `<project>/.codex/hooks.json` at it. The hook writes nothing unless `TRAMORA_HOOK_LOG` is set.
2. Run the session with that variable set (Codex runs the project hooks only for trusted projects; an untrusted project's hooks are skipped silently).
3. Serve the capture:

```bash
TRAMORA_HOOKS_LOG="/path/to/hooks.jsonl" \
TRAMORA_DB="/path/to/tramora.db" \
TRAMORA_PROJECT="my-project" \
npm run connect            # http://127.0.0.1:4212
```

`src/connector.js` reads the JSONL on every request (live, no restart), ingests idempotently, binds to `127.0.0.1` only, and relabels the served page as an **observed session**: labelling real activity as a fixture would break the same truthfulness rule as presenting fiction as real.

## What is implemented (T1-01a–h)

- **T1-01a — Base and storage:** `src/core/store.js` (SQLite) + `src/core/operations.js`; persistence survives close/reopen; two tasks never mix records; write errors are visible.
- **T1-01b — Adapter and provenance:** `src/capture/hooks-adapter.js` normalizes a documented source event; identity is scoped by session/turn; re-delivery is deduplicated, legitimate repeats survive; missing occurrence ids are never deduplicated by absence (`identity_confidence=uncertain`); coverage states are declared.
- **T1-01c — Room, avatars, timeline:** `static/app.js` renders the room only from observed events, with a navigable source dialog; 320 px, keyboard and `prefers-reduced-motion` are tested by `tests/a11y.e2e.test.js`.
- **T1-01d — Questions and shared context:** a question is tied to task/session/event; suggestions are editable hypotheses; fields to be shared are shown; nothing is sent without permission.
- **T1-01e — Explanation with sources:** `src/explain/service.js` produces brief / with-example / detailed answers with claims, each `observed_fact` carrying navigable `source_refs`; insufficient data produces a visible limit.
- **T1-01f — Save, map, review:** nodes keep versions; marks are persistent; reopening recovers node, source and mark.
- **T1-01g — Shared operations:** one store behind both the web UI and the API; export separates observed/generated and keeps provenance; delete follows retention.
- **T1-01h — Installation and integration:** this README is the runbook; capture can be enabled/disabled; a fixture secret never persists.

## API (local)

| Endpoint | Purpose |
|---|---|
| `GET /api/state` | coverage, capture enabled, permission |
| `GET /api/events` | observed events of the fixture session |
| `POST /api/ask` | `{eventRef, text, depth}` → `Question` + `Explanation` (local) |
| `GET /api/nodes`, `POST /api/node` | map nodes (with versions) |
| `POST /api/mark`, `GET /api/map-marked` | review marks |
| `POST /api/capture` | enable/disable capture |
| `GET /api/export` | full export (observed vs generated kept separate) |

## Testing

- `tests/contracts.test.js` — contract invariants (identity scope, observed/generated axes, human_decision, claims).
- `tests/store.test.js` — persistence across reopen, task isolation, visible storage failures.
- `tests/adapter.test.js` — dedup, legit repeats, cross-session/no-id/two-turns, **normalize() identity (turn_id, no stable id → uncertain)**, redaction by sensitive key incl. arrays/`Bearer`, capture stopped.
- `tests/operations.test.js` — ask context binding, redaction in payload, node versions/review proposal, decision contract (kind=decision, relation=decided, demote protection), marks, export/delete.
- `tests/a11y.e2e.test.js` — Playwright: fixture served, room renders only observed events, no overflow at 320 px, keyboard-only ask, no animations under reduced motion, save+mark via UI, **cross-site Origin rejection (403) and body limit (413)**.

## Known limits

- The **hooks adapter is a normalizer over documented event fields**, not a connection to a real host. Real capture requires T0-04b authorization and a verified source (D-007).
- `permission` is `false` by default; explanations are rule-based local generation, not a remote model. Remote sending is not implemented (by design, spec §4).
- The coverage state currently reports `no permission` when `permission=false`, even though local capture works; this mirrors the privacy-first default (nothing is sent or captured without permission).
- This app is a **light walkthrough**, not the plugin, the web connector, nor the Codex panel. Presence and usefulness are hypotheses measured in T1-02, not claimed here.