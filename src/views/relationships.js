/** Relationships view (spec 001 T1). renderRelationshipTable is also called
 *  from the shell's event wiring (filter chips + search), so it takes appData
 *  explicitly and reads the shared filter from state. */
import { fmt, pct, escapeHtml, shortDate, ageLabel } from '../utils.js';
import { state } from '../app/state.js';

export function renderRelationships(d) {
  const rel = d.relationships || [];
  const sent = rel.reduce((s, x) => s + (x.sent || 0), 0);
  const received = rel.reduce((s, x) => s + (x.received || 0), 0);
  const balanced = rel.filter(x => x.balance >= 60).length;
  const dormant = (d.staleRelationships || []).length;

  document.getElementById('relationshipMetrics').innerHTML = [
    ['Direct relationships', rel.length, 'Top relationships shown'],
    ['Messages sent', sent, `${pct(sent, sent + received)}% of ledger`],
    ['Balanced exchanges', balanced, '60%+ reciprocity'],
    ['Reconnect queue', dormant, 'Established and quiet']
  ].map(x => `<div class="strip-item"><span>${x[0]}</span><strong>${fmt(x[1])}</strong><small>${x[2]}</small></div>`).join('');

  renderRelationshipTable(d);
}

export function currentRelationships(d) {
  if (state.relationshipFilter === 'stale') return d.staleRelationships || [];
  if (state.relationshipFilter === 'imbalanced') return (d.relationships || []).filter(x => x.total >= 4).sort((a, b) => a.balance - b.balance);
  return [...(d.relationships || [])].sort((a, b) => b.total - a.total);
}

export function renderRelationshipTable(d, query = '') {
  const titles = { stale: 'Reconnect queue', active: 'Most active relationships', imbalanced: 'Low-reciprocity relationships' };
  const el = document.getElementById('relationshipTableTitle');
  if (el) el.textContent = titles[state.relationshipFilter];
  const rows = currentRelationships(d).filter(x => `${x.name} ${x.company}`.toLowerCase().includes((query || '').toLowerCase())).slice(0, 40);
  const tbl = document.getElementById('relationshipTable');
  if (!tbl) return;
  tbl.innerHTML = `<div class="table-row table-head"><div class="table-cell">Person</div><div class="table-cell">Sent / received</div><div class="table-cell">Reciprocity</div><div class="table-cell">Last contact</div><div class="table-cell">Priority</div></div>` +
    rows.map(p => {
      const max = Math.max(p.sent, p.received, 1);
      const priority = state.relationshipFilter === 'stale' ? p.staleScore : p.strength;
      return `<div class="table-row"><div class="table-cell"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.company)} · ${escapeHtml(p.position)}</small></div><div class="table-cell"><strong>${p.sent} / ${p.received}</strong><div class="balance"><span class="sent" style="width:${p.sent/max*38}px"></span><span class="received" style="width:${p.received/max*38}px"></span></div></div><div class="table-cell">${p.balance}%</div><div class="table-cell"><strong>${shortDate(p.lastContact)}</strong><small>${ageLabel(p.daysSince)} ago</small></div><div class="table-cell"><span class="score">${priority}</span></div></div>`;
    }).join('');
}
