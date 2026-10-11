'use strict';

const state = {
  events: [],
  selectedEventId: null,
  lastExplanation: null,
  depth: 'brief',
  coverage: 'unknown',
  permission: false,
  captureEnabled: true,
};

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

async function api(path, options) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  return response.json();
}

async function refreshState() {
  const [st, ev] = await Promise.all([api('/api/state'), api('/api/events')]);
  state.coverage = st.coverage;
  state.permission = st.permission;
  state.captureEnabled = st.captureEnabled;
  state.events = ev.events || [];
  renderRoom();
  document.getElementById('coverage').textContent = `coverage: ${st.coverage}`;
  const toggle = document.getElementById('capture-toggle');
  toggle.textContent = state.captureEnabled ? 'capture: on' : 'capture: off';
  toggle.setAttribute('aria-pressed', String(state.captureEnabled));
}

function renderEvent(event) {
  const node = el('article', `event ${event.kind}`);
  node.dataset.eventId = event.id;
  node.tabIndex = 0;
  node.setAttribute('role', 'button');
  node.setAttribute('aria-label', `event ${event.id}: ${event.kind} ${event.source_event}`);
  if (event.id === state.selectedEventId) node.classList.add('selected');

  const head = el('div', 'event-head');
  const actor = el('span', 'actor');
  const avatar = el('span', 'avatar', (event.actor || '?').slice(0, 1).toUpperCase());
  actor.append(avatar, document.createTextNode(escapeHtml(event.actor || 'unknown')));
  head.append(actor);

  const kind = el('span', 'kind', `${event.kind} · ${event.source_event}`);
  head.append(kind);
  if (event.observed_at) head.append(el('span', 'time', new Date(event.observed_at).toLocaleTimeString()));
  if (event.identity_confidence === 'uncertain') head.append(el('span', 'conf', 'identity uncertain'));

  const hasSecret = JSON.stringify(event.payload || {}).includes('[redacted]') ||
    JSON.stringify(event.payload || {}).includes('TRAMORA_TEST_SECRET');
  if (hasSecret) head.append(el('span', 'secret-flag', 'redacted'));

  node.append(head);

  const body = el('div', 'event-body', JSON.stringify(event.payload || {}, null, 2));
  node.append(body);

  if (event.kind === 'delegation' && !event.recipient) {
    node.append(el('div', 'event-gap', 'gap: delegation without observed sender/receiver'));
  }
  if (event.status === 'unknown_coverage') {
    node.append(el('div', 'event-gap', 'coverage unknown'));
  }

  const select = () => {
    state.selectedEventId = event.id;
    renderRoom();
    configureQuestion(event);
  };
  node.addEventListener('click', select);
  node.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select();
    }
  });

  return node;
}

function renderRoom() {
  const room = document.getElementById('room');
  room.textContent = '';
  if (!state.events.length) {
    room.append(el('p', 'hint', 'No observed events yet. Coverage declared in the header.'));
    return;
  }
  for (const event of state.events) room.append(renderEvent(event));
}

function renderLog() {
  const log = document.getElementById('log');
  log.textContent = '';
  for (const event of state.events) {
    const item = el('li');
    item.append(document.createTextNode(`${event.observed_at || '—'}  ${event.actor || 'unknown'}  ${event.kind}  ${event.source_event}  [src:${event.source || 'none'}]`));
    log.append(item);
  }
  if (!state.events.length) log.append(el('li', 'hint', 'No events.'));
}

function configureQuestion(event) {
  const input = document.getElementById('question-text');
  if (!event) {
    input.disabled = true;
    return;
  }
  input.disabled = false;
  input.setAttribute('aria-label', `Ask about event ${event.id}`);
  const suggestions = document.getElementById('suggestions');
  suggestions.textContent = '';
  for (const suggestion of [
    'What did this step do?',
    'Why was this approach chosen?',
    'What could go wrong?',
  ]) {
    const btn = el('button', 'suggestion', suggestion);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      input.value = suggestion;
      submitQuestion(event);
    });
    suggestions.append(btn);
  }
}

