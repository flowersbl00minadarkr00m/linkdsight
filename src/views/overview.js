/** Overview view (spec 001 T1). Pure render from appData + shared state. */
import { fmt, escapeHtml, initials, ageLabel, COLORS } from '../utils.js';
import { state } from '../app/state.js';

export function renderOverview(d) {
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

  renderGrowthChart(d);
  renderDomainBars(d);
  renderStalePreview(d);
  renderGoalCoverage(d);
}

function renderGrowthChart(d) {
  const svg = document.getElementById('growthChart');
  if (!svg) return;
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

function renderDomainBars(d) {
  const el = document.getElementById('domainBars');
  if (!el) return;
  const domains = (d.domains || []).slice(0, 5);
  const max = domains[0]?.count || 1;
  el.innerHTML = domains.map((item, i) =>
    `<div class="bar-row"><div class="bar-row-head"><span>${escapeHtml(item.name)}</span><span>${fmt(item.count)} · ${item.share}%</span></div><div class="progress"><span style="width:${item.count / max * 100}%;background:${COLORS[i % COLORS.length]}"></span></div></div>`
  ).join('');
}

function renderStalePreview(d) {
  const el = document.getElementById('stalePreview');
  if (!el) return;
  el.innerHTML = (d.staleRelationships || []).slice(0, 4).map(p =>
    `<div class="person-row"><span class="avatar">${initials(p.name)}</span><div class="person-meta"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.company)} · ${p.total} messages</small></div><span class="days-tag">${ageLabel(p.daysSince)}</span></div>`
  ).join('');
}

function renderGoalCoverage(d) {
  const el = document.getElementById('goalCoverage');
  if (!el) return;
  const domainMap = Object.fromEntries((d.domains || []).map(x => [x.name, x]));
  const targets = [12, 6, 8];
  el.innerHTML = state.goals.map((goal, i) => {
    const item = domainMap[goal] || { count: 0, share: 0 };
    const target = targets[i] || 8;
    const status = item.share >= target ? 'On target' : `${(target - item.share).toFixed(1)} pts below`;
    return `<div class="goal-coverage-row"><div><strong>${escapeHtml(goal)}</strong><small>${fmt(item.count)} connections · ${status}</small><div class="progress"><span style="width:${Math.min(100, item.share / target * 100)}%;background:${COLORS[i]}"></span></div></div><div class="coverage-value">${item.share}%</div></div>`;
  }).join('');
}
