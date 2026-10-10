# Proposed architecture and integrations

Status: **product direction accepted; technical details pending validation**. The owner confirmed prioritizing the plugin on 2026-09-29; this does not establish host capabilities or an implementation.

## Product form

**Direction accepted on 2026-09-29: plugin first**, with a reusable web interface and its own storage for the map. The first test must verify the visual presence and the capture of real events on a specific ChatGPT/Codex surface. The experience aims to accompany programming with avatars and logs, explain in context and expand to the map without losing the work.

The previous proposal of local web first and plugin later is superseded in priority. It is kept as an alternative if the integration does not allow a useful experience. The web remains a surface for the history and the full map. The event source, permissions and specific storage remain pending. See [D-001: decision, alternatives and technical test](10-plugin-direction-and-technical-test.md).

## Data flow

```text
User-selected source
  → importer/connector with minimum permissions
  → original events preserved with provenance
  → normalization (agent, action, message, artifact, time)
  → projections: room, timeline and relationships
  → explanations and suggested questions, tied to sources
  → personal map of concepts, questions, decisions and review
```

Event capture and the explanation service are separate boundaries. The importer must not ask a model to reconstruct unobserved conversations. If the source only reports that a worker finished a task, the UI shows that fact and its scope; it does not draw an imagined dialogue between agents. When an explanation infers intent or consequences, it is labeled as an interpretation. Observed data and generated answers must also remain distinguishable when exporting.

Minimum model: `Project`, `Session`, `Agent`, `Event`, `Artifact`, `Question`, `Explanation`, `MapNode`, `MapEdge` and `ReviewMark`. Each event keeps an identifier, source, timestamp, subject, type, available content and a reference to the original. An explanation keeps version, question, cited events/artifacts, depth level, uncertainties and date. A review mark points to a stable map node and to the context that prompted the mark. The concrete schema will be decided when implementing the first importer.

## Explanation experience

When an agent action is selected, Tramora gathers verifiable context (available messages, diff, task, decision or result), formulates a brief explanation and offers to expand in layers: "in one sentence" («en una frase»), "with example" («con ejemplo»), "in depth" («a fondo»). The interface proposes questions that help understand a decision or risk, for example "Why this alternative?" («¿Por qué esta alternativa?»), "What remains to be checked?" («¿Qué falta comprobar?») and "What would happen if it fails?" («¿Qué pasaría si falla?»). It should explain first in plain language and reveal technical terms when the user asks for detail.

Suggested questions are hypotheses of interest, not facts. The user can ignore them, edit them or ask others. Each answer must offer "view origin" («ver origen») to jump to the event or artifact and "save to map" («guardar en mapa») if it deserves to remain. If there is not enough context, Tramora says so and asks for the missing piece.

## Permissions and privacy

The prototype can store everything locally with SQLite, without sending code or sessions to a server. If a remote model is used, the UI must show which fragments are shared and ask for configuration consent. Import must allow excluding paths, secrets and personal data; it is advisable to limit file size and type. A future enterprise mode would require isolation by team/project, role-based access, configurable retention and action logging.

Directing agents from Tramora is a later and separate capability: approving an action or sending an instruction requires an unambiguous link to the correct agent/session, explicit permission and confirmation of the result. A notification that something "was sent" («se envió») does not mean the agent executed it.

## Agreed build order

First verify in a real integration the path activity → explanation with source → persistent map, using an authorized controlled task in an identified environment ([D-005](08-decisions-and-questions.md#d-005--validation-independent-of-burneum-2026-10-10)). No other active project is required. The initial capture will have the minimum necessary permissions and will not direct agents. Importing a session can help test provenance and persistence, but it does not demonstrate live observation. Afterwards, expand providers, SaaS collaboration or bidirectional control according to evidence of usefulness. Criteria and limits in D-001.
