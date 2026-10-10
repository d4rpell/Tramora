# Decisions, hypotheses and open questions

Started: 2026-09-29. Updated: 2026-10-10. This log keeps proposals made during ideation from being mistaken for confirmed decisions.

## Confirmed by the owner

- **Name:** Tramora. The owner states that they have reserved it on GitHub; the URL and availability have not been independently verified.
- **Need:** understand the technical work of agents without opening another conversation, be able to dig deeper with questions, and keep what was learned to come back to it.
- **Desired visual direction:** a graphical interface where agents, their roles and their communications can be seen; recognizable, attractive avatars; a broad, navigable map.
- **Required interaction:** suggest questions to dig deeper, choose a concise or detailed explanation, and "Mark for review" («Marcar para repasar») through a small icon that is visible when coming back.
- **Validation case:** Burneum was proposed initially; that choice was superseded on 2026-10-10 by D-005. Technical validation uses an authorized controlled task; the later value pilot has no prescribed project.

- **Accepted direction (2026-09-29):** plugin first, reusable web interface and the map's own storage; technical test before broadening the integration. The validation case was amended by D-005 on 2026-10-10. [D-001](10-plugin-direction-and-technical-test.md) keeps the alternatives, reasons, limits and review conditions.

## Proposals still to be validated

- Concrete initial surface, accessible events, permissions and storage for the plugin: pending the D-001 technical test.
- Initial read-only source; importing or connecting events depending on what the environment allows. Agent control postponed.
- Map model with concept, question, decision, result and source nodes.
- B2B value proposition: understandable traceability and useful memory for technical teams.
- Geometric/colourful avatar identity inspired by the references, with original components.

## Product questions

1. Which concrete session source can the first MVP import with sufficient permission and fidelity?
2. Which controlled task and authorized source will serve for technical validation, and which separate case will serve for the later value pilot?
3. Is the first user someone developing alone with several agents, a small team, or a lead who reviews other people's work?
4. Which parts of the session may a remote model process and which must stay local?
5. Which relationship between map nodes is actually useful: "explains", "depends on", "contradicts", "decided", "derives from"?
6. When should a node be created automatically and when should a human action be required, to avoid a noisy map?
7. What is the minimal gesture to go back to the exact source from a saved explanation?
8. How is it unambiguously indicated that an exchange between agents could not be observed?
9. What permissions and guarantees are required before allowing instructions or approvals to be sent from Tramora?
10. Which licence, packaging and publication strategy apply once product code exists?

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
**Reason:** validation must not force work on an abandoned project. The owner approved an actionable staged backlog with objectives, concrete work, deliverables, dependencies and closure evidence, followed by complete private commercial preparation before any authorized launch.
**Alternatives:** only remove the project name, or write an exhaustive specification before resolving host capabilities. The chosen approach details upcoming tasks and keeps later choices explicit.
**Limits:** this changes the validation case and planning structure, not the plugin-first direction, truthfulness/privacy rules or technical success criteria. It does not approve the light scope, choose a host/provider/storage/pricing, authorize another project's real data, or authorize publication/live payments. Technical feasibility, user value and commercial readiness are separate outcomes.
**Review condition:** if the selected host lacks useful visual presence or sufficient authorized events, apply D-001's existing review condition. Revisit the value hypothesis based on measured use, without assigning a new external project by default.
