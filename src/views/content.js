/**
 * Content ledger view (spec 001 T1).
 * Pattern for extracted views: export render<Name>(appData); no module state;
 * shell owns data and calls this on view switch / data change.
 */
import { fmt, pct, escapeHtml, shortDate } from '../utils.js';

export function renderContent(d) {
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
