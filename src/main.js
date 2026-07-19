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
  fmt, pct, initials, escapeHtml, shortDate, ageLabel, COLORS, normalizeAuthoritySignals
} from './utils.js';
import { state, VIEW_META } from './app/state.js';
import { $, $$ } from './app/dom.js';
import { renderContent } from './views/content.js';
import { renderIdentity } from './views/identity.js';
import { renderNetwork, renderCompanyTable, drawNetwork, selectCluster } from './views/network.js';
import { renderIntelligenceLab, renderTopicGraph } from './views/lab.js';
import { renderCareer, renderCareerLedger, findRoutes } from './views/career.js';
import { renderOverview } from './views/overview.js';
import { renderRelationships, renderRelationshipTable } from './views/relationships.js';

/* ── State ────────────────────────────────────────────── */
let appData = null;

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
            <button class="icon-button advisor-toggle" id="advisorToggle" aria-label="Open advisor" title="Ask LinkdSight">✦</button>
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
  renderOverview(appData);
  renderNetwork(appData);
  renderRelationships(appData);
  renderIntelligenceLab(appData);
  renderContent(appData);
  renderIdentity(appData);
  renderCareer(appData);
}

/* Overview view lives in src/views/overview.js (spec 001 T1). */

/* Overview → views/overview.js · Network → views/network.js ·
   Relationships → views/relationships.js · Intelligence Lab → views/lab.js ·
   Content/Identity → views/content.js, views/identity.js ·
   Opportunity Paths → views/career.js (spec 001 T1). */

/* ── View Navigation ───────────────────────────────────── */
function setView(view) {
  if (!VIEW_META[view]) return;
  state.view = view;
  $$('.view').forEach(el => el.classList.toggle('active', el.id === `${view}View`));
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  document.getElementById('viewEyebrow').textContent = VIEW_META[view][0];
  document.getElementById('viewTitle').textContent = VIEW_META[view][1];
  document.getElementById('sidebar').classList.remove('open');
  if (view === 'network') requestAnimationFrame(() => drawNetwork(appData));
  if (view === 'lab') renderIntelligenceLab(appData);
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
  document.getElementById('advisorToggle').addEventListener('click', () => {
    document.getElementById('assistantPanel').classList.toggle('open');
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
      drawNetwork(appData);
      return;
    }
    // Relationship filter chips
    const relBtn = e.target.closest('[data-rel-filter]');
    if (relBtn && relBtn.dataset.relFilter) {
      state.relationshipFilter = relBtn.dataset.relFilter;
      $$('[data-rel-filter]').forEach(x => x.classList.toggle('active', x === relBtn));
      renderRelationshipTable(appData, document.getElementById('relationshipSearch')?.value || '');
      return;
    }
    // Career ledger filters
    const careerBtn = e.target.closest('[data-career-ledger]');
    if (careerBtn && careerBtn.dataset.careerLedger) {
      state.careerLedgerFilter = careerBtn.dataset.careerLedger;
      $$('[data-career-ledger]').forEach(x => x.classList.toggle('active', x === careerBtn));
      renderCareerLedger(appData);
      return;
    }
  });

  // Topic filters
  document.getElementById('pageWrap').addEventListener('click', e => {
    const topicBtn = e.target.closest('[data-topic]');
    if (topicBtn && topicBtn.dataset.topic) {
      state.selectedTopic = topicBtn.dataset.topic;
      renderIntelligenceLab(appData);
    }
  });

  // Search inputs
  const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };
  document.getElementById('pageWrap').addEventListener('input', e => {
    if (e.target.id === 'companySearch') renderCompanyTable(appData, e.target.value);
    if (e.target.id === 'relationshipSearch') renderRelationshipTable(appData, e.target.value);
  });

  // Network canvas clicks
  document.getElementById('pageWrap').addEventListener('click', e => {
    if (e.target.id === 'networkCanvas') {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const node = state.graphNodes?.find(n => Math.hypot(n.x - x, n.y - y) <= n.r);
      if (node) selectCluster(appData, node.item);
    }
  });

  // Route form
  document.getElementById('pageWrap').addEventListener('submit', e => {
    if (e.target.classList.contains('route-form')) {
      e.preventDefault();
      const target = document.getElementById('routeTarget')?.value || '';
      const intent = document.getElementById('routeIntent')?.value || '';
      findRoutes(appData, target, intent);
    }
  });

  // Window resize
  window.addEventListener('resize', () => {
    if (state.view === 'network') drawNetwork(appData);
    if (state.view === 'lab') renderTopicGraph(appData);
  });

  // Initialize advisor label
  updateAdvisorLabel();
}

function wireViewEvents() {
  // Additional view events are handled via delegation on pageWrap (above)
}

/* ── Boot ──────────────────────────────────────────────── */
init();