function renderMap(nodes, marked) {
  const map = document.getElementById('map');
  map.textContent = '';
  const markedIds = new Set(marked.map((m) => m.node_ref));
  for (const node of nodes) {
    const card = el('div', 'node');
    const title = el('h3', null, node.title);
    const meta = el('div', 'meta',
      `${node.kind} · v${node.content_version} · schema v${node.schema_version} · ${node.project_revision || 'no revision'}`);
    card.append(title, meta);
    if (node.previous_version_id) card.append(el('div', 'meta', `previous version kept: ${node.previous_version_id}`));
    if (markedIds.has(node.id)) {
      const mark = el('span', 'marked', 'review marked');
      card.append(mark);
    }
    const actions = el('div', 'map-actions');
    const toggleMark = el('button', null, markedIds.has(node.id) ? 'unmark' : 'mark');
    toggleMark.type = 'button';
    toggleMark.addEventListener('click', async () => {
      await api('/api/mark', { method: 'POST', body: JSON.stringify({ nodeId: node.id, on: !markedIds.has(node.id), markedBy: 'local' }) });
      refreshMap();
    });
    actions.append(toggleMark);
    card.append(actions);
    map.append(card);
  }
  if (!nodes.length) map.append(el('p', 'hint', 'No saved nodes yet.'));
}

async function refreshMap() {
  const { nodes } = await api('/api/nodes');
  const { marked } = await api('/api/map-marked');
  renderMap(nodes, marked);
}

async function submitQuestion(event, explicitText, depth) {
  const text = explicitText || document.getElementById('question-text').value.trim();
  const selectedDepth = depth || document.querySelector('input[name="depth"]:checked').value;
  if (!text || !event) return;
  const response = await api('/api/ask', {
    method: 'POST',
    body: JSON.stringify({ eventRef: event.id, text, depth: selectedDepth }),
  });
  const out = document.getElementById('explanation');
  out.textContent = '';
  if (response.error) {
    out.append(el('p', 'event-gap', `error: ${escapeHtml(response.error)}`));
    return;
  }
  if (response.blocked) {
    out.append(el('p', 'event-gap', `blocked: ${escapeHtml(response.blocked)}. No remote sending without permission.`));
    return;
  }
  state.lastExplanation = response.explanation;
  out.append(el('h3', null, 'Explanation'));
  out.append(el('p', null, response.explanation.text));
  const note = el('p', 'notice', `provenance: ${response.explanation.provenance} · generated by ${escapeHtml(response.explanation.generated_by)} · source: ${escapeHtml(response.explanation.context_ref)}`);
  out.append(note);
  for (const claim of response.explanation.claims || []) {
    const claimEl = el('div', 'claim', `[${claim.type}] ${claim.text}`);
    if (claim.source_refs && claim.source_refs.length) {
      const src = el('span', 'src', ' sources: ' + claim.source_refs.map((s) => escapeHtml(s.id)).join(', '));
      claimEl.append(src);
    }
    out.append(claimEl);
    if (claim.type === 'open_question') {
      const askBtn = el('button', 'suggestion', 'navigate to evidence');
      askBtn.type = 'button';
      askBtn.addEventListener('click', () => openEvidence(event));
      claimEl.append(askBtn);
    }
  }
}

function openEvidence(event) {
  const dialog = document.getElementById('evidence-dialog');
  const body = document.getElementById('evidence-body');
  body.textContent = '';
  body.append(el('h4', null, `Event ${event.id}`));
  body.append(el('p', null, `session: ${event.session_id}`));
  body.append(el('p', null, `kind: ${event.kind} · source_event: ${event.source_event}`));
  body.append(el('p', null, `actor: ${event.actor || 'unknown'} · observed_at: ${event.observed_at || 'unknown'}`));
  body.append(el('h4', null, 'Payload (redacted)'));
  body.append(el('pre', 'export', JSON.stringify(event.payload, null, 2)));
  body.append(el('p', 'event-gap', `source_ref: ${event.source_ref || 'gap'}`));
  dialog.showModal();
}

function renderReturnSection(containerId, rows) {
  const container = document.getElementById(containerId);
  const list = container.querySelector('.return-rows');
  list.textContent = '';
  if (!rows.length) {
    list.append(el('p', 'return-empty', 'No items.'));
    return;
  }
  for (const row of rows) list.append(row);
}

function renderReturn(data) {
  renderReturnSection('return-overview', renderOverviewRows(data.overview));
  renderReturnSection('return-recent', renderRecentRows(data.recent));
  renderReturnSection('return-pending', renderPendingRows(data.pending));
  renderReturnSection('return-marked', renderMarkedRows(data.marked));
  renderReturnSection('return-proposals', renderProposalRows(data.reviewProposals));
}

