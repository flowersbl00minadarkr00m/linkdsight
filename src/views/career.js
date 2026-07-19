/** Opportunity Paths view (spec 001 T1). renderCareer + renderCareerLedger +
 *  findRoutes are exported because the shell wires the ledger filter chips and
 *  the route-finder form. */
import { fmt, pct, escapeHtml, initials, ageLabel, shortDate } from '../utils.js';
import { state } from '../app/state.js';

function careerRelationships(d) {
  const byKey = new Map();
  [...(d.relationships || []), ...(d.staleRelationships || [])].forEach(p => {
    const key = p.url || `${p.name}|${p.company}`;
    if (!byKey.has(key) || p.total > byKey.get(key).total) byKey.set(key, p);
  });
  return Array.from(byKey.values()).filter(p => p.name !== 'LinkedIn Member');
}

function networkArchetype(d) {
  const domains = (d.domains || []).filter(x => x.name !== 'Other');
  const dominant = domains[0] || d.domains?.[0];
  const activeShare = pct(d.totals?.activeRelationships || 0, d.totals?.connections || 1);
  const avgBalance = Math.round((d.relationships || []).reduce((s, x) => s + (x.balance || 0), 0) / Math.max(1, (d.relationships || []).length));

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

export function renderCareer(d) {
  document.getElementById('activeObjective').textContent = state.objective;
  if (!d) return;

  const rels = careerRelationships(d);
  const cooling = rels.filter(x => x.pulseState === 'Cooling').sort((a, b) => (a.connectionPulse || 0) - (b.connectionPulse || 0));
  const advocates = rels.filter(x => (x.advocateReadiness || 0) >= 65).sort((a, b) => (b.advocateReadiness || 0) - (a.advocateReadiness || 0));
  const reentry = rels.filter(x => (x.reentryScore || 0) >= 55).sort((a, b) => (b.reentryScore || 0) - (a.reentryScore || 0));

  document.getElementById('careerMetrics').innerHTML = [
    ['Cooling connections', cooling.length, 'Reconnect before context fades', 'pulse'],
    ['Advocate-ready ties', advocates.length, 'Validate comfort before referral asks', 'adv'],
    ['Re-entry windows', reentry.length, 'Dormant with strong history', 're'],
    ['Mutual exchanges', rels.filter(x => x.balance >= 65 && x.total >= 5).length, 'Balanced conversations', 'bal']
  ].map(c => `<article class="metric-card career-metric-card"><span class="label">${c[0]}<i class="metric-icon">${c[3]}</i></span><strong>${fmt(c[1])}</strong><small>${c[2]}</small></article>`).join('');

  const archetype = networkArchetype(d);
  const topGrid = document.getElementById('careerTopGrid');
  if (topGrid) {
    topGrid.innerHTML = `
      <section class="panel archetype-panel"><div class="panel-head"><div><span class="eyebrow">Network shape</span><h3>Your current search archetype</h3></div><span class="confidence-tag">High confidence</span></div>
        <div class="archetype-lockup"><div class="archetype-mark"><span></span><span></span><span></span></div><div><strong>${escapeHtml(archetype.name)}</strong><p>${escapeHtml(archetype.description)}</p></div></div>
        <div class="archetype-dimensions">${archetype.dimensions.map(([l, v]) => `<div class="archetype-row"><div><span>${l}</span><strong>${v}</strong></div><div class="progress"><span style="width:${v}%"></span></div></div>`).join('')}</div>
        <div class="job-action"><span>Job-search implication</span><p>${escapeHtml(archetype.action)}</p></div></section>
      <section class="panel route-panel"><div class="panel-head"><div><span class="eyebrow">Bridge route finder</span><h3>Warmest credible route</h3></div><span class="inference-tag">Inferred</span></div><p class="panel-copy">Enter a target organization or domain.</p><form class="route-form"><label>Target organization<input class="search-input" id="routeTarget" placeholder="e.g. Microsoft, AI governance"></label><label>Intent<input class="search-input" id="routeIntent" placeholder="e.g. role insight, referral"></label><button class="primary-button" type="submit">Find routes</button></form><div id="routeResults" class="route-results"></div></section>`;
  }

  const signalGrid = document.getElementById('careerSignalGrid');
  if (signalGrid) {
    signalGrid.innerHTML = `
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">Connection pulse</span><h3>Cooling relationships</h3></div></div><div id="pulseList" class="signal-list">${cooling.slice(0, 4).map(p => signalPersonHTML(p, p.connectionPulse || 0, 'pulse', `${ageLabel(p.daysSince)} since contact`)).join('') || '<p class="empty-signal">No cooling relationships.</p>'}</div></section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">Advocate readiness</span><h3>Referral potential</h3></div></div><div id="advocateList" class="signal-list">${advocates.slice(0, 4).map(p => signalPersonHTML(p, p.advocateReadiness || 0, 'readiness', `${p.balance}% mutuality`)).join('') || '<p class="empty-signal">No high-confidence advocate candidates.</p>'}</div></section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">Re-entry windows</span><h3>Strong dormant ties</h3></div></div><div id="reentryList" class="signal-list">${reentry.slice(0, 4).map(p => signalPersonHTML(p, p.reentryScore || 0, 'window', `${p.total} prior msgs`)).join('') || '<p class="empty-signal">No re-entry windows.</p>'}</div></section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">Search action queue</span><h3>This week</h3></div></div><div id="careerActionQueue" class="action-queue"></div></section>`;
  }

  const actions = [];
  if (cooling[0]) actions.push(['Reconnect', cooling[0], 'Send a context-led update before dormancy.']);
  if (advocates[0]) actions.push(['Role intel', advocates[0], 'Discuss team/market before testing referral.']);
  if (reentry[0]) actions.push(['Re-entry', reentry[0], 'Use shared history to reopen conversation.']);
  actions.push(['Profile', { name: 'Your LinkedIn profile', company: 'Positioning' }, 'Add concrete examples connecting your domains.']);
  const aq = document.getElementById('careerActionQueue');
  if (aq) {
    aq.innerHTML = actions.map((a, i) => `<div class="action-item"><span class="action-number">${i + 1}</span><div><strong>${a[0]} · ${escapeHtml(a[1].name)}</strong><small>${escapeHtml(a[1].company)}</small><p>${a[2]}</p></div></div>`).join('');
  }

  renderCareerLedger(d);
  findRoutes(d, 'AI governance', 'role insight');
}

function careerLedgerRows(d) {
  const rels = careerRelationships(d);
  if (state.careerLedgerFilter === 'pulse') return rels.filter(x => x.pulseState === 'Cooling').sort((a, b) => (a.connectionPulse || 0) - (b.connectionPulse || 0));
  if (state.careerLedgerFilter === 'advocates') return rels.filter(x => (x.advocateReadiness || 0) >= 60).sort((a, b) => (b.advocateReadiness || 0) - (a.advocateReadiness || 0));
  if (state.careerLedgerFilter === 'reentry') return rels.filter(x => (x.reentryScore || 0) > 0).sort((a, b) => (b.reentryScore || 0) - (a.reentryScore || 0));
  return rels.sort((a, b) => (b.advocateReadiness + b.reentryScore + b.connectionPulse) - (a.advocateReadiness + a.reentryScore + a.connectionPulse));
}

export function renderCareerLedger(d) {
  const titles = { all: 'Priority relationship actions', pulse: 'Cooling connections', advocates: 'Potential advocates', reentry: 'Re-entry opportunities' };
  const el = document.getElementById('careerLedgerTitle');
  if (el) el.textContent = titles[state.careerLedgerFilter];
  const rows = careerLedgerRows(d).slice(0, 30);
  const tbl = document.getElementById('careerLedger');
  if (!tbl) return;
  tbl.innerHTML = `<div class="table-row table-head"><div class="table-cell">Relationship</div><div class="table-cell">Pulse</div><div class="table-cell">Mutuality</div><div class="table-cell">Advocate</div><div class="table-cell">Next action</div></div>` +
    rows.map(p => `<div class="table-row"><div class="table-cell"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.company)} · ${escapeHtml(p.position)}</small></div><div class="table-cell"><span class="pulse-pill ${(p.pulseState || '').toLowerCase()}">${p.pulseState || '?'}</span><small>${p.connectionPulse || 0}/100</small></div><div class="table-cell"><strong>${p.balance}%</strong><small>${p.sent} sent · ${p.received} recv</small></div><div class="table-cell"><strong>${p.advocateReadiness || 0}/100</strong><div class="table-meter"><span style="width:${p.advocateReadiness || 0}%"></span></div></div><div class="table-cell"><span class="action-copy">${escapeHtml(p.searchAction || '')}</span></div></div>`).join('');
}

export function findRoutes(d, target, intent) {
  const cleanTarget = (target || '').trim();
  const cleanIntent = (intent || 'role insight').trim();
  const targetLower = cleanTarget.toLowerCase();
  const ranked = careerRelationships(d).map(p => {
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
