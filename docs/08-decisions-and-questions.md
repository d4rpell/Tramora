# Decisions, hypotheses and open questions

Started: 2026-09-29. Updated: 2026-10-11. This log keeps proposals made during ideation from being mistaken for confirmed decisions.

## Confirmed by the owner

- **Name:** Tramora. The owner states that they have reserved it on GitHub; the URL and availability have not been independently verified.
- **Need:** understand the technical work of agents without opening another conversation, be able to dig deeper with questions, and keep what was learned to come back to it.
- **Desired visual direction:** a graphical interface where agents, their roles and their communications can be seen; recognizable, attractive avatars; a broad, navigable map.
- **Required interaction:** suggest questions to dig deeper, choose a concise or detailed explanation, and "Mark for review" («Marcar para repasar») through a small icon that is visible when coming back.
- **Validation case:** Burneum was proposed initially; that choice was superseded on 2026-10-10 by D-005. Technical validation uses an authorized controlled task; the later value pilot has no prescribed project.

- **Accepted direction (2026-09-29):** plugin first, reusable web interface and the map's own storage; technical test before broadening the integration. The validation case was amended by D-005 on 2026-10-10. [D-001](10-plugin-direction-and-technical-test.md) keeps the alternatives, reasons, limits and review conditions.

- **Light scope, host and source (2026-10-11, D-007):** the light version is the D-001 walkthrough on Codex in the ChatGPT desktop app, with lifecycle hooks as the event source; a local web with a read-only connector is kept as fallback.

- **Publication (2026-10-11, D-008):** Tramora is **not a commercial product and will not be sold**; it is published as a public, open-source repository on GitHub under the **Apache-2.0** license. The commercial track is retired.

## Proposals still to be validated

- Concrete initial surface, accessible events, permissions and storage for the plugin: pending the D-001 technical test.
- Initial read-only source; importing or connecting events depending on what the environment allows. Agent control postponed.
- Map model with concept, question, decision, result and source nodes.
- B2B value proposition: understandable traceability and useful memory for technical teams.
- Geometric/colourful avatar identity inspired by the references, with original components.

## Product questions

1. Which concrete session source can the first MVP import with sufficient permission and fidelity? *(Resolved on 2026-10-11 by D-007: lifecycle hooks in Codex desktop for the light version.)*
2. Which controlled task and authorized source will serve for technical validation, and which separate case will serve for the later value pilot? *(Partially resolved: the source is set by D-007; the case script is T0-04a and the specific permissions are T0-04b.)*
3. Is the first user someone developing alone with several agents, a small team, or a lead who reviews other people's work?
4. Which parts of the session may a remote model process and which must stay local?
5. Which relationship between map nodes is actually useful: "explains", "depends on", "contradicts", "decided", "derives from"?
6. When should a node be created automatically and when should a human action be required, to avoid a noisy map?
7. What is the minimal gesture to go back to the exact source from a saved explanation?
8. How is it unambiguously indicated that an exchange between agents could not be observed?
9. What permissions and guarantees are required before allowing instructions or approvals to be sent from Tramora?
10. Which licence, packaging and publication strategy apply once product code exists? *(Resolved on 2026-10-11 by D-008: Apache-2.0, published publicly on GitHub, no sale.)*

## Rule for upcoming decisions

Record the chosen option, alternatives, reason, evidence, limits and review condition. If the pilot contradicts a hypothesis, keep it as a learning and update the proposal. The chosen name does not require freezing architecture or design.

## D-002 — Private working files kept out of git (2026-10-09)

**Decision (owner):** the owner's private working material (agent instructions, task backlog, context notes and operational prompts) is kept out of the repository through `.gitignore`. Third-party visual references are not published.
**Reason:** these files describe the owner's personal workflow and tooling, not the product.

## D-003 — Language: code, README and public docs in English (2026-10-09)

**Decision (owner):** code (functions, identifiers and comments), `README.md` and all public documentation in `docs/` are written in **English**, with English file names. A Spanish copy is kept privately. The English public version is the source of truth; both copies are updated in the same change. The prototypes' UI texts are not changed by this decision.

## D-004 — Working materials are not published (2026-10-09)

**Decision (owner):** the concept prototypes (fictional-data demos), the visual references and the design/plan of the demo are working material and stay out of the public repository. The public repository holds the README and the concept documents until product code exists.
**Reason:** for a reader of the finished product they add little value; fictional demos can be mistaken for the real product, and third-party screenshots are not ours to publish.

## D-005 — Validation independent of Burneum (2026-10-10)

