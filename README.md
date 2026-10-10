# Tramora

**Status: product concept.** Working document last updated on 10 October 2026. Two concept prototypes with fictional data were built internally and are not part of this repository: they do not connect to agents, do not run tasks and do not yet prove the product's usefulness.

> Follow what your agents build. Understand their decisions. Keep what you learn.

Tramora is a proposed visual application for people who build software with AI agents. It brings together the observable work of the agents, the explanations a person needs to direct them, and a persistent map of what they have explored. Its purpose is to let you come back days later to a question, a decision or a change and recover its context without rereading several conversations.

The name **Tramora** was chosen by the owner. The concept documentation is versioned in [the Tramora repository](https://github.com/d4rpell/Tramora). Domain and trademark availability have not been checked.

## Why it exists

While working on Ariadne with AI, the owner noticed that agents used technical vocabulary and methods that they often explained as if talking to each other. To understand a decision they had to open another chat, ask, and then rebuild the working context. They wanted a more transparent, lighter experience. Later they added two requirements of their own: seeing visually how agents communicate, and keeping a map of questions and explanations to return to. Burneum was initially suggested as a test case; the owner withdrew it on 10 October 2026 because that project will not be continued. Tramora no longer depends on it.

## Proposed experience

1. **Agent room.** Stable visual identities, each agent's assignment, observed status and messages between agents. Every communication link must have a source message or event; an interpretation is shown as an interpretation.
2. **Contextual companion.** For a concept or a decision it offers two or three relevant questions. The person picks a short, example-based or more detailed explanation, and can write their own question.
3. **Personal map.** Keeps questions, explanations, examples, sources, links to decisions and review marks. Shows the current branch and lets you recover others without turning the whole history into an unreadable graph.
4. **Informed decision.** For a relevant decision it explains what the agent is asking, why, what changes with each option and what remains open. The human answer is sent back to the worker when the integration allows it, and then checked against what the worker did.
5. **Resuming work.** When opening the project days later, the person finds a decision or concept, sees the explanation that helped them then, and can tell whether its concrete application to the project has changed.

The colourful avatars and the activity panel take as visual reference the first two screenshots provided by the owner; a third screenshot shows the prototype on screen. They are kept locally and are not part of this repository. Those images are references, not Tramora brand material nor evidence of implemented features.

## What is in this repository

- [`docs/01-context-and-opportunity.md`](docs/01-context-and-opportunity.md): origin, initial user, potential buyer and value proposition.
- [`docs/02-experience.md`](docs/02-experience.md): screens, interactions, questions, map and decisions.
- [`docs/03-data-and-truthfulness.md`](docs/03-data-and-truthfulness.md): event model, provenance and rules for never inventing communications.
- [`docs/04-architecture-and-integrations.md`](docs/04-architecture-and-integrations.md): plugin, reusable web interface, event capture and evolution towards SaaS.
- [`docs/05-mvp-and-roadmap.md`](docs/05-mvp-and-roadmap.md): phases and observable criteria.
- [`docs/06-validation-protocol.md`](docs/06-validation-protocol.md): controlled technical validation and a later value pilot, without a required external project.
- [`docs/07-research-and-positioning.md`](docs/07-research-and-positioning.md): Facility, Hivemind, related solutions and sources.
- [`docs/08-decisions-and-questions.md`](docs/08-decisions-and-questions.md): explicit agreements, pending recommendations and open questions.
- [`docs/09-searches-and-visual-inspiration.md`](docs/09-searches-and-visual-inspiration.md): searches for X and other galleries, current examples and criteria for saving references.
- [`docs/10-plugin-direction-and-technical-test.md`](docs/10-plugin-direction-and-technical-test.md): decision D-001 (plugin first) and the technical test criteria.

## Recommended first scope

The first useful version would focus on a work session from a single environment, messages and actions that are actually available, explanations with sources, suggested questions and a map that survives the end of the session. Next would come sending clarifications back to the worker and checking its answer. The team view and other connectors would come after value is verified in individual use.

**Direction accepted on 2026-09-29: plugin first**, with a reusable web interface and its own storage for the map. The next step is to test visual presence, real activity and learning recovery in an identified environment using an authorized controlled task. A later value pilot will select its own case; no external project is required ([D-005](docs/08-decisions-and-questions.md#d-005--validation-independent-of-burneum-2026-10-10)). The integration is not implemented yet. [Decision D-001 and test criteria](docs/10-plugin-direction-and-technical-test.md).

## Success criterion

Tramora must help direct work better. The pilot would observe whether the owner opens fewer side chats, understands a decision before answering, finds the message behind an explanation, and can pick up a question days later without rebuilding the whole conversation. These benefits have not been measured yet.

## References and inspiration

[The Agile Monkeys](https://github.com/theam), creators of [Facility](https://github.com/theam/facility), are a product and architecture reference for Tramora. Facility's documented approach informs four design ideas: persistent task context across agent sessions, an overview for returning to work, a timeline connecting activity with results, and shared data and operations across the web interface and MCP.

Tramora will adapt these ideas to contextual explanations and a personal learning map, using only authorized, observable activity. They remain design directions to validate in the first working integration.

See [research and positioning](docs/07-research-and-positioning.md) for other references. Sources reviewed on 9 October 2026.
