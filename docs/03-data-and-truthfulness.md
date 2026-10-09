# Data, provenance and truthfulness

This document proposes a conceptual contract, not a ratified schema or an implementation.

## Minimum observable information

To build the Room, it would initially be enough to have project, session, observed participants, tasks, available messages, events and artifacts. An event should keep, when available, a stable identifier, type, timestamp, actor, recipient, task, status and a reference to the original source. A file change, command output, test or review is recorded as an artifact with its provenance.

Observed messages and generated conclusions are stored as distinct classes. A sentence like "Reviewer asked to fix X" («Revisor pidió corregir X») requires the review message. If we only know that the task changed to "pending review" («pendiente de revisión»), Tramora can show that status, but not attribute words to the reviewer.

## Explanation record

Each stored explanation needs:

- The person's exact question or the selected suggestion.
- Text shown, chosen depth and the moment it was shown.
- Main concept and links to other concepts.
- Context of the project and task it applied to.
- Specific source or sources: message, document excerpt, code diff or test.
- Type of claim: observed fact, interpretation, illustrative example or open question.
- The person's status: explored, understood according to their own indication, or marked for review.
- Relevant version or revision of the project when the explanation describes its current state.

The map is not a free copy of the agent's history. It is a navigable index of the person's understanding, linked to the evidence that could be observed. Records can be private even if the project decision they point to is shareable.

## States that must not be confused

A **proposal** is something the agent wants to do. A **human decision** is an explicit response from the person. An **acknowledgment** indicates that the worker received the clarification. An **observed result** is backed by artifacts or checks. These milestones do not substitute for one another.

Likewise, "message not captured" is distinguished from "message does not exist", "not yet verified" from "failed", and "the person opened the explanation" from "the person understood". The interface must declare the scope of what it was able to observe in each connector.

## Map updates

A general conceptual explanation may remain useful even if the code changes. A record that states "this project does X" must be tied to a revision or source. If a modification affects the record, the system proposes reviewing it and keeps the previous version with its context. It does not silently rewrite what the person saw and decided.

## Privacy and separation

The first prototype should capture only authorized sessions and paths. Before storing or sending content to a model, the connector must apply the inclusion and redaction rules defined for the project. Personal maps and review marks belong to each user. In a team version, selected decisions or explanations would be shared, with explicit permissions. Understanding marks would not be used as an employee score.

