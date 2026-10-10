# References and provisional positioning

Research carried out during ideation up to 2026-09-29. It describes capabilities visible in public sources, not a functional audit nor a claim that there is no competition. Pages and products may change.

## User's references

- [Facility, by The Agile Monkeys](https://github.com/theam/facility): a reference for coordinating the work of agents/workers in the software lifecycle, with stories and activity. The usable idea is that workers are observable and have work context. Tramora should focus on **the person's understanding** at the moment of a decision and on later recovery of that learning. The identification of "Simplify" with Facility was tentative in the conversation.
- [zyrakk/hivemind](https://github.com/zyrakk/hivemind): a Go orchestrator with a planner, agent engines, Codex workers, persistence and a dashboard. Its projects/tasks/workers/events structure and its questions to the operator are good model and UX references. The observed view does not demonstrate a complete transcript of all dialogues between agents; Tramora must respect the real scope of each source. The repository indicated a license to be defined when consulted: learn patterns, do not copy code or assets.
- Screenshots shared by the owner (kept privately): a dark agent panel with avatars and a feed; a collection of colorful geometric characters. They inspire visual hierarchy and identities; they do not validate technical capabilities nor authorize reuse of the artwork.

## Overlaps that require precision

- [LangSmith Trajectories](https://www.langchain.com/blog/langsmith-trajectories-tracing) adds a readable chronological view of messages and actions from sessions with subagents, on top of more detailed traces. It is a clear overlap with "seeing what the agents did". The product was announced on 2026-09-24 according to the page consulted. Tramora must not sell trajectory visualization as an exclusive novelty.
- [n8n](https://n8n.io/) offers a visual canvas of workflows and agents with inspectable steps and human-in-the-loop. Tramora does not initially need to compete as a workflow builder.
- [React Flow](https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow) shows that an interactive map is a known pattern and component; differentiation does not lie in drawing nodes.
- There are other agent dashboards, for example [Mission Control](https://github.com/jeturing/mission-control), that show states and activity. Their concrete promises must be verified when comparing products, but they reinforce that a grid of agents on its own is not enough.

## Differentiation hypothesis to validate

Tramora joins six moments in one experience: **observed fact → contextual question → explanation with source and adjustable depth → possible human decision → observed outcome → recoverable memory**. Its focus is the developer who wants to understand and remember what the agents did while building, not merely to monitor an execution or draw a workflow. This combination must be tested with users through a separately chosen value pilot; it is not claimed that nobody offers it.

## Design inspiration to review later

The curated searches and links are in [09-searches-and-visual-inspiration.md](09-searches-and-visual-inspiration.md). It is worth comparing real screens and walkthroughs, not just promotional screenshots. For each reference, note what problem it solves, what part would be useful in Tramora and what part would produce noise.
