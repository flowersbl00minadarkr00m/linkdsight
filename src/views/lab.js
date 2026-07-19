/** Intelligence Lab view (spec 001 T1). renderIntelligenceLab + renderTopicGraph
 *  are exported because the shell wires topic-filter clicks and resize. */
import { fmt, escapeHtml, COLORS, normalizeAuthoritySignals } from '../utils.js';
import { state } from '../app/state.js';

export function renderIntelligenceLab(d) {
  if (!d.conversationTopics?.length) {
    const el = document.getElementById('labView');
    if (el) el.querySelector('.view-intro').innerHTML += '<p style="color:#915907">Conversation intelligence unavailable – messages.csv not found.</p>';
    return;
  }
  if (!d.conversationTopics.some(t => t.name === state.selectedTopic)) {
    state.selectedTopic = d.conversationTopics[0].name;
  }
  renderTopicFilters(d);
  renderTopicGraph(d);
  renderNextConversations(d);
  renderAuthoritySignals(d);
}

function renderTopicFilters(d) {
  const el = document.getElementById('topicFilters');
  if (!el) return;
  el.innerHTML = (d.conversationTopics || []).map(t => `
    <button class="chip ${t.name === state.selectedTopic ? 'active' : ''}" data-topic="${escapeHtml(t.name)}">
      ${escapeHtml(t.name)} <small>${fmt(t.messages)}</small>
    </button>
  `).join('');
}

function topicCandidates(d, topicName) {
  const all = [...(d.relationships || []), ...(d.staleRelationships || [])];
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

export function renderTopicGraph(d) {
  const svg = document.getElementById('topicGraph');
  if (!svg) return;
  const topic = (d.conversationTopics || []).find(t => t.name === state.selectedTopic);
  document.getElementById('topicGraphTitle').textContent = state.selectedTopic;
  const countEl = document.getElementById('topicGraphCount');
  if (countEl) countEl.textContent = topic ? `${fmt(topic.messages)} matched messages · ${fmt(topic.contacts)} contacts` : '';

  const contacts = topicCandidates(d, state.selectedTopic).slice(0, 8);
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

  html += `<g><rect x="18" y="${topicY - 38}" width="170" height="76" rx="5" fill="#e8f3ff" stroke="#0a66c2" stroke-width="1.5"/><text x="103" y="${topicY - 10}" text-anchor="middle" fill="#0a66c2" font-size="12" font-weight="700">${escapeHtml(state.selectedTopic)}</text><text x="103" y="${topicY + 14}" text-anchor="middle" fill="#666" font-size="9">${topic ? fmt(topic.messages) : 0} matched msgs</text></g>`;

  contacts.forEach((p, i) => {
    const cy = contactY(i);
    const name = p.name.length > 23 ? p.name.slice(0, 21) + '…' : p.name;
    html += `<g><circle cx="338" cy="${cy}" r="15" fill="${COLORS[i % COLORS.length]}dd" stroke="${COLORS[i % COLORS.length]}" stroke-width="2"/><text x="360" y="${cy - 3}" fill="#30363a" font-size="9">${escapeHtml(name)}</text><text x="360" y="${cy + 9}" fill="#757d81" font-size="7">${p.topicCount} matches · score ${p.conversationScore}</text></g>`;
  });

  uniqueCompanies.forEach((company, i) => {
    const cy = companyY(i);
    const label = company.length > 24 ? company.slice(0, 22) + '…' : company;
    html += `<g><rect x="590" y="${cy - 14}" width="154" height="28" rx="3" fill="#f3f2ef" stroke="#d7dce0"/><text x="600" y="${cy + 4}" fill="#30363a" font-size="9">${escapeHtml(label)}</text></g>`;
  });

  svg.innerHTML = html;
}

function renderNextConversations(d) {
  const el = document.getElementById('nextConversations');
  if (!el) return;
  const rows = topicCandidates(d, state.selectedTopic).slice(0, 4);
  el.innerHTML = rows.map((p, i) => {
    const timing = p.pulseState === 'Active' ? 'Deepen the conversation' : p.pulseState === 'Cooling' ? 'A topic-led update is timely' : 'Use a low-pressure re-entry';
    return `<article class="next-conversation-item"><span class="conversation-rank">0${i + 1}</span><div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.company)} · ${p.topicCount} topic-matched messages</small><p>${timing}</p></div><div class="conversation-score"><strong>${p.conversationScore}</strong><small>fit</small></div></article>`;
  }).join('') || '<p class="empty-signal">No supported next conversation for this topic.</p>';
}

function renderAuthoritySignals(d) {
  const el = document.getElementById('authoritySignals');
  if (!el) return;
  const signals = d.authoritySignals || [];
  if (!signals.length) { el.innerHTML = '<p class="empty-signal">No authority signal data available.</p>'; return; }
  const channels = ['private', 'public', 'learning', 'evidence'];
  const { maxes, rows } = normalizeAuthoritySignals(signals, channels);

  // Dot-plot, not bars: each channel is scaled to its own max across domains,
  // so bar *lengths* would invite cross-channel comparison of unlike scales
  // (a Learning count of 3 next to a Private score of 100). Dots read as
  // relative position within a channel; the raw value and channel max are
  // printed on every row.
  el.innerHTML = rows.map(({ signal: s, normalized }) => {
    const gap = normalized.private - normalized.public;
    const note = gap > 24 ? 'Private depth leads public visibility' : gap < -24 ? 'Public visibility leads private depth' : 'Aligned';
    return `<div class="authority-row"><div class="authority-label"><strong>${escapeHtml(s.name)}</strong><small>${note}</small></div><div class="authority-bars">${channels.map(c => `<div><span>${c}</span><div class="signal-track dot-track"><i class="${c} signal-dot" style="left:${normalized[c]}%"></i></div><strong>${s[c]}<small class="of-max"> / ${maxes[c]}</small></strong></div>`).join('')}</div></div>`;
  }).join('') + '<p class="scale-note">Each channel is scaled to its own maximum across domains. Dots show relative position within a channel; numbers are raw value / channel max — channels use different units and are not comparable to each other.</p>';
}
