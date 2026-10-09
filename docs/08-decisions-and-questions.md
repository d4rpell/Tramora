# Decisions, hypotheses and open questions

Date: 2026-09-29. This log keeps proposals made during ideation from being mistaken for confirmed decisions.

## Confirmed by the owner

- **Name:** Tramora. The owner states that they have reserved it on GitHub; the URL and availability have not been independently verified.
- **Need:** understand the technical work of agents without opening another conversation, be able to dig deeper with questions, and keep what was learned to come back to it.
- **Desired visual direction:** a graphical interface where agents, their roles and their communications can be seen; recognizable, attractive avatars; a broad, navigable map.
- **Required interaction:** suggest questions to dig deeper, choose a concise or detailed explanation, and "Mark for review" («Marcar para repasar») through a small icon that is visible when coming back.
- **Desired test:** use Burneum as a validation case as work on that project progresses.

- **Accepted direction (2026-09-29):** plugin first, reusable web interface and the map's own storage; technical test with Burneum before broadening the integration. [D-001](10-plugin-direction-and-technical-test.md) keeps the alternatives, reasons, limits and review conditions.

## Proposals still to be validated

- Concrete initial surface, accessible events, permissions and storage for the plugin: pending the D-001 technical test.
- Initial read-only source; importing or connecting events depending on what the environment allows. Agent control postponed.
- Map model with concept, question, decision, result and source nodes.
- B2B value proposition: understandable traceability and useful memory for technical teams.
- Geometric/colourful avatar identity inspired by the references, with original components.

## Product questions

1. Which concrete session source can the first MVP import with sufficient permission and fidelity?
2. Which Burneum task and tools will serve for the pilot?
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
