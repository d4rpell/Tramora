# Proposed pilot with Burneum

The owner proposed testing Tramora while progressing with Burneum. In this conversation **the repository, the domain and a specific Burneum task have not been defined**. This document is a test protocol; it does not attribute specific characteristics or problems to that project.

## Technical test before the value pilot

The plugin-first direction is accepted in [D-001](10-plugin-direction-and-technical-test.md). Before measuring usefulness, verify in the chosen environment: an integrated panel while working, real events with a source, contextual explanation, persistent node and review mark, and recovery on reopening. Record which communications cannot be observed; do not confuse this test with the fictional demo or with the value pilot described below.

## Preparation

Choose a real Burneum task that requires collaboration or several technical decisions and that can be shared with Tramora without exposing private data. Record before starting: goal, participating tools/agents, observable source, completion criteria and questions that are hard to answer today. If the source does not allow recording messages between agents, the test must evaluate the observed work and label the gaps; do not fill them with fiction.

Prepare two comparable runs, one with the usual workflow and another with Tramora, or at least a descriptive baseline of the usual workflow. Choose concrete questions before testing to avoid declaring success after seeing the results. Neutral examples: "What decision did the reviewer agent make?", "What source did it rely on?", "What was left pending?", "Can I find the explanation a week later?".

## Test sequence

1. Import or connect an authorized Burneum session.
2. Identify a decision that raises a genuine technical question. Note how long the user takes to understand it without Tramora and with Tramora, without penalizing an honest answer of "there is not enough evidence".
3. Open the short explanation, expand it with an example or detail and verify the origin of each important claim.
4. Follow a suggested question and ask another free-form one. Check whether both remain in the context of the decision and not in an isolated chat.
5. Save a node in the map and mark it for review. Close the session and come back after several days via the marker.
6. Compare what was remembered with the source record. Ask whether the map made it easier to resume the work and what was confusing or excessive.

## What to measure

- Time to a useful explanation and number of window/conversation switches.
- Correct answers about the decision, source, alternative and limitations; distinguish perceived confidence from actual accuracy.
- Percentage of important claims with a navigable source; rate of "unknown" correctly declared.
- Time to find a marked concept again after 3–7 days.
- Suggested questions used versus ignored, and map nodes saved versus revisited.
- Free-form comments: when the UI helps, when it distracts and which data could not be observed.

The goal of the pilot is to falsify or improve the value hypothesis. If people understand the decision just as quickly with the usual workflow, or do not return to the map, the product must change before expanding integrations. Do not claim time savings until they have been measured.

## Limits

The current prototype uses an invented story about repeated payments. **It is not a Burneum session.** Before importing real data, decide on permissions, privacy and the retention policy for that source. Avoid secrets and client or employer material.
