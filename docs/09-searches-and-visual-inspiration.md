# Searches and visual inspiration for Tramora

Starting research: 2026-09-29. Its purpose is to gather **references to study**, not yet to choose a style or copy screens. The owner's recent screenshot of the earlier prototype shows what they want to improve: visible avatars, clear roles and accessible conversation content. The design must explain both the coordination of agents and the person's learning.

## What to search for on X

Queries in English tend to surface more visual projects. Paste these phrases into X search and open the posts with video or screenshots of the product in use:

```text
"AI agent dashboard" UI
"multi agent dashboard" demo
"agent control room" interface
"AI coding agents" dashboard
"agent handoff" visualization
"agent activity feed" UI
"agent trace" visualization
"agent workspace" UI
"AI agent avatars" UI
"knowledge graph" interface
"interactive mind map" AI
"concept map" learning app
```

To narrow down, add terms such as `prototype`, `demo`, `open source`, `Figma`, `video` or the name of a specific problem. If too many trading ads appear, try `-crypto -trading`. It is also worth searching in Spanish for `interfaz agentes IA` (AI agents interface), `mapa de conocimiento interactivo` (interactive knowledge map) and `visualización de agentes` (agent visualization). Save the post **with the author's URL, date and a note on what it solves**; an isolated screenshot loses context.

## Where to look

| Source | Search or link | What to observe for Tramora |
|---|---|---|
| Dribbble | [AI agent dashboard](https://dribbble.com/search/ai-agent-dashboard), [agent avatar](https://dribbble.com/search/agent-avatar), [knowledge graph](https://dribbble.com/tags/knowledge-graph) | Palette, composition, card size and avatar language. Many pieces are static concepts: check whether they allow reading real messages. |
| Behance | [AI agent dashboard design](https://www.behance.net/search/projects/AI%20agent%20dashboard%20design) | Cases with several screens and the author's reasoning; look for empty states, errors and prolonged use. |
| GitHub | [Mission Control](https://github.com/jeturing/mission-control), [Hivemind by zyrakk](https://github.com/zyrakk/hivemind), [Facility](https://github.com/theam/facility) | Screens of an operational product and the relationship between what is shown and the events available. |
| Products | [LangSmith Trajectories](https://www.langchain.com/blog/langsmith-trajectories-tracing), [n8n](https://n8n.io/) | Timelines, traces, handoffs and how one moves from summary to detail. They are functional references and also close solutions. |
| Graphs | [React Flow mind map](https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow), [React Flow showcase](https://reactflow.dev/showcase) | Node expansion, layout, zoom, relationships between branches and recovery of a saved point. |

## Four families of references, not a single screen

Reference added on 2026-09-29: [Jeet's Agent Handoff](https://x.com/jeetnirnejak/status/2086804226777420177) presents four agents, progress and a handoff log. Its author comments that the CSS pulse of the active agent restarted when the card was updated. The page allowed viewing the text and a still image; the video could not be played from this session. In Tramora it inspires a room where movement depends on events and animation lives in stable elements, without copying the visual design.

1. **Agent room:** who is working, waiting or reviewing; color and avatar that help recognize the role without becoming decoration. Search for `multi agent control room UI`, `AI team workspace dashboard` and `agent roster UI`.
2. **Conversations and handoffs:** who asked what of whom, when and with what outcome. Search for `agent-to-agent conversation UI`, `agent handoff timeline` and `agent execution trace UI`. A visual link must open the message or event that justifies it.
3. **Contextual explanation:** a simple sentence, an example and technical detail when opened further; visible source and a distinction between fact and inference. Search for `explainable AI interface`, `progressive disclosure technical UI` and `AI answer citations UX`.
4. **Map to return to:** readable nodes, search, collapsible branches, history, review marker and return to the source. Search for `interactive knowledge map UI`, `concept map learning app` and `visual knowledge base UI`.

## Criteria for saving a reference

Next to each link, answer: "What function is understood immediately?", "What concrete gesture would I take for Tramora?", "What breaks if there are 100 agents/events or 500 nodes?", "Is observed data distinguished from a generated narrative?" and "Is it accessible without relying solely on color?". Prioritize videos and demos with interaction over a single flawless mockup. Reproduce principles (hierarchy, density, navigation) with our own components; respect licenses and authorship.

## Initial visual direction to explore

The `code.markets` screenshot suggests a **dark panel, feed and memorable characters**; the image of colored shapes suggests a simple family of agents. The prototype screenshot suggests **role cards on top and conversation below**. Tramora's own direction could use a compact, light room, with a work thread in the center and the learning map to one side; reserve strong color for identifying agents and states, and a small review symbol that is also recognizable without color. It must be tested with long content, errors and small screens before settling on it.
