# Tramora

> Follow what your agents build. Understand their decisions. Keep what you learn.

Tramora is an open-source visual application for people who build software with AI agents. It brings together the observable work of the agents, the explanations a person needs to direct them, and a persistent map of what they have explored. Its purpose is to let you come back days later to a question, a decision or a change and recover its context without rereading several conversations.

This repository is the public home of the project: the concept documentation, the **runnable light walkthrough** (`app/`) and the decisions that shape the direction. Tramora is **not a commercial product and will not be sold**; it is published under the **Apache-2.0** license ([D-008](docs/08-decisions-and-questions.md#d-008--open-publication-under-apache-20-no-commercial-track-2026-10-11)).

## What it does

The walkthrough implemented today runs end to end, locally, with declared data and a read-only connector:

> observed agent activity → room and log → contextual question → explanation with sources → node saved and marked for review → recovery after reopening.

1. **Agent room.** Stable visual identities, each agent's assignment, observed status and messages between agents. Every communication link must have a source message or event; an interpretation is shown as an interpretation.
2. **Contextual companion.** For a concept or a decision it offers relevant questions. The person picks a short, example-based or more detailed explanation, or writes their own question.
3. **Personal map.** Keeps questions, explanations, examples, sources, links to decisions and review marks. Nothing is rewritten silently: saving keeps the previous version, and a changed `project_revision` proposes a review while keeping the old version.

Two capabilities of the proposed experience are **not implemented yet**:

4. **Informed decision.** Explaining what the agent is asking, why, what changes with each option and what remains open — and later sending the human answer back to the worker — is designed ([docs/02](docs/02-experience.md)) but not built.
5. **Resuming with change detection.** The return view shows recent activity, pending results and review marks, and keeps previous node versions, but it does not yet tell whether a saved explanation still applies to the project after changes.

## Status

**Product concept, open source, with a runnable light walkthrough.** Working document last updated on 16 October 2026. The concept is documented and versioned in this repository; the first commit is from 9 October 2026.

- **Implemented and tested:** the light walkthrough in [`app/`](app/README.md) — local web surface (Node + built-in SQLite), read-only lifecycle-hooks connector, observed-only rendering, local rules explanation with navigable sources, persistent nodes and review marks. 63 tests pass (unit + Playwright accessibility/UI at 320 px, keyboard and `prefers-reduced-motion`).
- **Tested with real activity:** a controlled case (`average` raising `ValueError`) was executed with a real Codex session and captured through lifecycle hooks (see [`docs/10`](docs/10-plugin-direction-and-technical-test.md) and the value-pilot protocol in `docs/06`).
- **Value pilot run once (n=1, single participant):** a real activity run, a saved and marked node, and a return to it after more than three days were measured on the local surface. The single-sample result is not a statistical claim and no productivity benefit is asserted; the measured limits are recorded ([docs/06](docs/06-validation-protocol.md)).
- **Not yet:** in-host panel next to the work in the ChatGPT desktop app (not accredited); any claimed benefit — none is asserted without evidence ([D-008](docs/08-decisions-and-questions.md#d-008--open-publication-under-apache-20-no-commercial-track-2026-10-11), [docs/06](docs/06-validation-protocol.md)).

## Running it

Requires **Node.js 22.5+** (uses the built-in `node:sqlite`; tested on Node 24).

```bash
cd app
npm install
npm test          # 63 tests: unit (contracts, store, adapter, operations) + Playwright a11y/UI
npm run lint      # node --check on every source file
npm start         # serves the web surface on http://127.0.0.1:4210
```

If Playwright's chromium is missing: `npx playwright install chromium`.

The server listens on `127.0.0.1:4210` by default (`TRAMORA_PORT` overrides) and writes `tramora.db` in the working directory (`TRAMORA_DB` overrides); the file is git-ignored. The UI states on screen that the default session is a **fictitious fixture**; it never claims an event that was not observed.

## How it stays truthful

- **Nothing invented.** Every animation, handoff or message attributed to an agent corresponds to an observed event with provenance. If the datum is missing, the gap is shown and the UI stays quiet; a model never reconstructs conversations that were not observed.
- **Observed ≠ generated.** Observed messages and generated explanations are separate classes, also when exporting. An explanation is never presented as the agent's internal thinking.
- **States are not conflated.** proposal ≠ human decision ≠ acknowledgment ≠ observed result; «not captured» ≠ «does not exist»; «not verified» ≠ «failed»; opening an explanation ≠ understanding it.
- **Minimal and authorized capture.** Only documented, authorized sources; least privilege; read-only. Installing a connector does not grant access to all conversations. No remote sending by default; the UI shows what would be shared.
- **Redaction before persist.** The capture hook redacts secrets and user-profile paths at the source before the JSONL is written; the store re-redacts by sensitive keys. Export keeps observed/generated separate and contains no excluded fields.
- **The map is not silently rewritten.** Saving a node keeps `previous_version`; changing a node's `project_revision` proposes a review and keeps the previous version.

## What is in this repository

- [`app/`](app/README.md) — the runnable light walkthrough: contracts, operations, capture adapter, local explanation service, web UI, tests.
- [`docs/01`](docs/01-context-and-opportunity.md) — origin, initial user and value proposition.
- [`docs/02`](docs/02-experience.md) — screens, interactions, questions, map and decisions.
- [`docs/03`](docs/03-data-and-truthfulness.md) — event model, provenance and rules for never inventing communications.
- [`docs/04`](docs/04-architecture-and-integrations.md) — plugin, reusable web interface, event capture and evolution.
- [`docs/05`](docs/05-mvp-and-roadmap.md) — phases and observable criteria.
- [`docs/06`](docs/06-validation-protocol.md) — controlled technical validation and a later value pilot, without a required external project.
- [`docs/07`](docs/07-research-and-positioning.md) — Facility, related solutions and sources.
- [`docs/08`](docs/08-decisions-and-questions.md) — explicit agreements (including D-001, D-005, D-007, D-008) and open questions.
- [`docs/09`](docs/09-searches-and-visual-inspiration.md) — searches and criteria for saving references.
- [`docs/10`](docs/10-plugin-direction-and-technical-test.md) — decision D-001 (plugin first) and the technical test criteria.

## Direction

**Direction accepted on 2026-09-29: plugin first**, with a reusable web interface and its own storage for the map ([D-001](docs/10-plugin-direction-and-technical-test.md)). The light scope, host and source were decided on 2026-10-11 ([D-007](docs/08-decisions-and-questions.md#d-007--light-scope-host-and-event-source-2026-10-11)): Codex in the ChatGPT desktop app with lifecycle hooks as the event source, and a local web with a read-only connector as a fallback for users without Codex. The value pilot selects its own case; no external project is required ([D-005](docs/08-decisions-and-questions.md#d-005--validation-independent-of-burneum-2026-10-10)).

The success criterion: Tramora must help direct work better. The pilot observes whether the person opens fewer side chats, understands a decision before answering, finds the message behind an explanation, and can pick up a question days later without rebuilding the whole conversation. One single-participant run (n=1) measured a real capture, a saved and marked node, and a return to it after more than three days; it carries no statistical value and **no benefit is asserted from it.**

## References and inspiration

[The Agile Monkeys](https://github.com/theam), creators of [Facility](https://github.com/theam/facility), are a product and architecture reference. Facility's documented approach informs four design ideas: persistent task context across agent sessions, an overview for returning to work, a timeline connecting activity with results, and shared data and operations across the web interface and MCP. Tramora adapts these ideas to contextual explanations and a personal learning map, using only authorized, observable activity. See [research and positioning](docs/07-research-and-positioning.md) for other references.
