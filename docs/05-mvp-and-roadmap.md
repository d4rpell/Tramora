# MVP and roadmap

Status: proposal to guide the work. The concept prototype is a visual simulation; no phase is considered implemented by that prototype.

## Initial promise

"I can follow my agents' work, understand a technical decision in the same place where it happened, and later recover what I learned." The first version focuses on a technical person working with one project and one event source, without promising to coordinate all of their agents or to replace the IDE.

## Phase 0 — A design that can be tested

- Interactive walkthrough with fictional data: room, selected event, explanation at three depths, suggested questions and a map with "Mark for review" («Marcar para repasar»).
- Check with users whether they can tell an observed message apart from a generated explanation, find the source of a claim and return to the marked point.
- Exit criterion: the walkthrough is understood without the author having to explain it out loud; clarity problems are recorded.

## Prior technical test — Plugin with real activity

Priority accepted in [D-001](10-plugin-direction-and-technical-test.md): verify an integrated panel, authorized access to events and a complete walkthrough up to saving and recovering an explanation in the map. Use an authorized controlled task, with genuinely executed agent activity and test data, without requiring another project ([D-005](08-decisions-and-questions.md#d-005--validation-independent-of-burneum-2026-10-10)). The technical test is separate from the later value pilot. This test brings forward the minimum check of live activity; Phase 2 will extend navigation and robustness. It is not considered implemented by the demos.

## Phase 1 — MVP with one real source

- Read-only connection to **one** authorized source, chosen according to the plugin test; import as an alternative where appropriate. An import does not demonstrate live capture.
- Activity view ordered by time, with real identities and relationships between tasks/artifacts; availability states and information gaps visible.
- Contextual explanation of an event with citations to the imported pieces. Suggested questions, short answer and progressive expansion.
- Persistent map with concept, question, decision and outcome nodes; search; links to the source event; small review marker and a view of marked items.
- Exit criterion: a session can be imported, "why was this done?" can be answered without opening another chat, the application can be closed, and days later the correct node can be recovered with its context. An end-to-end test must demonstrate persistence and provenance.

## Phase 2 — Live session and richer navigation

- Connect a documented API to a session that Tramora can legitimately observe.
- Live updating of events, delegation threads and handoffs; the user can filter noise and move from a summarized view to the available original messages.
- Novelty signals for topics already learned: "this decision changed", "the outcome contradicts the previous explanation", "an open question remains".
- Exit criterion: the state of the room matches what the source exposes; a lost or unavailable event is shown as such.

## Phase 3 — Intervention and enterprise use

- Human-in-the-loop actions: put a question to the right agent, approve or reject a specific action, record what it answered or executed.
- Team spaces: share a curated map, permissions, traceability and retention controls.
- Additional connectors selected by demand, not by catalog. Integrations with repositories, issues and PRs only where they improve the context of a decision.
- Exit criterion: a company can point to a decision, its author/source, the explanation a person saw and the system's subsequent response, with verifiable access controls.

## Outside the first MVP

A new autonomous swarm, an agent marketplace, avatar gamification, invented transcription of conversations, productivity metrics without a baseline, and a "second brain" that generates relationships without sources. These are possible extensions or ideas to be discarded with evidence, not requirements for launch.

## Product risks to measure

- **Noise:** too many events or suggested questions may annoy more than help. Measure what gets opened and what gets ignored.
- **Trust:** a fluent explanation can hide a lack of data. Measure whether people correctly identify facts, inferences and gaps.
- **Unmanageable map:** automatic nodes without editing end up as yet another list that is hard to consult. Measure recovery after several days.
- **Interruption:** the panel must not force constant switching between Codex/IDE and Tramora. Test real duration and frequency of use.

## Commercial preparation before launch

The usable initial version and value pilot precede commercial completion. Before public opening, implement and privately validate the applicable full user journey: access and permissions, test-mode purchase and verified payment events, entitlement, delivery/installation, operational email, learning recovery and support/cancellation/data deletion. Choose offer, licence and distribution based on verified host restrictions; no checkout workaround is presumed compatible.

Prepare production configuration, credentials, private deployment, rollback/restoration, minimal monitoring, privacy/retention and customer texts, plus the owner's administrative requirements. Record evidence and remaining activation steps. Commercial readiness is not declared while implementation, credentials, approvals or required validation are missing. Keep public DNS from pointing to the service and real charges disabled until the owner confirms applicable administrative preparations and expressly authorizes launch. Agent intervention, teams and additional connectors remain separate extensions requiring explicit decisions, not first-launch requirements.
