# D-001 — Prioritize integration as a plugin

Date: 2026-09-29. Status: **product direction accepted by the owner; technical feasibility pending testing**.

## Agreement

The owner accepts the proposal to first test Tramora inside the working environment through a plugin, while keeping a reusable web interface and its own storage for the map. Confirmation: "Indeed, I think it's really cool like this, so that's how we'll do it" («Efectivamente pues me parece una chulada asi, por lo que lo hacemo asi»).

The target experience combines a compact panel with animated avatars and latest actions, contextual explanations with selectable depth, suggested questions and an expandable map with review marks. The web keeps its value for browsing the full history. What was learned with the demos is reused; they remain simulations with no real connection.

## Context and alternatives

The previous proposal was to start with a local web application and a read-only importer, leaving the plugin for later. It is kept here as an alternative that was considered and superseded in priority, not as a demonstrated technical failure. Another alternative was to depend entirely on a provider-exclusive interface; it is discarded for now in order to keep the map and reuse the interface across compatible surfaces.

The accepted option reduces the need to switch conversations to understand the work. It makes it possible to validate Tramora's central hypothesis with Burneum early and to keep presentation, activity capture and memory separate. No SDK, model provider, database, deployment or exact initial ChatGPT/Codex surface has been chosen yet.

## Available evidence and limits

Official documentation consulted on 2026-09-29:

- [Plugin architecture](https://developers.openai.com/plugins/concepts/plugins): directory shared by ChatGPT and Codex; capabilities depend on the environment.
- [MCP interface](https://developers.openai.com/plugins/build/chatgpt-ui): web components embedded in ChatGPT and portability to compatible hosts. It does not establish the same interface across all Codex surfaces.
- [Visual modes](https://developers.openai.com/plugins/concepts/ui-guidelines): inline, expanded screen and picture-in-picture during a session in ChatGPT. It does not guarantee a global panel or persistence outside the session.
- [Packaging and hooks](https://developers.openai.com/plugins/build/plugins): integration mechanisms subject to availability, installation and trust in the execution environment.

Installing the plugin does not grant automatic access to all conversations, messages or subagents. Capture must use a documented and authorized source. Every activity or communication animation must correspond to an observed event. Generated explanations are distinguished from original messages and are not presented as the agent's internal thinking.

Durable storage of the map must be independent of the lifetime of the visual component. Its local or remote location, permissions and retention policy remain open. This acceptance is not equivalent to an implemented integration, publication in a directory, activation of hooks or authorization to upload private data.

## First technical test with Burneum

1. Identify Burneum's specific repository, task and environment with the owner; they are not yet recorded in these documents.
2. Show the component inside a compatible surface and check its behavior while work continues and when closing/reopening.
3. Capture a real action and its result; if the source exposes a delegation between agents, also show that exchange with provenance. Record the events that are not available.
4. Complete the flow: real activity → avatar and log → contextual question → explanation with source → node saved and marked for review → recovery after reopening.
5. Record observed capabilities, permissions, event loss/duplication and limitations. The subsequent value pilot measures understanding and recovery after several days.

The technical test passes if it demonstrates the full flow in an identified environment, preserves provenance and recovers the map. An animation demo alone does not pass it. If communications between agents are not observed, that capability is explicitly left pending.

## Review conditions

Reopen the priority if the host does not allow a useful visual presence, does not expose enough authorized activity or imposes restrictions that prevent saving/recovering the map. In that case, consider the web with a local connector, preserving the components and the record of what was verified. Also review based on real usage: distraction, quality of explanations and usefulness of the map when resuming Burneum.