**Decision (owner):** Burneum will not be continued and is removed as a required validation project. Replace that dependency with an authorized, controlled technical task: genuinely executed agent activity, test data, identified host/source and explicit capture/privacy/retention permissions. Choose the later value-pilot case separately; it does not block building the initial usable version.
**Reason:** validation must not force work on an abandoned project. The owner approved an actionable staged backlog with objectives, concrete work, deliverables, dependencies and closure evidence. *(The "complete private commercial preparation before any authorized launch" clause is retired by D-008: there is no commercial track.)*
**Alternatives:** only remove the project name, or write an exhaustive specification before resolving host capabilities. The chosen approach details upcoming tasks and keeps later choices explicit.
**Limits:** this changes the validation case and planning structure, not the plugin-first direction, truthfulness/privacy rules or technical success criteria. It does not approve the light scope, choose a host/provider/storage/pricing, authorize another project's real data, or authorize publication/live payments. Technical feasibility, user value and commercial readiness are separate outcomes.
**Review condition:** if the selected host lacks useful visual presence or sufficient authorized events, apply D-001's existing review condition. Revisit the value hypothesis based on measured use, without assigning a new external project by default.

## D-006 — Reviewer effort per model (2026-10-10)

**Decision (owner):** reviewer reasoning effort is set **per model**, not fixed: the contract/independent reviewer model runs at **medium by default**, the mechanical/documented reviewer model at **high by default**, and the higher level for the contract reviewer is a **deterministic escalation only** — the reviewer must show explicitly that a claim cannot be resolved at the default level, and the raised level requires a new session. It is never raised by default, out of caution, or "to be safe".
**Reason:** spend less without lowering the model of any gate; effort is reasoning budget, not the gate's model (`apto` = 0 P0/P1). This closes a discrepancy between the review command and the working policy.
**Limits:** does not change any gate's model, the closure criterion, or the round limits. The session's own model routing remains an owner configuration decision.
**Review condition:** if the review provider changes its effort vocabulary or a valid escalation cannot be served.

## D-007 — Light scope, host and event source (2026-10-11)

**Decision (owner):** the light version is the D-001 walkthrough on a single host and a single authorized source: real activity → avatar and log → contextual question → explanation with source → node saved and marked for review → recovery after reopening. The host is **Codex in the ChatGPT desktop app** and the primary source is **lifecycle hooks** (T0-03 matrix §2), each as a candidate to verify in T1, not a proven capability. The owner also asked that, if a user does not have Codex, a **local web with a read-only connector** be kept, as already anticipated by D-001's review condition.
**Reason:** Codex desktop is the surface where local hook execution is documented (S1/S3/S11) and where native UI entries (thread panel, sidebar) and the built-in browser also appear documented, each from its own source; it is the best candidate to test the walkthrough end to end.
**Alternatives:** ChatGPT Chat/Work with an MCP UI but without documented local hook execution (leaves the capture source unresolved); or falling back to the web with a local connector if the host gives no useful presence. The web and mobile remain a **history/map** surface (D-001), not the seat of the capturer.
**Limits:** this does not prove integration, capture or presence; the T0-03 matrix marks the useful presence and the persistence of the UI as `no documentado` on every surface, so they are hypotheses to measure in T1. It does not authorize capture of real data: the concrete session, source and permissions require T0-04b and the owner's `[MANUAL]` permission. It does not authorize publication.
**Review condition:** if the measured presence is not useful or authorized coverage is insufficient, apply D-001's review condition (local web with connector).

## D-008 — Open publication under Apache-2.0, no commercial track (2026-10-11)

**Decision (owner):** Tramora is **not a commercial product** and **will not be sold**. It is published as a **public, open-source** repository on GitHub under the **Apache-2.0** license. The previously planned commercial track (access, test purchase, webhooks, delivery/email, customer texts, launch) is **retired** as a goal; the concept's commercial hypotheses (a possible buyer, pricing) remain only as context, not as commitments.
**Reason:** the owner wants to publish the project publicly and openly for his GitHub and for community use, without selling it; a permissive open-source license fits that intent.
**Alternatives:** a private repository (discarded: the owner wants it public) or a restrictive/copyleft license (discarded: a permissive license better matches an open, no-friction publication).
**Limits:** this does not lower the truthfulness, privacy or capture rules, which remain in force; it does not authorize capture of real data or another project's data (D-005, T0-04b); it does not convert the technical test or the value pilot into commercial validation. Apache-2.0 applies to product code and public documentation; private working material stays out of git (D-002/D-004). It also removes the earlier tension with the plugin directory's ban on selling digital services (T0-03c): since there is no sale, that restriction no longer applies to Tramora.
**Review condition:** if the owner decides to commercialize later, or if publication raises a licensing question.

## D-009 — Session model for ZCode work (2026-10-11)

**Decision (owner):** the ZCode **main session** and the `general-purpose` subagent run on **DeepSeek at High** effort (the cheap implementation route, as in NHI-reach; never Medium). This closes the last pending routing item of T0-05c. The reviewer effort per model (D-006) is unchanged: Astra `medium` by default, Sol `high` by default, Astra `high` only by deterministic escalation.
**Reason:** it is the cheap implementation route the owner uses and does not spend Codex quota or zrelay on mechanical work.
**Limits:** it is a session-configuration choice; it does not change any gate's model or the closure criterion. The exact provider identifiers are the owner's configuration and are not verified from this session.
**Review condition:** if the owner changes model/provider or the routing policy changes.