function renderOverviewRows(overview) {
  const rows = [];
  for (const task of overview.tasks || []) {
    const row = el('div', 'return-row');
    row.append(el('span', 'label', `task: ${task.title || task.id}`));
    row.append(el('span', 'tag', `status: ${task.status}`));
    row.append(el('span', 'tag', `project: ${task.project_ref || '—'}`));
    rows.push(row);
  }
  for (const session of overview.sessions || []) {
    const row = el('div', 'return-row');
    row.append(el('span', 'label', `session: ${session.id}`));
    row.append(el('span', 'tag', `source: ${session.source}`));
    const state = session.session_closure === 'closed'
      ? 'closed'
      : (session.last_turn_finished ? 'no session closure observed · last turn finished' : 'no session closure observed');
    row.append(el('span', 'state', state));
    rows.push(row);
  }
  return rows;
}

function renderRecentRows(events) {
  return (events || []).map((event) => {
    const row = el('div', 'return-row');
    row.append(el('span', 'tag', `${event.observed_at || '—'}  ${event.actor || 'unknown'}  ${event.kind}  ${event.source_event}`));
    if (event.identity_confidence === 'uncertain') row.append(el('span', 'limit', 'identity uncertain'));
    const btn = el('button', null, 'evidence');
    btn.type = 'button';
    btn.addEventListener('click', () => openEvidence(event));
    row.append(btn);
    return row;
  });
}

function renderPendingRows(pending) {
  const rows = [];
  for (const p of pending.pendingResults || []) {
    const row = el('div', 'return-row');
    row.append(el('span', 'label', `${p.action.actor || 'unknown'} · ${p.action.source_event}`));
    row.append(el('span', 'state', p.label));
    if (p.closureSignal) row.append(el('span', 'tag', `closing signal: ${p.closureSignal.source_event || p.closureSignal.kind}`));
    const btn = el('button', null, 'event');
    btn.type = 'button';
    const event = state.events.find((e) => e.id === p.action.id);
    if (event) btn.addEventListener('click', () => openEvidence(event));
    else btn.disabled = true;
    row.append(btn);
    rows.push(row);
  }
  for (const s of pending.sessions || []) {
    const row = el('div', 'return-row');
    row.append(el('span', 'label', `session: ${s.id}`));
    row.append(el('span', 'state', s.last_turn_finished ? 'no session closure observed · last turn finished' : 'no session closure observed'));
    rows.push(row);
  }
  for (const g of pending.gaps || []) {
    const row = el('div', 'return-row');
    row.append(el('span', 'label', `coverage gap: ${g.id}`));
    row.append(el('span', 'limit', 'coverage unknown'));
    rows.push(row);
  }
  return rows;
}

function renderMarkedRows(marked) {
  return (marked || []).map((m) => {
    const row = el('div', 'return-row');
    row.append(el('span', 'label', `marked: ${m.node_ref}`));
    row.append(el('span', 'tag', `at ${m.marked_at || '—'} by ${m.marked_by || '—'}`));
    if (m.context_ref) row.append(el('span', 'tag', `context: ${m.context_ref}`));
    const btn = el('button', null, 'node');
    btn.type = 'button';
    btn.addEventListener('click', async () => {
      const { nodes } = await api('/api/nodes');
      const node = nodes.find((n) => n.id === m.node_ref);
      if (!node) return;
      openNodeEvidence(node);
    });
    row.append(btn);
    return row;
  });
}

function openNodeEvidence(node) {
  const dialog = document.getElementById('evidence-dialog');
  const body = document.getElementById('evidence-body');
  body.textContent = '';
  body.append(el('h4', null, `Node ${node.id}`));
  body.append(el('p', null, `kind: ${node.kind} · v${node.content_version} · schema v${node.schema_version} · ${node.project_revision || 'no revision'}`));
  body.append(el('p', null, node.title));
  if (node.body) body.append(el('p', null, node.body));
  if (node.previous_version_id) {
    const prevBtn = el('button', null, 'show previous version');
    prevBtn.type = 'button';
    prevBtn.addEventListener('click', async () => {
      const previous = await api(`/api/node-version?id=${encodeURIComponent(node.previous_version_id)}`);
      body.append(el('p', 'event-gap', `previous version (${previous.project_revision || 'no revision'}): ${previous.title}`));
      if (previous.body) body.append(el('p', null, previous.body));
      if (previous.sources && previous.sources.length) body.append(el('p', 'event-gap', `sources: ${previous.sources.join(', ')}`));
    });
    body.append(prevBtn);
  }
  dialog.showModal();
}

