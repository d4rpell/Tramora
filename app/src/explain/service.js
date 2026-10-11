'use strict';

const {
  PROVENANCE,
  CONTENT_CLASS,
  CLAIM_TYPE,
} = require('../core/contracts');

const TYPE_LABELS = Object.freeze({
  [CLAIM_TYPE.OBSERVED_FACT]: 'observed fact',
  [CLAIM_TYPE.INTERPRETATION]: 'interpretation',
  [CLAIM_TYPE.ILLUSTRATIVE_EXAMPLE]: 'illustrative example',
  [CLAIM_TYPE.OPEN_QUESTION]: 'open question',
});

const SUGGESTIONS = [
  'What is this step doing and why?',
  'Why was this approach chosen over an alternative?',
  'What could go wrong with this result?',
];

function buildClaims(event, depth) {
  const claims = [
    {
      type: CLAIM_TYPE.OBSERVED_FACT,
      text: `${event.actor || 'unknown'} performed ${event.kind} "${event.source_event}" at ${event.observed_at || 'unknown time'}.`,
      source_refs: [{ type: 'event', id: event.id, session: event.session_id }],
    },
  ];
  for (const [key, value] of Object.entries(event.payload || {})) {
    claims.push({
      type: CLAIM_TYPE.OBSERVED_FACT,
      text: `Observed payload field "${key}" has value "${typeof value === 'string' ? value : JSON.stringify(value)}".`,
      source_refs: [{ type: 'event', id: event.id, session: event.session_id }],
    });
  }
  if (depth !== 'brief') {
    claims.push({
      type: CLAIM_TYPE.INTERPRETATION,
      text: 'This step advances the session, but the intent behind it is an interpretation, not an observed fact.',
      source_refs: [],
    });
    if (depth === 'detailed') {
      claims.push({
        type: CLAIM_TYPE.OPEN_QUESTION,
        text: 'The broader effect of this step on the project outcome is not yet observable.',
        source_refs: [],
      });
    }
  }
  return claims;
}

function buildText(questionText, depth, event, claims) {
  const lines = [`Explanation for "${questionText}" (depth: ${depth}).`];
  lines.push(`Event: ${event.actor || 'unknown'} — ${event.source_event} (${event.kind}) at ${event.observed_at || 'unknown'}.`);
  for (const claim of claims) lines.push(`- [${TYPE_LABELS[claim.type]}] ${claim.text}`);
  return lines.join('\n');
}

/**
 * Builds an `Explanation` for the event referenced by `question`.
 * Generation is **local** (rule-based over the already-redacted stored context);
 * it never sends anything remotely. Remote sending (the `remoteSend` path)
 * is a separate operation gated by explicit permission and is not used here.
 */
function generateExplanation({ db, ops, question, generatedBy, now = () => new Date().toISOString() }) {
  const event = ops.getEvent(db, question.event_ref);
  if (!event) return { blocked: true, reason: `event ${question.event_ref} not found` };
  if (event.session_id !== question.session_ref) return { blocked: true, reason: 'question/event session mismatch' };

  const claims = buildClaims(event, question.depth);
  const explanation = {
    id: `exp::${question.id}`,
    question_ref: question.id,
    text: buildText(question.text, question.depth, event, claims),
    depth: question.depth,
    shown_at: now(),
    claims,
    context_ref: `${question.task_ref}/${question.session_ref}/${question.event_ref}`,
    project_revision: event.source_ref || null,
    generated_by: generatedBy || 'local-rules',
    provenance: PROVENANCE.GENERATED,
    content_class: CONTENT_CLASS.OUTCOME,
  };
  return { explanation };
}

module.exports = { generateExplanation, buildClaims, buildText, SUGGESTIONS };