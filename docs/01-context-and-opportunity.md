# Context and opportunity

## Origin of the problem

The owner was looking for an AI project with real usefulness for technology companies, attractive enough for his GitHub and LinkedIn. He rejected several ideas because they looked too much like existing startups or were simple auxiliary tools without a clear company problem. The starting point he did care about came from his work with Ariadne: when AI organizes a project, it uses terms, methods and decisions that it does not always explain to the person directing the work. The person ends up asking in another chat, loses time and may accept something without understanding its consequences.

The visual inspiration came from two screenshots: an agent panel with avatars, activity and messages, and a collection of geometric characters with faces. The owner asked to be able to see how the agents communicate. He then added that Tramora should propose possible questions to dig deeper, let the user choose between a concise and a detailed answer, and build a large but retrievable map of everything explored. Finally, he asked for a small marker on the map for the points he wants to review.

The owner mentioned The Agile Monkeys and believed the reference project was Facility. This is a provisional identification; his interest was in combining AI workers with more human understanding, not in reproducing their product.

## Problem Tramora would address

A session with agents may contain tasks, discussions, code changes and results, but the person needs to be able to answer more concrete questions with sound judgment:

- What is each agent doing, and which message triggered the next step?
- What does this term mean here, in my project?
- Where does this rule come from: my instructions, an external source, or a proposal by the agent?
- What am I accepting when I choose an option, and what remains pending?
- What did I ask last time, and which explanation helped me?
- Was the decision I made reflected in the observable work?

An explanation detached from its source can sound convincing and be wrong. A flashy interface that only shows statuses does not solve the problem either. Tramora's hypothesis lies in connecting **observed work → question → explanation with source → human decision → verifiable result → retrievable memory**.

## Users

The first user would be the owner while developing his projects. Other possible users are developers, technical leads, security professionals and product managers who direct work in areas outside their specialty. This does not assume they know little about programming: an expert may need clarification about a new domain or a methodology introduced by an agent.

Tramora is **not a commercial product and will not be sold** ([D-008](08-decisions-and-questions.md#d-008--open-publication-under-apache-20-no-commercial-track-2026-10-11)); it is published as an open-source project. An earlier working hypothesis about a buyer and the value for a technology company (reducing the time a manager needs to reconstruct delegated decisions) is kept below only as **context for the problem**, not as a business commitment or a claim about who would pay.

*Historical hypothesis (not a current commitment):* for a technology company, the value would be reducing the time a manager needs to reconstruct the decisions of delegated work and improving the quality of the clarifications they send back to the agents. Engineering or platform leads would be plausible interpreters of that value. Who would pay, how much, or how often the problem occurs was never validated.

## Prudent positioning

Facility already coordinates agent work and shows activity, statuses, results and human interventions. Other tools offer code explanations, decision memories or contextual questions. Tramora cannot base its differentiation on claiming that none of those features exist. Its specific bet would be to make the complete cycle of understanding and directing the work fluid, with a personal map that keeps explanations and evidence so the person can return to them.

The visual value of the avatars depends on them representing real responsibilities and facts. The value of the AI depends on the explanations enabling better action. Both must be tested in real sessions.