function renderProposalRows(proposals) {
  return (proposals || []).map((p) => {
    const row = el('div', 'return-row');
    row.append(el('span', 'label', `review this node: ${p.title || p.node_id}`));
    row.append(el('span', 'tag', `revision ${p.previous.project_revision || '—'} → ${p.project_revision || '—'}`));
    const btn = el('button', null, 'previous version');
    btn.type = 'button';
    btn.addEventListener('click', async () => {
      const previous = await api(`/api/node-version?id=${encodeURIComponent(p.previous.version_id)}`);
      const dialog = document.getElementById('evidence-dialog');
      const body = document.getElementById('evidence-body');
      body.textContent = '';
      body.append(el('h4', null, `Previous version of ${p.node_id}`));
      body.append(el('p', null, `revision: ${previous.project_revision || '—'}`));
      body.append(el('p', null, previous.title));
      if (previous.body) body.append(el('p', null, previous.body));
      if (previous.sources && previous.sources.length) body.append(el('p', 'event-gap', `sources: ${previous.sources.join(', ')}`));
      dialog.showModal();
    });
    row.append(btn);
    return row;
  });
}

async function refreshReturn() {
  const data = await api('/api/return-overview');
  renderReturn(data);
}

function bindTabs() {
  const tabButtons = document.querySelectorAll('.tab');
  tabButtons.forEach((btn) => {
    btn.type = 'button';
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      document.querySelectorAll('.view').forEach((v) => (v.hidden = true));
      document.getElementById(`tab-${target}-view`).hidden = false;
    });
  });
}

function bindTheme() {
  const toggle = document.getElementById('theme-toggle');
  const applyTheme = (dark) => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.textContent = dark ? 'theme: dark' : 'theme: light';
  };
  const stored = localStorage.getItem('tramora-theme');
  if (stored === 'dark') applyTheme(true);
  toggle.type = 'button';
  toggle.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    applyTheme(dark);
    localStorage.setItem('tramora-theme', dark ? 'dark' : 'light');
  });
}

function bindForm() {
  document.getElementById('question-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const selected = state.events.find((ev) => ev.id === state.selectedEventId);
    submitQuestion(selected);
  });
  document.getElementById('map-save').addEventListener('click', async () => {
    const notice = document.getElementById('map-save-notice');
    if (!state.lastExplanation) {
      notice.textContent = 'No explanation to save yet. Ask a question first.';
      return;
    }
    const event = state.events.find((ev) => ev.id === state.selectedEventId);
    const node = {
      id: `node::${Date.now()}`,
      kind: 'concept',
      title: state.lastExplanation.text.split('\n')[0],
      body: state.lastExplanation.text,
      question_ref: state.lastExplanation.question_ref,
      explanation_ref: state.lastExplanation.id,
      project_revision: state.lastExplanation.project_revision,
      sources: [event.id],
    };
    await api('/api/node', { method: 'POST', body: JSON.stringify(node) });
    notice.textContent = `Saved node ${node.id}.`;
    refreshMap();
  });
  document.getElementById('map-list-marked').addEventListener('click', async () => {
    const { marked } = await api('/api/map-marked');
    const map = document.getElementById('map');
    map.textContent = '';
    if (!marked.length) map.append(el('p', 'hint', 'No marked nodes.'));
    for (const m of marked) {
      const node = (await api('/api/nodes')).nodes.find((n) => n.id === m.node_ref);
      if (!node) continue;
      const card = el('div', 'node');
      card.append(el('h3', null, node.title));
      card.append(el('div', 'meta', `marked at ${m.marked_at} by ${m.marked_by}`));
      map.append(card);
    }
  });
  document.getElementById('map-export').addEventListener('click', async () => {
    const response = await fetch('/api/export');
    const out = document.getElementById('export-out');
    out.hidden = false;
    out.textContent = await response.text();
  });
}

function bindCapture() {
  document.getElementById('capture-toggle').addEventListener('click', async (event) => {
    const wantOn = event.target.getAttribute('aria-pressed') !== 'true';
    await api('/api/capture', { method: 'POST', body: JSON.stringify({ enabled: wantOn }) });
    refreshState();
  });
}

async function init() {
  bindTabs();
  bindTheme();
  bindForm();
  bindCapture();
  document.getElementById('evidence-dialog').addEventListener('click', (event) => {
    if (event.target === document.getElementById('evidence-dialog')) document.getElementById('evidence-dialog').close();
  });
  await refreshState();
  renderLog();
  refreshMap();
  refreshReturn();
}

init();