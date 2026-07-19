/** Identity shift view (spec 001 T1). See views/content.js for the pattern. */
import { escapeHtml, COLORS } from '../utils.js';

export function renderIdentity(d) {
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
