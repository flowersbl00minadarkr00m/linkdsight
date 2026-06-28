/**
 * LinkdSight Local-First – Application shell and all view rendering.
 * Imports CSS, wires events, and manages state.
 */

import './styles.css';
import { transform, validateParsed } from './transform.js';
import { parseExportZip } from './import.js';
import { generateSampleData } from './sample-data.js';
import { buildContextPacket } from './context-packet.js';
import {
  localInsight, getAISettings, saveAISettings, clearAISecrets,
  AI_PROVIDER_PRESETS, askAI, testAIConnection
} from './advisor.js';
import { saveSnapshot, loadSnapshot, deleteAllData, exportData } from './storage.js';
import {
  fmt, pct, initials, escapeHtml, shortDate, ageLabel, COLORS
} from './utils.js';

/* ── State ────────────────────────────────────────────── */
let appData = null;
let state = {
  view: 'overview',
  relationshipFilter: 'stale',
  mapMode: 'company',
  goals: ['AI & Technology', 'Board & Nonprofit', 'Resources'],
  careerLedgerFilter: 'all',
  objective: 'Risk, technology and governance leadership opportunities',
  selectedTopic: '',
  selectedCluster: null,
  graphNodes: [],
  aiEnabled: false
};

const VIEW_META = {
  overview: ['Network intelligence', 'Overview'],
  network: ['Composition & concentration', 'Network map'],
  relationships: ['Attention allocation', 'Relationships'],
  lab: ['Derived relationship signals', 'Intelligence'],
  content: ['Publishing & engagement', 'Content ledger'],
  identity: ['Career narrative', 'Identity shift'],
  career: ['Job-search actions', 'Opportunity paths'],
  snapshots: ['Longitudinal analysis', 'Snapshots']
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ── Bootstrap ────────────────────────────────────────── */
function init() {
  state.aiEnabled = Boolean(getAISettings().enabled);
  renderShell();
  wireAppEvents();
  updateAdvisorLabel();
  // Check for saved snapshot
  loadSnapshot('latest').then(snapshot => {
    if (snapshot && snapshot.data) {
      setData(snapshot.data, snapshot.exportDate || 'unknown');
    }
  }).catch(() => {});
}

function renderShell() {
  document.getElementById('app').innerHTML = `
    <!-- Import Screen -->
    <div class="import-screen" id="importScreen">
      <div class="import-card">
        <span class="brand">LinkdSight Local</span>
        <h1>Import your LinkedIn export</h1>
        <p>Select or drag in your LinkedIn data ZIP. Everything stays in your browser.</p>
        <div class="drop-zone" id="dropZone">
          <input type="file" accept=".zip" id="zipInput" aria-label="Select LinkedIn export ZIP">
          <div class="dz-text"><span class="dz-icon">📁</span>Drop your LinkedIn ZIP here or click to browse</div>
        </div>
        <div id="importStatus"></div>
        <button class="secondary-button try-sample" id="trySample">Try sample data</button>
        <div class="privacy-strip">
          <span class="dot"></span>No upload, no accounts, no trackers.
          <span class="dot"></span>Local analysis only.
        </div>
      </div>
    </div>

    <!-- App Shell -->
    <div class="app-shell" id="appShell">
      <aside class="sidebar" id="sidebar">
        <div class="brand-row">
          <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
          <div><strong>LINKDSIGHT</strong><small>LOCAL</small></div>
        </div>
        <nav>
          <button class="nav-item active" data-view="overview"><span class="nav-icon">⌂</span>Overview</button>
          <button class="nav-item" data-view="network"><span class="nav-icon">◎</span>Network map</button>
          <button class="nav-item" data-view="relationships"><span class="nav-icon">↔</span>Relationships</button>
          <button class="nav-item" data-view="lab"><span class="nav-icon">✦</span>Intelligence</button>
          <button class="nav-item" data-view="content"><span class="nav-icon">▤</span>Content ledger</button>
          <button class="nav-item" data-view="identity"><span class="nav-icon">◇</span>Identity shift</button>
          <button class="nav-item" data-view="career"><span class="nav-icon">⌁</span>Opportunity paths</button>
          <button class="nav-item" data-view="snapshots"><span class="nav-icon">◫</span>Snapshots</button>
        </nav>
        <div class="sidebar-section">
          <span class="eyebrow">Data controls</span>
          <button class="text-button" id="saveData">Save to browser</button>
          <button class="text-button" id="exportData" style="margin-left:8px">Export JSON</button>
          <button class="text-button" id="resetData" style="margin-left:8px;color:#b24020">Reset all data</button>
        </div>
        <div class="privacy-note"><span class="status-dot"></span><div><strong>Local only</strong><small>No data leaves this browser</small></div></div>
      </aside>

      <main>
        <header class="topbar">
          <button class="icon-button mobile-only" id="menuButton" aria-label="Open navigation">☰</button>
          <div class="topbar-title"><span class="eyebrow" id="viewEyebrow">Network intelligence</span><h1 id="viewTitle">Overview</h1></div>
          <div class="topbar-actions">
            <span class="export-pill" id="exportDatePill"><span class="status-dot"></span>No data</span>
            <button class="icon-button" id="settingsButton" aria-label="Settings" title="Settings">⚙</button>
            <button class="primary-button" id="reimportButton">Import new</button>
          </div>
        </header>

        <div class="page-wrap" id="pageWrap"></div>
      </main>

      <!-- Advisor Panel -->
      <aside class="assistant-panel" id="assistantPanel">
        <div class="assistant-head">
          <div><span class="assistant-mark">✦</span><div><strong id="advisorLabel">Local Insights</strong><small id="advisorSubLabel">Deterministic · offline</small></div></div>
          <button class="icon-button" id="closeAssistant" aria-label="Close advisor">×</button>
        </div>
        <div class="assistant-context"><span class="status-dot"></span><span id="advisorContext">No data loaded</span></div>
        <div class="chat" id="chatMessages"><div class="chat-empty">Ask about your network or profile. Analysis stays local.</div></div>
        <div class="prompt-chips" id="promptChips">
          <button>Where is my network thin?</button>
          <button>Who should I reconnect with?</button>
          <button>Who can bridge me to a target company?</button>
          <button>How has my identity shifted?</button>
          <button>How can I improve my profile?</button>
        </div>
        <form class="chat-form" id="chatForm"><textarea id="chatInput" rows="2" placeholder="Ask about your network or profile"></textarea><button type="submit" class="send-button" aria-label="Send">↑</button></form>
        <small class="assistant-footnote">Local analysis. Verify recommendations before acting.</small>
      </aside>
      <button class="advisor-fab" id="openAssistant"><span>✦</span>Ask LinkdSight</button>
    </div>

    <!-- Modal -->
    <div class="modal-backdrop hidden" id="modalBackdrop">
      <section class="modal" role="dialog" aria-modal="true">
        <div class="modal-head"><h2 id="modalTitle">Settings</h2><button class="icon-button" id="closeModal" aria-label="Close">×</button></div>
        <div class="modal-body" id="modalBody"></div>
      </section>
    </div>
  `;
}

/* ── Data Loading ──────────────────────────────────────── */
function setData(data, sourceLabel) {
  appData = data;
  if (data.conversationTopics?.length) {
    state.selectedTopic = data.conversationTopics[0].name;
  }
  document.getElementById('importScreen').style.display = 'none';
  document.getElementById('appShell').classList.add('active');
  document.getElementById('exportDatePill').innerHTML = `<span class="status-dot"></span>${escapeHtml(sourceLabel || data.exportDate || 'loaded')}`;
  document.getElementById('advisorContext').textContent = `Analyzing ${data.exportDate || 'data'} snapshot`;
  renderPage();
}

async function handleZipFile(file) {
  const status = document.getElementById('importStatus');
  status.className = 'import-status loading';
  status.textContent = 'Parsing ZIP archive...';

  try {
    const { parsed, report } = await parseExportZip(file);
    status.textContent = 'Transforming data...';

    const data = transform(parsed);
    status.className = 'import-status success';
    status.innerHTML = `Import complete. ${fmt(data.totals.connections)} connections, ${fmt(data.totals.messages)} messages.<br><div class="import-report"><strong>Files found:</strong><ul>${report.found.map(f => `<li class="found">${escapeHtml(f.name)} (${f.count} records)</li>`).join('')}${report.missing.length ? `<li class="missing">Missing: ${report.missing.join(', ')}</li>` : ''}</ul></div>`;

    setData(data, file.name);
    return data;
  } catch (err) {
    status.className = 'import-status error';
    status.textContent = `Import failed: ${err.message}`;
    console.error(err);
    return null;
  }
}

async function loadSample() {
  const status = document.getElementById('importStatus');
  status.className = 'import-status loading';
  status.textContent = 'Generating synthetic sample dataset...';

  const parsed = generateSampleData();
  const data = transform(parsed, '2026-06-28');
  status.className = 'import-status success';
  status.textContent = 'Sample dataset loaded. Explore all views with synthetic data.';
  setData(data, 'Sample dataset');
}

/* ── Page Rendering ────────────────────────────────────── */
function renderPage() {
  const wrap = document.getElementById('pageWrap');
  wrap.innerHTML = `
    <!-- Overview -->
    <section class="view active" id="overviewView">
      <div class="insight-banner" id="insightBanner"></div>
      <div class="metric-grid" id="metricGrid"></div>
      <div class="two-column wide-left">
        <section class="panel"><div class="panel-head"><div><span class="eyebrow">Ten-year view</span><h3>Connection velocity</h3></div></div><div class="chart-frame"><svg id="growthChart" role="img" aria-label="Connections added by month"></svg></div></section>
        <section class="panel"><div class="panel-head"><div><span class="eyebrow">Concentration</span><h3>Professional domains</h3></div></div><div id="domainBars" class="bar-list"></div></section>
      </div>
      <div class="two-column">
        <section class="panel"><div class="panel-head"><div><span class="eyebrow">Attention needed</span><h3>Relationships going stale</h3></div></div><div id="stalePreview" class="person-list"></div></section>
        <section class="panel"><div class="panel-head"><div><span class="eyebrow">Strategic gap</span><h3>Goal coverage</h3></div></div><div id="goalCoverage"></div></section>
      </div>
    </section>

    <!-- Network -->
    <section class="view" id="networkView">
      <div class="view-intro"><div><h2>Where your network clusters</h2><p id="mapIntro"></p></div><div class="segmented"><button class="active" data-map-mode="company">Company</button><button data-map-mode="domain">Domain</button></div></div>
      <div class="map-layout">
        <section class="panel graph-panel"><canvas id="networkCanvas"></canvas><div class="map-key"><span><i class="teal"></i>Core</span><span><i class="coral"></i>Emerging</span><span><i class="gold"></i>Under target</span></div></section>
        <aside class="panel focus-panel"><span class="eyebrow">Selected cluster</span><h3 id="clusterName">-</h3><div class="cluster-stat"><strong id="clusterCount">0</strong><span>connections</span></div><div class="progress"><span id="clusterShareBar"></span></div><p id="clusterDescription"></p><dl id="clusterDetails"></dl></aside>
      </div>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">Top organizations</span><h3>Concentration ledger</h3></div><input class="search-input" id="companySearch" placeholder="Search organizations"></div><div class="data-table" id="companyTable"></div></section>
    </section>

    <!-- Relationships -->
    <section class="view" id="relationshipsView">
      <div class="view-intro"><div><h2>Relationship management</h2><p>Prioritize relationships based on history, reciprocity, relevance, and time since contact.</p></div><div class="filter-row"><button class="chip active" data-rel-filter="stale">Reconnect</button><button class="chip" data-rel-filter="active">Most active</button><button class="chip" data-rel-filter="imbalanced">Low reciprocity</button></div></div>
      <div class="metric-strip" id="relationshipMetrics"></div>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">Relationship ledger</span><h3 id="relationshipTableTitle">Reconnect queue</h3></div><input class="search-input" id="relationshipSearch" placeholder="Search"></div><div class="data-table relationship-table" id="relationshipTable"></div></section>
    </section>

    <!-- Intelligence Lab -->
    <section class="view" id="labView">
      <div class="view-intro lab-intro"><div><span class="eyebrow">Local inference workspace</span><h2>Conversation intelligence</h2><p>Explore what you discuss, where those conversations live, and which relationship may merit attention next.</p></div><span class="inference-tag">Keyword classified</span></div>
      <div class="lab-topic-filters" id="topicFilters"></div>
      <div class="lab-primary-grid">
        <section class="panel topic-graph-panel"><div class="panel-head"><div><span class="eyebrow">Conversation Topic Graph</span><h3 id="topicGraphTitle">-</h3></div><span class="lab-count" id="topicGraphCount"></span></div><div class="topic-graph-scroll"><svg id="topicGraph" viewBox="0 0 760 410" role="img"></svg></div><p class="lab-method-note">Edges mean messages matched the selected topic rules.</p></section>
        <section class="panel next-conversation-panel"><div class="panel-head"><div><span class="eyebrow">Next Best Conversation</span><h3>Topic, trust and timing</h3></div><span class="inference-tag">Inferred</span></div><div id="nextConversations" class="next-conversation-list"></div></section>
      </div>
      <section class="panel authority-panel"><div class="panel-head"><div><span class="eyebrow">Private-public authority gap</span><h3>Visible, learned or evidenced</h3></div><div class="signal-legend"><span><i class="private"></i>Private</span><span><i class="public"></i>Public</span><span><i class="learning"></i>Learning</span><span><i class="evidence"></i>Evidence</span></div></div><div id="authoritySignals" class="authority-signals"></div></section>
    </section>

    <!-- Content -->
    <section class="view" id="contentView">
      <div class="view-intro"><div><h2>Your content and interaction ledger</h2><p>Separate what you publish from what the export cannot observe.</p></div></div>
      <div class="metric-grid content-metrics" id="contentMetrics"></div>
      <div class="coverage-callout"><span class="callout-icon">!</span><div><strong>Inbound reaction data is not present in this export</strong><p id="coverageNote"></p></div></div>
      <div class="two-column wide-right">
        <section class="panel"><div class="panel-head"><div><span class="eyebrow">Engagement posture</span><h3>Interactions you initiated</h3></div></div><div id="engagementDonut" class="donut-wrap"></div></section>
        <section class="panel"><div class="panel-head"><div><span class="eyebrow">Recent publishing</span><h3>Post archive</h3></div></div><div id="postArchive" class="post-list"></div></section>
      </div>
    </section>

    <!-- Identity -->
    <section class="view" id="identityView">
      <div class="view-intro"><div><h2>How your professional identity shifted</h2><p>Role progression and publishing themes.</p></div></div>
      <section class="identity-hero"><span class="eyebrow">Observed shift</span><h2 id="identityThesis">-</h2><p>This is an inference from position history and publishing language, not a claim about how others perceive you.</p></section>
      <div class="two-column wide-left">
        <section class="panel"><h3>Role progression</h3><div id="careerTimeline" class="timeline"></div></section>
        <section class="panel"><h3>Publishing themes by year</h3><div id="identityChart" class="identity-chart"></div></section>
      </div>
    </section>

    <!-- Opportunity Paths -->
    <section class="view" id="careerView">
      <div class="view-intro career-intro"><div><span class="eyebrow">Job-search decision system</span><h2>Turn relationship history into the next right action</h2></div></div>
      <section class="search-objective-bar"><div><span class="eyebrow">Active objective</span><strong id="activeObjective"></strong></div></section>
      <div class="metric-grid career-metrics" id="careerMetrics"></div>
      <div class="two-column career-top-grid" id="careerTopGrid"></div>
      <div class="two-column career-signal-grid" id="careerSignalGrid"></div>
      <section class="panel career-ledger-panel"><div class="panel-head"><div><span class="eyebrow">Decision ledger</span><h3 id="careerLedgerTitle">Priority actions</h3></div><div class="filter-row"><button class="chip active" data-career-ledger="all">Priority</button><button class="chip" data-career-ledger="pulse">Cooling</button><button class="chip" data-career-ledger="advocates">Advocates</button><button class="chip" data-career-ledger="reentry">Re-entry</button></div></div><div class="data-table career-ledger" id="careerLedger"></div></section>
    </section>

    <!-- Snapshots -->
    <section class="view" id="snapshotsView">
      <div class="view-intro"><div><h2>Snapshot comparison</h2><p>Turn periodic exports into a longitudinal record.</p></div></div>
      <section class="snapshot-empty"><h2>Your baseline is ready</h2><p>Import a later export to calculate velocity, drift, and identity shifts.</p></section>
    </section>
  `;

  // Render current view
  renderAllViews();
  setView('overview');
  wireViewEvents();
}

function renderAllViews() {
  if (!appData) return;
  renderOverview();
  renderNetwork();
  renderRelationships();
  renderIntelligenceLab();
  renderContent();
  renderIdentity();
  renderCareer();
}

/* ── Overview ──────────────────────────────────────────── */
function renderOverview() {
  const d = appData;
  const top = d.companies?.[0];
  const topDomain = d.domains?.[0];
  const latestYear = (d.growth || []).filter(x => x.month.startsWith('2025')).reduce((s, x) => s + x.count, 0);

  document.getElementById('insightBanner').innerHTML = `
    <div><span class="eyebrow">Your graph at a glance</span><h2>Your network is anchored in ${escapeHtml(topDomain?.name || 'Unknown')}, with ${escapeHtml(top?.name || 'Unknown')} as its largest organizational cluster.</h2><p>${escapeHtml(top?.name || '')} represents ${top?.share || 0}% of your first-degree connections. Your stated growth areas are less represented, creating a concrete agenda for where to direct attention next.</p></div>
    <button class="secondary-button" data-jump="network">Explore the map →</button>
  `;

  const cards = [
    ['First-degree connections', d.totals?.connections, `${latestYear} added during 2025`, '◎', 'trend-up'],
    ['Active relationships', d.totals?.activeRelationships, 'Two or more direct messages', '↔', ''],
    ['Reconnect candidates', d.totals?.staleRelationships, 'Established relationships now quiet', '◷', 'trend-warn'],
    ['Published posts', d.totals?.shares, `${fmt(d.totals?.comments)} comments made`, '▤', '']
  ];
  document.getElementById('metricGrid').innerHTML = cards.map(([label, value, note, icon, cls]) =>
    `<article class="metric-card"><span class="label">${label}<i class="metric-icon">${icon}</i></span><strong>${fmt(value)}</strong><small class="${cls}">${note}</small></article>`
  ).join('');

  renderGrowthChart();
  renderDomainBars();
  renderStalePreview();
  renderGoalCoverage();
}

function renderGrowthChart() {
  const svg = document.getElementById('growthChart');
  if (!svg) return;
  const d = appData;
  const byQuarter = new Map();
  (d.growth || []).forEach(item => {
    const [year, month] = (item.month || '').split('-').map(Number);
    if (!year || !month) return;
    const q = `${year}-Q${Math.ceil(month / 3)}`;
    byQuarter.set(q, (byQuarter.get(q) || 0) + item.count);
  });
  const points = Array.from(byQuarter, ([label, value]) => ({ label, value }));
  if (!points.length) { svg.innerHTML = ''; return; }

  const w = 760, h = 220, pad = { l: 32, r: 10, t: 12, b: 26 };
  const max = Math.max(...points.map(x => x.value), 1);
  const x = i => pad.l + i * (w - pad.l - pad.r) / Math.max(1, points.length - 1);
  const y = v => h - pad.b - v / max * (h - pad.t - pad.b);

  const coords = points.map((p, i) => ({ x: x(i), y: y(p.value) }));
  const line = coords.map((pt, i) => `${i ? 'L' : 'M'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x},${h - pad.b} L${coords[0].x},${h - pad.b} Z`;

  const grid = [0, .25, .5, .75, 1].map(r =>
    `<line class="grid-line" x1="${pad.l}" y1="${y(max * r)}" x2="${w - pad.r}" y2="${y(max * r)}"/><text class="axis-text" x="0" y="${y(max * r) + 3}">${Math.round(max * r)}</text>`
  ).join('');

  const labels = points.map((p, i) => i % Math.max(1, Math.floor(points.length / 8)) === 0
    ? `<text class="axis-text" text-anchor="middle" x="${x(i)}" y="${h - 6}">${p.label.slice(0, 4)}</text>` : ''
  ).join('');

  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = `${grid}<path class="growth-area" d="${area}"/><path class="growth-line" d="${line}"/>${labels}`;
}

function renderDomainBars() {
  const el = document.getElementById('domainBars');
  if (!el) return;
  const domains = (appData.domains || []).slice(0, 5);
  const max = domains[0]?.count || 1;
  el.innerHTML = domains.map((item, i) =>
    `<div class="bar-row"><div class="bar-row-head"><span>${escapeHtml(item.name)}</span><span>${fmt(item.count)} · ${item.share}%</span></div><div class="progress"><span style="width:${item.count / max * 100}%;background:${COLORS[i % COLORS.length]}"></span></div></div>`
  ).join('');
}

function renderStalePreview() {
  const el = document.getElementById('stalePreview');
  if (!el) return;
  el.innerHTML = (appData.staleRelationships || []).slice(0, 4).map(p =>
    `<div class="person-row"><span class="avatar">${initials(p.name)}</span><div class="person-meta"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.company)} · ${p.total} messages</small></div><span class="days-tag">${ageLabel(p.daysSince)}</span></div>`
  ).join('');
}

function renderGoalCoverage() {
  const el = document.getElementById('goalCoverage');
  if (!el) return;
  const domainMap = Object.fromEntries((appData.domains || []).map(x => [x.name, x]));
  const targets = [12, 6, 8];
  el.innerHTML = state.goals.map((goal, i) => {
    const item = domainMap[goal] || { count: 0, share: 0 };
    const target = targets[i] || 8;
    const status = item.share >= target ? 'On target' : `${(target - item.share).toFixed(1)} pts below`;
    return `<div class="goal-coverage-row"><div><strong>${escapeHtml(goal)}</strong><small>${fmt(item.count)} connections · ${status}</small><div class="progress"><span style="width:${Math.min(100, item.share / target * 100)}%;background:${COLORS[i]}"></span></div></div><div class="coverage-value">${item.share}%</div></div>`;
  }).join('');
}

/* ── Network Map ───────────────────────────────────────── */
function renderNetwork() {
  const d = appData;
  document.getElementById('mapIntro').innerHTML = `Company and domain concentration across <span data-total="connections">${fmt(d.totals?.connections)}</span> first-degree connections.`;
  renderCompanyTable();
  setTimeout(() => drawNetwork(), 100);
}

function renderCompanyTable(query = '') {
  const rows = (appData.companies || []).filter(x => x.name.toLowerCase().includes((query || '').toLowerCase()));
  const max = appData.companies?.[0]?.count || 1;
  const el = document.getElementById('companyTable');
  if (!el) return;
  el.innerHTML = `<div class="table-row table-head"><div class="table-cell">Organization</div><div class="table-cell">Connections</div><div class="table-cell">Share</div><div class="table-cell">Concentration</div></div>` +
    rows.map((item, i) => `<div class="table-row"><div class="table-cell"><strong>${escapeHtml(item.name)}</strong><small>${i < 6 ? 'Core cluster' : 'Extended network'}</small></div><div class="table-cell">${fmt(item.count)}</div><div class="table-cell">${item.share}%</div><div class="table-cell"><div class="table-meter"><span style="width:${item.count / max * 100}%"></span></div></div></div>`).join('');
}

function seeded(i) {
  const x = Math.sin(i * 999 + 17) * 10000;
  return x - Math.floor(x);
}

function makeGraphNodes(width, height) {
  const source = state.mapMode === 'company'
    ? (appData.companies || []).slice(0, 16)
    : (appData.domains || []);
  const max = Math.max(...source.map(x => x.count), 1);
  return source.map((item, i) => {
    const angle = i * 2.399;
    const radius = i === 0 ? 0 : 58 + Math.sqrt(i) * 45;
    const cx = width / 2 + Math.cos(angle) * radius * (width > height ? 1.25 : .8) + (seeded(i) - .5) * 30;
    const cy = height / 2 + Math.sin(angle) * radius * .78 + (seeded(i + 2) - .5) * 22;
    return { item, x: cx, y: cy, r: 18 + Math.sqrt(item.count / max) * 44, color: COLORS[i % COLORS.length] };
  });
}

function drawNetwork() {
  const canvas = document.getElementById('networkCanvas');
  if (!canvas || !canvas.offsetWidth) return;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.offsetWidth, height = canvas.offsetHeight;
  canvas.width = width * ratio; canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);

  state.graphNodes = makeGraphNodes(width, height);
  ctx.strokeStyle = '#d7dce1'; ctx.lineWidth = 1;
  for (let i = 1; i < state.graphNodes.length; i++) {
    const node = state.graphNodes[i];
    const parent = state.graphNodes[Math.max(0, Math.floor((i - 1) / 3))];
    ctx.beginPath(); ctx.moveTo(parent.x, parent.y); ctx.lineTo(node.x, node.y); ctx.stroke();
  }

  state.graphNodes.forEach((node, i) => {
    ctx.beginPath();
    ctx.fillStyle = node.color + (i ? 'dd' : 'f0');
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(9, Math.min(12, node.r / 3))}px Segoe UI, sans-serif`;
    const label = node.item.name.length > 18 ? node.item.name.slice(0, 16) + '…' : node.item.name;
    ctx.fillText(label, node.x, node.y - 3);
    ctx.font = '9px Segoe UI, sans-serif'; ctx.fillText(fmt(node.item.count), node.x, node.y + 12);
  });

  if (!state.selectedCluster && state.graphNodes[0]) {
    selectCluster(state.graphNodes[0].item);
  }
}

function selectCluster(item) {
  if (!item) return;
  state.selectedCluster = item;
  document.getElementById('clusterName').textContent = item.name;
  document.getElementById('clusterCount').textContent = fmt(item.count);
  const share = item.share ?? pct(item.count, appData.totals?.connections || 1);
  const bar = document.getElementById('clusterShareBar');
  if (bar) bar.style.width = `${Math.min(100, share * 4)}%`;
  document.getElementById('clusterDescription').textContent =
    `${item.name} accounts for ${share}% of your first-degree graph. ${share > 10 ? 'This is a material concentration.' : 'This cluster broadens your range of perspectives.'}`;
  document.getElementById('clusterDetails').innerHTML = `
    <div><dt>Share of graph</dt><dd>${share}%</dd></div>
    <div><dt>Concentration</dt><dd>${share > 10 ? 'High' : share > 4 ? 'Moderate' : 'Low'}</dd></div>
    <div><dt>Recommended posture</dt><dd>${share > 10 ? 'Diversify adjacent clusters' : 'Deepen selectively'}</dd></div>`;
}

/* ── Relationships ─────────────────────────────────────── */
function renderRelationships() {
  const rel = appData.relationships || [];
  const sent = rel.reduce((s, x) => s + (x.sent || 0), 0);
  const received = rel.reduce((s, x) => s + (x.received || 0), 0);
  const balanced = rel.filter(x => x.balance >= 60).length;
  const dormant = (appData.staleRelationships || []).length;

  document.getElementById('relationshipMetrics').innerHTML = [
    ['Direct relationships', rel.length, 'Top relationships shown'],
    ['Messages sent', sent, `${pct(sent, sent + received)}% of ledger`],
    ['Balanced exchanges', balanced, '60%+ reciprocity'],
    ['Reconnect queue', dormant, 'Established and quiet']
  ].map(x => `<div class="strip-item"><span>${x[0]}</span><strong>${fmt(x[1])}</strong><small>${x[2]}</small></div>`).join('');

  renderRelationshipTable();
}

function currentRelationships() {
  if (state.relationshipFilter === 'stale') return appData.staleRelationships || [];
  if (state.relationshipFilter === 'imbalanced') return (appData.relationships || []).filter(x => x.total >= 4).sort((a, b) => a.balance - b.balance);
  return [...(appData.relationships || [])].sort((a, b) => b.total - a.total);
}

function renderRelationshipTable(query = '') {
  const titles = { stale: 'Reconnect queue', active: 'Most active relationships', imbalanced: 'Low-reciprocity relationships' };
  const el = document.getElementById('relationshipTableTitle');
  if (el) el.textContent = titles[state.relationshipFilter];
  const rows = currentRelationships().filter(x => `${x.name} ${x.company}`.toLowerCase().includes((query || '').toLowerCase())).slice(0, 40);
  const tbl = document.getElementById('relationshipTable');
  if (!tbl) return;
  tbl.innerHTML = `<div class="table-row table-head"><div class="table-cell">Person</div><div class="table-cell">Sent / received</div><div class="table-cell">Reciprocity</div><div class="table-cell">Last contact</div><div class="table-cell">Priority</div></div>` +
    rows.map(p => {
      const max = Math.max(p.sent, p.received, 1);
      const priority = state.relationshipFilter === 'stale' ? p.staleScore : p.strength;
      return `<div class="table-row"><div class="table-cell"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.company)} · ${escapeHtml(p.position)}</small></div><div class="table-cell"><strong>${p.sent} / ${p.received}</strong><div class="balance"><span class="sent" style="width:${p.sent/max*38}px"></span><span class="received" style="width:${p.received/max*38}px"></span></div></div><div class="table-cell">${p.balance}%</div><div class="table-cell"><strong>${shortDate(p.lastContact)}</strong><small>${ageLabel(p.daysSince)} ago</small></div><div class="table-cell"><span class="score">${priority}</span></div></div>`;
    }).join('');
}

/* ── Intelligence Lab ──────────────────────────────────── */
function renderIntelligenceLab() {
  const d = appData;
  if (!d.conversationTopics?.length) {
    const el = document.getElementById('labView');
    if (el) el.querySelector('.view-intro').innerHTML += '<p style="color:#915907">Conversation intelligence unavailable – messages.csv not found.</p>';
    return;
  }
  if (!d.conversationTopics.some(t => t.name === state.selectedTopic)) {
    state.selectedTopic = d.conversationTopics[0].name;
  }
  renderTopicFilters();
  renderTopicGraph();
  renderNextConversations();
  renderAuthoritySignals();
}

function renderTopicFilters() {
  const el = document.getElementById('topicFilters');
  if (!el) return;
  el.innerHTML = (appData.conversationTopics || []).map(t => `
    <button class="chip ${t.name === state.selectedTopic ? 'active' : ''}" data-topic="${escapeHtml(t.name)}">
      ${escapeHtml(t.name)} <small>${fmt(t.messages)}</small>
    </button>
  `).join('');
}

function topicCandidates(topicName) {
  const all = [...(appData.relationships || []), ...(appData.staleRelationships || [])];
  const deduped = new Map();
  all.forEach(p => {
    const k = `${p.name}|${p.company}`;
    if (!deduped.has(k) || p.total > deduped.get(k).total) deduped.set(k, p);
  });
  const candidates = Array.from(deduped.values())
    .map(p => {
      const topicCount = (p.topics || []).find(t => t.name === topicName)?.count || 0;
      return { ...p, topicCount };
    })
    .filter(p => p.topicCount > 0);
  const maxTC = Math.max(...candidates.map(p => p.topicCount), 1);

  return candidates.map(p => {
    const topicDepth = Math.round(100 * Math.sqrt(p.topicCount) / Math.sqrt(maxTC));
    const timing = p.pulseState === 'Active' ? 92 : p.pulseState === 'Cooling' ? 78 : Math.max(25, p.reentryScore || 0);
    const score = Math.round(topicDepth * .4 + (p.strength || 0) * .2 + (p.balance || 0) * .16 + timing * .24);
    return { ...p, topicDepth, timing, conversationScore: Math.min(99, score) };
  }).sort((a, b) => b.conversationScore - a.conversationScore);
}

function renderTopicGraph() {
  const svg = document.getElementById('topicGraph');
  if (!svg) return;
  const topic = (appData.conversationTopics || []).find(t => t.name === state.selectedTopic);
  document.getElementById('topicGraphTitle').textContent = state.selectedTopic;
  const countEl = document.getElementById('topicGraphCount');
  if (countEl) countEl.textContent = topic ? `${fmt(topic.messages)} matched messages · ${fmt(topic.contacts)} contacts` : '';

  const contacts = topicCandidates(state.selectedTopic).slice(0, 8);
  if (!contacts.length) {
    svg.innerHTML = '<text x="380" y="205" text-anchor="middle" fill="#88928e" font-size="11">No topic-matched relationships in the current shortlist.</text>';
    return;
  }

  svg.setAttribute('viewBox', '0 0 760 410');
  const contactY = i => contacts.length === 1 ? 205 : 45 + i * (320 / (contacts.length - 1));
  const uniqueCompanies = [...new Set(contacts.map(p => p.company))].slice(0, 6);
  const companyY = i => uniqueCompanies.length === 1 ? 205 : 55 + i * (300 / (uniqueCompanies.length - 1));
  const topicY = 205;

  let html = '';
  contacts.forEach((p, i) => {
    const cy = contactY(i);
    html += `<line class="grid-line" x1="188" y1="${topicY}" x2="320" y2="${cy}"/>`;
  });
  contacts.forEach((p, i) => {
    const ci = uniqueCompanies.indexOf(p.company);
    if (ci >= 0) {
      html += `<line class="grid-line" x1="358" y1="${contactY(i)}" x2="590" y2="${companyY(ci)}" stroke-dasharray="4,3" stroke="#d7dce1"/>`;
    }
  });

  // Topic node
  html += `<g><rect x="18" y="${topicY - 38}" width="170" height="76" rx="5" fill="#e8f3ff" stroke="#0a66c2" stroke-width="1.5"/><text x="103" y="${topicY - 10}" text-anchor="middle" fill="#0a66c2" font-size="12" font-weight="700">${escapeHtml(state.selectedTopic)}</text><text x="103" y="${topicY + 14}" text-anchor="middle" fill="#666" font-size="9">${topic ? fmt(topic.messages) : 0} matched msgs</text></g>`;

  // Contact nodes
  contacts.forEach((p, i) => {
    const cy = contactY(i);
    const name = p.name.length > 23 ? p.name.slice(0, 21) + '…' : p.name;
    html += `<g><circle cx="338" cy="${cy}" r="15" fill="${COLORS[i % COLORS.length]}dd" stroke="${COLORS[i % COLORS.length]}" stroke-width="2"/><text x="360" y="${cy - 3}" fill="#30363a" font-size="9">${escapeHtml(name)}</text><text x="360" y="${cy + 9}" fill="#757d81" font-size="7">${p.topicCount} matches · score ${p.conversationScore}</text></g>`;
  });

  // Company nodes
  uniqueCompanies.forEach((company, i) => {
    const cy = companyY(i);
    const label = company.length > 24 ? company.slice(0, 22) + '…' : company;
    html += `<g><rect x="590" y="${cy - 14}" width="154" height="28" rx="3" fill="#f3f2ef" stroke="#d7dce0"/><text x="600" y="${cy + 4}" fill="#30363a" font-size="9">${escapeHtml(label)}</text></g>`;
  });

  svg.innerHTML = html;
}

function renderNextConversations() {
  const el = document.getElementById('nextConversations');
  if (!el) return;
  const rows = topicCandidates(state.selectedTopic).slice(0, 4);
  el.innerHTML = rows.map((p, i) => {
    const timing = p.pulseState === 'Active' ? 'Deepen the conversation' : p.pulseState === 'Cooling' ? 'A topic-led update is timely' : 'Use a low-pressure re-entry';
    return `<article class="next-conversation-item"><span class="conversation-rank">0${i + 1}</span><div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.company)} · ${p.topicCount} topic-matched messages</small><p>${timing}</p></div><div class="conversation-score"><strong>${p.conversationScore}</strong><small>fit</small></div></article>`;
  }).join('') || '<p class="empty-signal">No supported next conversation for this topic.</p>';
}

function renderAuthoritySignals() {
  const el = document.getElementById('authoritySignals');
  if (!el) return;
  const signals = appData.authoritySignals || [];
  if (!signals.length) { el.innerHTML = '<p class="empty-signal">No authority signal data available.</p>'; return; }
  const channels = ['private', 'public', 'learning', 'evidence'];
  const maxes = Object.fromEntries(channels.map(c => [c, Math.max(...signals.map(s => s[c] || 0), 1)]));

  el.innerHTML = signals.map(s => {
    const normalized = Object.fromEntries(channels.map(c => [c, Math.round(100 * (s[c] || 0) / maxes[c])]));
    const gap = normalized.private - normalized.public;
    const note = gap > 24 ? 'Private depth leads public visibility' : gap < -24 ? 'Public visibility leads private depth' : 'Aligned';
    return `<div class="authority-row"><div class="authority-label"><strong>${escapeHtml(s.name)}</strong><small>${note}</small></div><div class="authority-bars">${channels.map(c => `<div><span>${c}</span><div class="signal-track"><i class="${c}" style="width:${normalized[c]}%"></i></div><strong>${s[c]}</strong></div>`).join('')}</div></div>`;
  }).join('');
}

/* ── Content ───────────────────────────────────────────── */
function renderContent() {
  const d = appData;
  document.getElementById('contentMetrics').innerHTML = [
    ['Published posts', d.totals?.shares, 'Original shares in archive', '▤'],
    ['Comments made', d.totals?.comments, 'Your engagement with others', '◌'],
    ['Reactions made', d.totals?.reactions, 'Your outbound reactions', '♡'],
    ['Direct messages', d.totals?.messages, 'Two-way private interactions', '↔']
  ].map(x => `<article class="metric-card"><span class="label">${x[0]}<i class="metric-icon">${x[3]}</i></span><strong>${fmt(x[1])}</strong><small>${x[2]}</small></article>`).join('');

  document.getElementById('coverageNote').textContent = d.coverage?.note || '';

  const postList = document.getElementById('postArchive');
  if (postList) {
    postList.innerHTML = (d.recentShares || []).filter(x => x.text).slice(0, 7).map(post =>
      `<div class="post-row"><span class="post-date">${shortDate(post.date)}</span><p class="post-text">${escapeHtml(post.text)}</p></div>`
    ).join('');
  }

  // Simple donut
  const total = (d.totals?.comments || 0) + (d.totals?.reactions || 0) + (d.totals?.shares || 0);
  const rPct = pct(d.totals?.reactions || 0, total);
  const cPct = pct(d.totals?.comments || 0, total);
  const sPct = 100 - rPct - cPct;
  const donut = document.getElementById('engagementDonut');
  if (donut) {
    donut.innerHTML = `<div style="text-align:center;padding:20px"><strong style="font-size:28px;color:#1f2326">${fmt(total)}</strong><br><small style="color:#666">documented actions</small><br><br><span style="display:inline-block;width:12px;height:12px;background:var(--teal);border-radius:50%;vertical-align:middle;margin-right:4px"></span>Reactions ${rPct}% &nbsp; <span style="display:inline-block;width:12px;height:12px;background:var(--coral);border-radius:50%;vertical-align:middle;margin-right:4px"></span>Comments ${cPct}% &nbsp; <span style="display:inline-block;width:12px;height:12px;background:var(--gold);border-radius:50%;vertical-align:middle;margin-right:4px"></span>Posts ${sPct}%</div>`;
  }
}

/* ── Identity ──────────────────────────────────────────── */
function renderIdentity() {
  const d = appData;
  const positions = d.positions || [];
  const latest = positions[0];
  document.getElementById('identityThesis').textContent = positions.length
    ? `From ${escapeHtml(positions[positions.length - 1]?.title || 'early roles')} to ${escapeHtml(latest?.title || 'current role')} – your professional identity shows broadening scope.`
    : 'No position history available in this export.';

  const timeline = document.getElementById('careerTimeline');
  if (timeline) {
    timeline.innerHTML = positions.slice(0, 8).map(p =>
      `<div class="timeline-item"><strong>${escapeHtml(p.title)}</strong><span>${escapeHtml(p.company)}</span><small>${escapeHtml(p.started || '')}${p.finished ? ` to ${escapeHtml(p.finished)}` : ' to present'}</small></div>`
    ).join('');
  }

  const chart = document.getElementById('identityChart');
  if (chart && d.identity) {
    const max = Math.max(...d.identity.map(y => y.total || 0), 1);
    const topicNames = ['AI & Technology', 'Risk, GRC & Trust', 'Community & Inclusion', 'Careers & Learning', 'Leadership & Boards'];
    chart.innerHTML = d.identity.map(year => {
      const map = Object.fromEntries((year.topics || []).map(x => [x.name, x.count]));
      const segments = topicNames.map((t, i) =>
        `<span title="${t}: ${map[t] || 0}" style="height:${(map[t] || 0) / max * 200}px;background:${COLORS[i]};min-height:2px"></span>`
      ).join('');
      return `<div class="identity-year"><div class="identity-stack">${segments}</div><small>${year.year}</small></div>`;
    }).join('');
  }
}

/* ── Opportunity Paths ─────────────────────────────────── */
function careerRelationships() {
  const byKey = new Map();
  [...(appData.relationships || []), ...(appData.staleRelationships || [])].forEach(p => {
    const key = p.url || `${p.name}|${p.company}`;
    if (!byKey.has(key) || p.total > byKey.get(key).total) byKey.set(key, p);
  });
  return Array.from(byKey.values()).filter(p => p.name !== 'LinkedIn Member');
}

function networkArchetype() {
  const domains = (appData.domains || []).filter(x => x.name !== 'Other');
  const dominant = domains[0] || appData.domains?.[0];
  const activeShare = pct(appData.totals?.activeRelationships || 0, appData.totals?.connections || 1);
  const avgBalance = Math.round((appData.relationships || []).reduce((s, x) => s + (x.balance || 0), 0) / Math.max(1, (appData.relationships || []).length));

  if (dominant && dominant.share >= 28 && state.goals.length >= 3) {
    return {
      name: 'Institutional Bridge-Builder',
      description: `Deep credibility in ${dominant.name}, with reach across multiple sectors.`,
      action: 'Run a bridge-led search: use trusted institutional relationships to enter adjacent sectors.',
      dimensions: [['Domain depth', Math.min(100, Math.round(dominant.share * 2.3))], ['Cross-sector breadth', Math.min(100, 100 - Math.round(dominant.share))], ['Relationship activation', Math.min(100, activeShare * 2)], ['Exchange mutuality', avgBalance]]
    };
  }
  return {
    name: 'Portfolio Connector',
    description: 'Network distributed across clusters, creating optionality.',
    action: 'Choose two target domains and activate the strongest five relationships in each.',
    dimensions: [['Domain depth', 54], ['Cross-sector breadth', 76], ['Relationship activation', Math.min(100, activeShare * 2)], ['Exchange mutuality', avgBalance]]
  };
}

function signalPersonHTML(p, score, scoreLabel, action) {
  return `<div class="signal-person"><span class="avatar">${initials(p.name)}</span><div class="signal-person-copy"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.company)} · ${escapeHtml(action)}</small></div><div class="signal-score"><strong>${score}</strong><small>${scoreLabel}</small></div></div>`;
}

function renderCareer() {
  document.getElementById('activeObjective').textContent = state.objective;
  if (!appData) return;

  const rels = careerRelationships();
  const cooling = rels.filter(x => x.pulseState === 'Cooling').sort((a, b) => (a.connectionPulse || 0) - (b.connectionPulse || 0));
  const advocates = rels.filter(x => (x.advocateReadiness || 0) >= 65).sort((a, b) => (b.advocateReadiness || 0) - (a.advocateReadiness || 0));
  const reentry = rels.filter(x => (x.reentryScore || 0) >= 55).sort((a, b) => (b.reentryScore || 0) - (a.reentryScore || 0));

  document.getElementById('careerMetrics').innerHTML = [
    ['Cooling connections', cooling.length, 'Reconnect before context fades', 'pulse'],
    ['Advocate-ready ties', advocates.length, 'Validate comfort before referral asks', 'adv'],
    ['Re-entry windows', reentry.length, 'Dormant with strong history', 're'],
    ['Mutual exchanges', rels.filter(x => x.balance >= 65 && x.total >= 5).length, 'Balanced conversations', 'bal']
  ].map(c => `<article class="metric-card career-metric-card"><span class="label">${c[0]}<i class="metric-icon">${c[3]}</i></span><strong>${fmt(c[1])}</strong><small>${c[2]}</small></article>`).join('');

  // Archetype
  const archetype = networkArchetype();
  const topGrid = document.getElementById('careerTopGrid');
  if (topGrid) {
    topGrid.innerHTML = `
      <section class="panel archetype-panel"><div class="panel-head"><div><span class="eyebrow">Network shape</span><h3>Your current search archetype</h3></div><span class="confidence-tag">High confidence</span></div>
        <div class="archetype-lockup"><div class="archetype-mark"><span></span><span></span><span></span></div><div><strong>${escapeHtml(archetype.name)}</strong><p>${escapeHtml(archetype.description)}</p></div></div>
        <div class="archetype-dimensions">${archetype.dimensions.map(([l, v]) => `<div class="archetype-row"><div><span>${l}</span><strong>${v}</strong></div><div class="progress"><span style="width:${v}%"></span></div></div>`).join('')}</div>
        <div class="job-action"><span>Job-search implication</span><p>${escapeHtml(archetype.action)}</p></div></section>
      <section class="panel route-panel"><div class="panel-head"><div><span class="eyebrow">Bridge route finder</span><h3>Warmest credible route</h3></div><span class="inference-tag">Inferred</span></div><p class="panel-copy">Enter a target organization or domain.</p><form class="route-form"><label>Target organization<input class="search-input" id="routeTarget" placeholder="e.g. Microsoft, AI governance"></label><label>Intent<input class="search-input" id="routeIntent" placeholder="e.g. role insight, referral"></label><button class="primary-button" type="submit">Find routes</button></form><div id="routeResults" class="route-results"></div></section>`;
  }

  // Signal grids
  const signalGrid = document.getElementById('careerSignalGrid');
  if (signalGrid) {
    signalGrid.innerHTML = `
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">Connection pulse</span><h3>Cooling relationships</h3></div></div><div id="pulseList" class="signal-list">${cooling.slice(0, 4).map(p => signalPersonHTML(p, p.connectionPulse || 0, 'pulse', `${ageLabel(p.daysSince)} since contact`)).join('') || '<p class="empty-signal">No cooling relationships.</p>'}</div></section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">Advocate readiness</span><h3>Referral potential</h3></div></div><div id="advocateList" class="signal-list">${advocates.slice(0, 4).map(p => signalPersonHTML(p, p.advocateReadiness || 0, 'readiness', `${p.balance}% mutuality`)).join('') || '<p class="empty-signal">No high-confidence advocate candidates.</p>'}</div></section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">Re-entry windows</span><h3>Strong dormant ties</h3></div></div><div id="reentryList" class="signal-list">${reentry.slice(0, 4).map(p => signalPersonHTML(p, p.reentryScore || 0, 'window', `${p.total} prior msgs`)).join('') || '<p class="empty-signal">No re-entry windows.</p>'}</div></section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">Search action queue</span><h3>This week</h3></div></div><div id="careerActionQueue" class="action-queue"></div></section>`;
  }

  // Action queue
  const actions = [];
  if (cooling[0]) actions.push(['Reconnect', cooling[0], 'Send a context-led update before dormancy.']);
  if (advocates[0]) actions.push(['Role intel', advocates[0], 'Discuss team/market before testing referral.']);
  if (reentry[0]) actions.push(['Re-entry', reentry[0], 'Use shared history to reopen conversation.']);
  actions.push(['Profile', { name: 'Your LinkedIn profile', company: 'Positioning' }, 'Add concrete examples connecting your domains.']);
  const aq = document.getElementById('careerActionQueue');
  if (aq) {
    aq.innerHTML = actions.map((a, i) => `<div class="action-item"><span class="action-number">${i + 1}</span><div><strong>${a[0]} · ${escapeHtml(a[1].name)}</strong><small>${escapeHtml(a[1].company)}</small><p>${a[2]}</p></div></div>`).join('');
  }

  renderCareerLedger();
  findRoutes('AI governance', 'role insight');
}

function careerLedgerRows() {
  const rels = careerRelationships();
  if (state.careerLedgerFilter === 'pulse') return rels.filter(x => x.pulseState === 'Cooling').sort((a, b) => (a.connectionPulse || 0) - (b.connectionPulse || 0));
  if (state.careerLedgerFilter === 'advocates') return rels.filter(x => (x.advocateReadiness || 0) >= 60).sort((a, b) => (b.advocateReadiness || 0) - (a.advocateReadiness || 0));
  if (state.careerLedgerFilter === 'reentry') return rels.filter(x => (x.reentryScore || 0) > 0).sort((a, b) => (b.reentryScore || 0) - (a.reentryScore || 0));
  return rels.sort((a, b) => (b.advocateReadiness + b.reentryScore + b.connectionPulse) - (a.advocateReadiness + a.reentryScore + a.connectionPulse));
}

function renderCareerLedger() {
  const titles = { all: 'Priority relationship actions', pulse: 'Cooling connections', advocates: 'Potential advocates', reentry: 'Re-entry opportunities' };
  const el = document.getElementById('careerLedgerTitle');
  if (el) el.textContent = titles[state.careerLedgerFilter];
  const rows = careerLedgerRows().slice(0, 30);
  const tbl = document.getElementById('careerLedger');
  if (!tbl) return;
  tbl.innerHTML = `<div class="table-row table-head"><div class="table-cell">Relationship</div><div class="table-cell">Pulse</div><div class="table-cell">Mutuality</div><div class="table-cell">Advocate</div><div class="table-cell">Next action</div></div>` +
    rows.map(p => `<div class="table-row"><div class="table-cell"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.company)} · ${escapeHtml(p.position)}</small></div><div class="table-cell"><span class="pulse-pill ${(p.pulseState || '').toLowerCase()}">${p.pulseState || '?'}</span><small>${p.connectionPulse || 0}/100</small></div><div class="table-cell"><strong>${p.balance}%</strong><small>${p.sent} sent · ${p.received} recv</small></div><div class="table-cell"><strong>${p.advocateReadiness || 0}/100</strong><div class="table-meter"><span style="width:${p.advocateReadiness || 0}%"></span></div></div><div class="table-cell"><span class="action-copy">${escapeHtml(p.searchAction || '')}</span></div></div>`).join('');
}

function findRoutes(target, intent) {
  const cleanTarget = (target || '').trim();
  const cleanIntent = (intent || 'role insight').trim();
  const targetLower = cleanTarget.toLowerCase();
  const ranked = careerRelationships().map(p => {
    const direct = targetLower && (p.company || '').toLowerCase().includes(targetLower);
    const textMatch = targetLower && `${p.company} ${p.position} ${p.domain}`.toLowerCase().includes(targetLower);
    const relevance = direct ? 50 : textMatch ? 40 : 8;
    const routeScore = Math.round(relevance + (p.advocateReadiness || 0) * .3 + (p.connectionPulse || 0) * .2);
    return { ...p, routeScore };
  }).sort((a, b) => b.routeScore - a.routeScore).slice(0, 3);

  const el = document.getElementById('routeResults');
  if (!el) return;
  const rt = document.getElementById('routeTarget'); if (rt) rt.value = cleanTarget;
  const ri = document.getElementById('routeIntent'); if (ri) ri.value = cleanIntent;

  el.innerHTML = ranked.map((p, i) => {
    const routeType = (p.company || '').toLowerCase().includes(targetLower) ? 'Direct organization route' : 'Adjacent relationship';
    const action = /referr/i.test(cleanIntent) ? 'Reconnect, confirm context, then test referral.' : /intro/i.test(cleanIntent) ? 'Ask for perspective, then request intro.' : `Ask for ${cleanIntent || 'market context'}.`;
    return `<article class="route-result"><div class="route-rank">0${i + 1}</div><div class="route-copy"><span>${routeType} · ${Math.min(96, p.routeScore)}% confidence</span><strong>You → ${escapeHtml(p.name)} → ${escapeHtml(cleanTarget || p.domain)}</strong><small>${p.total} msgs · ${p.balance}% mutuality · ${shortDate(p.lastContact)}</small><p>${escapeHtml(action)}</p></div></article>`;
  }).join('');
}

/* ── View Navigation ───────────────────────────────────── */
function setView(view) {
  if (!VIEW_META[view]) return;
  state.view = view;
  $$('.view').forEach(el => el.classList.toggle('active', el.id === `${view}View`));
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  document.getElementById('viewEyebrow').textContent = VIEW_META[view][0];
  document.getElementById('viewTitle').textContent = VIEW_META[view][1];
  document.getElementById('sidebar').classList.remove('open');
  if (view === 'network') requestAnimationFrame(() => drawNetwork());
  if (view === 'lab') renderIntelligenceLab();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Advisor ───────────────────────────────────────────── */
function addChatMessage(html, role) {
  const msgs = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.innerHTML = html;
  // Remove empty state
  const empty = msgs.querySelector('.chat-empty');
  if (empty) empty.remove();
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

function askAdvisor(question) {
  if (!question.trim() || !appData) return;
  addChatMessage(escapeHtml(question), 'user');

  if (state.aiEnabled) {
    previewAIRequest(question);
  } else {
    setTimeout(() => {
      const insight = localInsight(question, appData);
      addChatMessage(
        `<span class="msg-title">${escapeHtml(insight.title)}</span>${escapeHtml(insight.body)}<span class="msg-meta">Confidence: ${insight.confidence} · Data used: ${insight.dataUsed.join(', ')}</span>`,
        'assistant'
      );
    }, 150);
  }
}

function previewAIRequest(question) {
  const ctx = buildContextPacket(appData, { question });
  document.getElementById('modalTitle').textContent = 'Review AI request';
  document.getElementById('modalBody').innerHTML = `
    <p class="payload-warning">This exact derived-data packet will be sent to your configured endpoint. Organization and topic labels may be included; raw messages and contact names are excluded.</p>
    <div class="payload-meta">${ctx.estimatedTokens} estimated tokens · ${ctx.includedFields.length} data sections</div>
    <pre class="payload-preview">${escapeHtml(JSON.stringify(ctx.packet, null, 2))}</pre>
    <div class="modal-actions">
      <button class="secondary-button" id="useLocalInstead">Use Local Insights instead</button>
      <button class="primary-button" id="sendAiRequest">Send to AI</button>
    </div>
  `;
  document.getElementById('modalBackdrop').classList.remove('hidden');

  document.getElementById('useLocalInstead').onclick = () => {
    closeModal();
    const insight = localInsight(question, appData);
    addChatMessage(
      `<span class="msg-title">${escapeHtml(insight.title)}</span>${escapeHtml(insight.body)}<span class="msg-meta">Confidence: ${insight.confidence} · Data used: ${insight.dataUsed.join(', ')}</span>`,
      'assistant'
    );
  };
  document.getElementById('sendAiRequest').onclick = () => {
    closeModal();
    sendAIRequest(question, ctx);
  };
}

async function sendAIRequest(question, ctx) {
  const settings = getAISettings();
  addChatMessage('<em>Requesting AI analysis...</em>', 'assistant');

  const result = await askAI(ctx, question, settings);
  if (result.error) {
    // Fall back to local
    const insight = localInsight(question, appData);
    addChatMessage(
      `<span class="msg-title">AI unavailable – local fallback</span>${escapeHtml(insight.body)}<span class="msg-meta">Error: ${escapeHtml(result.error)} · Falling back to Local Insights</span>`,
      'assistant'
    );
  } else {
    addChatMessage(
      `<span class="msg-title">AI Advisor</span>${escapeHtml(result.text)}<span class="msg-meta">Response via ${escapeHtml(settings.model || 'AI')} · Verify before acting</span>`,
      'assistant'
    );
  }
}

/* ── Modal: Settings ───────────────────────────────────── */
function openSettings() {
  const ai = getAISettings();
  const providerOptions = Object.entries(AI_PROVIDER_PRESETS)
    .map(([value, preset]) => `<option value="${value}" ${ai.provider === value ? 'selected' : ''}>${escapeHtml(preset.label)}</option>`)
    .join('');
  document.getElementById('modalTitle').textContent = 'Settings';
  document.getElementById('modalBody').innerHTML = `
    <h3 style="margin-top:0">AI Advisor (optional)</h3>
    <p style="font-size:10px">Choose any model exposed through an OpenAI-compatible chat endpoint. Use a gateway such as OpenRouter for models whose native APIs use another format. Disabled by default; secrets stay in this browser session.</p>
    <div class="settings-grid">
      <label>Enabled <input type="checkbox" id="aiEnabled" ${ai.enabled ? 'checked' : ''}></label>
      <label>Provider <select id="aiProvider">${providerOptions}</select></label>
      <label>Compatible endpoint URL <input type="url" id="aiEndpoint" value="${escapeHtml(ai.endpoint || '')}" placeholder="https://provider.example/v1/chat/completions"></label>
      <label>Model ID <input type="text" id="aiModel" value="${escapeHtml(ai.model || '')}" placeholder="provider/model-name"></label>
      <label>Provider API key (optional) <input type="password" id="aiApiKey" value="${escapeHtml(ai.apiKey || '')}" placeholder="Stored for this tab only"></label>
    </div>
    <p class="settings-note">Endpoint and model remain editable after choosing a preset. Direct browser calls require provider CORS support.</p>
    <div class="settings-actions">
      <button class="secondary-button" id="testAiConnection">Test connection</button>
      <button class="danger-button" id="clearAiSecrets">Clear secrets</button>
    </div>
    <div id="testResult"></div>
    <div class="settings-actions" style="margin-top:14px">
      <button class="primary-button" id="saveSettings">Save settings</button>
      <button class="secondary-button" id="cancelSettings">Cancel</button>
    </div>

    <h3>Data controls</h3>
    <div class="settings-actions">
      <button class="primary-button" id="saveSnapshotBtn">Save current data</button>
      <button class="secondary-button" id="exportJsonBtn">Export as JSON</button>
      <button class="danger-button" id="deleteAllDataBtn">Delete all local data</button>
    </div>
  `;

  document.getElementById('modalBackdrop').classList.remove('hidden');

  // Wire settings events
  document.getElementById('cancelSettings').onclick = closeModal;
  document.getElementById('aiProvider').onchange = event => {
    const preset = AI_PROVIDER_PRESETS[event.target.value];
    if (!preset || event.target.value === 'custom') return;
    document.getElementById('aiEndpoint').value = preset.endpoint;
    document.getElementById('aiModel').value = preset.model;
  };
  document.getElementById('saveSettings').onclick = () => {
    const settings = {
      enabled: document.getElementById('aiEnabled').checked,
      provider: document.getElementById('aiProvider').value,
      endpoint: document.getElementById('aiEndpoint').value.trim(),
      model: document.getElementById('aiModel').value.trim(),
      apiKey: document.getElementById('aiApiKey').value.trim()
    };
    if (settings.enabled && (!settings.endpoint || !settings.model)) {
      document.getElementById('testResult').innerHTML = '<div class="conn-test-result fail">Choose a provider or enter both an endpoint and model ID.</div>';
      return;
    }
    state.aiEnabled = settings.enabled;
    saveAISettings(settings);
    updateAdvisorLabel();
    closeModal();
  };
  document.getElementById('testAiConnection').onclick = async () => {
    const resultEl = document.getElementById('testResult');
    resultEl.innerHTML = '<div class="conn-test-result">Testing...</div>';
    const settings = {
      provider: document.getElementById('aiProvider').value,
      endpoint: document.getElementById('aiEndpoint').value.trim(),
      model: document.getElementById('aiModel').value.trim(),
      apiKey: document.getElementById('aiApiKey').value.trim()
    };
    const result = await testAIConnection(settings);
    resultEl.innerHTML = result.ok
      ? `<div class="conn-test-result ok">✓ Connected successfully (model: ${escapeHtml(result.model || settings.model)})</div>`
      : `<div class="conn-test-result fail">✗ ${escapeHtml(result.error)}</div>`;
  };
  document.getElementById('clearAiSecrets').onclick = () => {
    clearAISecrets();
    document.getElementById('aiEndpoint').value = '';
    document.getElementById('aiModel').value = '';
    document.getElementById('aiApiKey').value = '';
    document.getElementById('aiProvider').value = 'custom';
    document.getElementById('aiEnabled').checked = false;
    state.aiEnabled = false;
    updateAdvisorLabel();
    document.getElementById('testResult').innerHTML = '<div class="conn-test-result ok">Secrets cleared from session.</div>';
  };
  document.getElementById('saveSnapshotBtn').onclick = async () => {
    if (!appData) return;
    await saveSnapshot('latest', appData);
    alert('Data saved to browser storage.');
  };
  document.getElementById('exportJsonBtn').onclick = () => {
    if (!appData) return;
    exportData(appData);
  };
  document.getElementById('deleteAllDataBtn').onclick = async () => {
    if (confirm('Delete all locally stored data? This cannot be undone.')) {
      await deleteAllData();
      alert('All local data deleted.');
      location.reload();
    }
  };
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
}

function updateAdvisorLabel() {
  const label = document.getElementById('advisorLabel');
  const sub = document.getElementById('advisorSubLabel');
  if (state.aiEnabled) {
    const ai = getAISettings();
    const provider = AI_PROVIDER_PRESETS[ai.provider]?.label || 'Custom provider';
    label.textContent = 'AI Advisor';
    sub.textContent = `${provider} · ${ai.model || 'model not set'}`;
  } else {
    label.textContent = 'Local Insights';
    sub.textContent = 'Deterministic · offline';
  }
}

/* ── Event Wiring ──────────────────────────────────────── */
function wireAppEvents() {
  // Import screen
  document.getElementById('dropZone').addEventListener('dragover', e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); });
  document.getElementById('dropZone').addEventListener('dragleave', e => { e.currentTarget.classList.remove('dragover'); });
  document.getElementById('dropZone').addEventListener('drop', e => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleZipFile(file);
  });
  document.getElementById('zipInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleZipFile(file);
  });
  document.getElementById('trySample').addEventListener('click', loadSample);

  // Sidebar nav
  document.getElementById('app').addEventListener('click', e => {
    const navItem = e.target.closest('.nav-item');
    if (navItem) { setView(navItem.dataset.view); return; }
    const jumpBtn = e.target.closest('[data-jump]');
    if (jumpBtn) { setView(jumpBtn.dataset.jump); return; }
  });

  // FAB & Advisor
  document.getElementById('openAssistant').addEventListener('click', () => {
    document.getElementById('assistantPanel').classList.add('open');
  });
  document.getElementById('closeAssistant').addEventListener('click', () => {
    document.getElementById('assistantPanel').classList.remove('open');
  });
  document.getElementById('chatForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    askAdvisor(input.value);
    input.value = '';
  });
  document.getElementById('promptChips').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (btn) askAdvisor(btn.textContent);
  });

  // Modal
  document.getElementById('settingsButton').addEventListener('click', openSettings);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Data controls in sidebar
  document.getElementById('saveData').addEventListener('click', async () => {
    if (!appData) return;
    await saveSnapshot('latest', appData);
    alert('Data saved to browser storage.');
  });
  document.getElementById('exportData').addEventListener('click', () => {
    if (!appData) return;
    exportData(appData);
  });
  document.getElementById('resetData').addEventListener('click', async () => {
    if (confirm('Delete all locally stored data and reset? This cannot be undone.')) {
      await deleteAllData();
      location.reload();
    }
  });
  document.getElementById('reimportButton').addEventListener('click', () => location.reload());

  // Mobile menu
  document.getElementById('menuButton').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Delegate view-specific events
  document.getElementById('pageWrap').addEventListener('click', e => {
    // Map mode buttons
    const mapBtn = e.target.closest('[data-map-mode]');
    if (mapBtn && mapBtn.dataset.mapMode) {
      state.mapMode = mapBtn.dataset.mapMode;
      state.selectedCluster = null;
      $$('[data-map-mode]').forEach(x => x.classList.toggle('active', x === mapBtn));
      drawNetwork();
      return;
    }
    // Relationship filter chips
    const relBtn = e.target.closest('[data-rel-filter]');
    if (relBtn && relBtn.dataset.relFilter) {
      state.relationshipFilter = relBtn.dataset.relFilter;
      $$('[data-rel-filter]').forEach(x => x.classList.toggle('active', x === relBtn));
      renderRelationshipTable(document.getElementById('relationshipSearch')?.value || '');
      return;
    }
    // Career ledger filters
    const careerBtn = e.target.closest('[data-career-ledger]');
    if (careerBtn && careerBtn.dataset.careerLedger) {
      state.careerLedgerFilter = careerBtn.dataset.careerLedger;
      $$('[data-career-ledger]').forEach(x => x.classList.toggle('active', x === careerBtn));
      renderCareerLedger();
      return;
    }
  });

  // Topic filters
  document.getElementById('pageWrap').addEventListener('click', e => {
    const topicBtn = e.target.closest('[data-topic]');
    if (topicBtn && topicBtn.dataset.topic) {
      state.selectedTopic = topicBtn.dataset.topic;
      renderIntelligenceLab();
    }
  });

  // Search inputs
  const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };
  document.getElementById('pageWrap').addEventListener('input', e => {
    if (e.target.id === 'companySearch') renderCompanyTable(e.target.value);
    if (e.target.id === 'relationshipSearch') renderRelationshipTable(e.target.value);
  });

  // Network canvas clicks
  document.getElementById('pageWrap').addEventListener('click', e => {
    if (e.target.id === 'networkCanvas') {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const node = state.graphNodes?.find(n => Math.hypot(n.x - x, n.y - y) <= n.r);
      if (node) selectCluster(node.item);
    }
  });

  // Route form
  document.getElementById('pageWrap').addEventListener('submit', e => {
    if (e.target.classList.contains('route-form')) {
      e.preventDefault();
      const target = document.getElementById('routeTarget')?.value || '';
      const intent = document.getElementById('routeIntent')?.value || '';
      findRoutes(target, intent);
    }
  });

  // Window resize
  window.addEventListener('resize', () => {
    if (state.view === 'network') drawNetwork();
    if (state.view === 'lab') renderTopicGraph();
  });

  // Initialize advisor label
  updateAdvisorLabel();
}

function wireViewEvents() {
  // Additional view events are handled via delegation on pageWrap (above)
}

/* ── Boot ──────────────────────────────────────────────── */
init();
