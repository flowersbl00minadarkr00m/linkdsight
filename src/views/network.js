/** Network map view (spec 001 T1). Canvas cluster bubbles + company ledger.
 *  drawNetwork / selectCluster / renderCompanyTable are exported because the
 *  shell wires canvas clicks, the map-mode toggle, search, and resize. */
import { fmt, pct, escapeHtml, COLORS } from '../utils.js';
import { state } from '../app/state.js';

export function renderNetwork(d) {
  document.getElementById('mapIntro').innerHTML = `Company and domain concentration across <span data-total="connections">${fmt(d.totals?.connections)}</span> first-degree connections.`;
  renderCompanyTable(d);
  setTimeout(() => drawNetwork(d), 100);
}

export function renderCompanyTable(d, query = '') {
  const rows = (d.companies || []).filter(x => x.name.toLowerCase().includes((query || '').toLowerCase()));
  const max = d.companies?.[0]?.count || 1;
  const el = document.getElementById('companyTable');
  if (!el) return;
  el.innerHTML = `<div class="table-row table-head"><div class="table-cell">Organization</div><div class="table-cell">Connections</div><div class="table-cell">Share</div><div class="table-cell">Concentration</div></div>` +
    rows.map((item, i) => `<div class="table-row"><div class="table-cell"><strong>${escapeHtml(item.name)}</strong><small>${i < 6 ? 'Core cluster' : 'Extended network'}</small></div><div class="table-cell">${fmt(item.count)}</div><div class="table-cell">${item.share}%</div><div class="table-cell"><div class="table-meter"><span style="width:${item.count / max * 100}%"></span></div></div></div>`).join('');
}

function seeded(i) {
  const x = Math.sin(i * 999 + 17) * 10000;
  return x - Math.floor(x);
}

function makeGraphNodes(d, width, height) {
  const source = state.mapMode === 'company'
    ? (d.companies || []).slice(0, 16)
    : (d.domains || []);
  const max = Math.max(...source.map(x => x.count), 1);
  return source.map((item, i) => {
    const angle = i * 2.399;
    const radius = i === 0 ? 0 : 58 + Math.sqrt(i) * 45;
    const cx = width / 2 + Math.cos(angle) * radius * (width > height ? 1.25 : .8) + (seeded(i) - .5) * 30;
    const cy = height / 2 + Math.sin(angle) * radius * .78 + (seeded(i + 2) - .5) * 22;
    return { item, x: cx, y: cy, r: 18 + Math.sqrt(item.count / max) * 44, color: COLORS[i % COLORS.length] };
  });
}

export function drawNetwork(d) {
  const canvas = document.getElementById('networkCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight || 460;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);

  state.graphNodes = makeGraphNodes(d, width, height);
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
    selectCluster(d, state.graphNodes[0].item);
  }
}

export function selectCluster(d, item) {
  if (!item) return;
  state.selectedCluster = item;
  document.getElementById('clusterName').textContent = item.name;
  document.getElementById('clusterCount').textContent = fmt(item.count);
  const share = item.share ?? pct(item.count, d.totals?.connections || 1);
  const bar = document.getElementById('clusterShareBar');
  if (bar) bar.style.width = `${Math.min(100, share * 4)}%`;
  document.getElementById('clusterDescription').textContent =
    `${item.name} accounts for ${share}% of your first-degree graph. ${share > 10 ? 'This is a material concentration.' : 'This cluster broadens your range of perspectives.'}`;
  document.getElementById('clusterDetails').innerHTML = `
    <div><dt>Share of graph</dt><dd>${share}%</dd></div>
    <div><dt>Concentration</dt><dd>${share > 10 ? 'High' : share > 4 ? 'Moderate' : 'Low'}</dd></div>
    <div><dt>Recommended posture</dt><dd>${share > 10 ? 'Diversify adjacent clusters' : 'Deepen selectively'}</dd></div>`;
}
