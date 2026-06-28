/**
 * Transformation engine – ported from generate-data.ps1.
 * Pure functions: takes parsed CSV records, returns derived LinkdSight schema.
 */

import {
  getSeniority, getDomain, getTopicMatches, TOPIC_RULES,
  normalizeName, parseDate
} from './utils.js';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build connection index from Connections.csv records.
 *
 * Expected columns (after 3-row skip):
 *   First Name, Last Name, URL, Company, Position, Connected On
 */
function buildConnectionIndex(connections) {
  const index = new Map();
  const companyCounts = {};
  const seniorityCounts = {};
  const domainCounts = {};
  const domainCompanyCounts = {};
  const monthlyCounts = {};

  for (const row of connections) {
    const name = `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim();
    const key = normalizeName(name);
    const date = parseDate(row['Connected On']);
    const record = {
      name,
      url: row.URL || '',
      company: row.Company || 'Unknown',
      position: row.Position || 'Not listed',
      connectedOn: date ? date.toISOString().slice(0, 10) : null,
      seniority: getSeniority(row.Position),
      domain: getDomain(row.Company, row.Position)
    };

    if (key) index.set(key, record);
    if (row.URL) index.set(row.URL.toLowerCase(), record);

    const company = record.company;
    companyCounts[company] = (companyCounts[company] || 0) + 1;
    seniorityCounts[record.seniority] = (seniorityCounts[record.seniority] || 0) + 1;
    domainCounts[record.domain] = (domainCounts[record.domain] || 0) + 1;

    if (!domainCompanyCounts[record.domain]) domainCompanyCounts[record.domain] = {};
    domainCompanyCounts[record.domain][company] = (domainCompanyCounts[record.domain][company] || 0) + 1;

    if (date) {
      const month = date.toISOString().slice(0, 7);
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    }
  }

  return { index, companyCounts, seniorityCounts, domainCounts, domainCompanyCounts, monthlyCounts };
}

/**
 * Build relationship map from messages.csv, enriched by connection index.
 *
 * Expected message columns:
 *   FROM, TO, DATE, SUBJECT, CONTENT,
 *   SENDER PROFILE URL, RECIPIENT PROFILE URLS
 */
function buildRelationships(messages, connIndex, ownerName) {
  const relMap = new Map();
  const topicCounts = {};
  const ownerKey = normalizeName(ownerName);

  for (const msg of messages) {
    const senderKey = normalizeName(msg.FROM || '');
    const fromOwner = ownerKey
      ? senderKey === ownerKey
      : !String(msg['SENDER PROFILE URL'] || '').trim()
        && Boolean(String(msg['RECIPIENT PROFILE URLS'] || '').trim());
    const counterpartName = fromOwner
      ? (msg.TO || '').split(',')[0]
      : (msg.FROM || '');
    const counterpartUrl = fromOwner
      ? (msg['RECIPIENT PROFILE URLS'] || '').split(',')[0]
      : (msg['SENDER PROFILE URL'] || '');
    const key = counterpartUrl.trim()
      ? counterpartUrl.trim().toLowerCase()
      : normalizeName(counterpartName);

    if (!key || (ownerKey && normalizeName(counterpartName) === ownerKey)) continue;

    if (!relMap.has(key)) {
      const conn = connIndex.get(key) || connIndex.get(normalizeName(counterpartName));
      relMap.set(key, {
        name: counterpartName.trim(),
        url: counterpartUrl.trim(),
        company: conn ? conn.company : 'Not in connection export',
        position: conn ? conn.position : 'Not listed',
        domain: conn ? conn.domain : 'Other',
        connectedOn: conn ? conn.connectedOn : null,
        sent: 0,
        received: 0,
        firstContact: null,
        lastContact: null,
        lastSnippet: '',
        topicCounts: {}
      });
    }

    const rel = relMap.get(key);
    if (fromOwner) rel.sent++; else rel.received++;

    const topicText = `${msg.SUBJECT || ''} ${msg.CONTENT || ''}`;
    for (const topic of getTopicMatches(topicText)) {
      rel.topicCounts[topic] = (rel.topicCounts[topic] || 0) + 1;
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }

    const date = parseDate(msg.DATE);
    if (date) {
      if (!rel.firstContact || date < rel.firstContact) rel.firstContact = date;
      if (!rel.lastContact || date > rel.lastContact) {
        rel.lastContact = date;
        const snippet = (msg.CONTENT || '').replace(/\s+/g, ' ').trim();
        rel.lastSnippet = snippet.length > 115 ? snippet.substring(0, 112) + '...' : snippet;
      }
    }
  }

  return { relMap, topicCounts };
}

/**
 * Score a single relationship.
 */
function scoreRelationship(rel, asOf) {
  const total = rel.sent + rel.received;
  const days = rel.lastContact
    ? Math.max(0, Math.floor((asOf - rel.lastContact) / (1000 * 60 * 60 * 24)))
    : 3650;
  const balance = total
    ? Math.round(100 * Math.min(rel.sent, rel.received) / Math.max(rel.sent, rel.received))
    : 0;

  const seniorityBoost = /chief|president|partner|director|vice president|founder/i.test(rel.position)
    ? 12 : 0;

  const strength = Math.min(100, Math.round(12 * Math.log(total + 1) + 0.35 * balance + seniorityBoost - Math.min(24, days / 90)));

  const staleScore = days > 180 && total >= 4
    ? Math.round(Math.min(100, 25 + 11 * Math.log(total + 1) + Math.min(35, days / 30) + seniorityBoost))
    : 0;

  const firstDate = rel.firstContact || rel.lastContact || asOf;
  const spanDays = Math.max(1, Math.floor((rel.lastContact || asOf) - firstDate) / (1000 * 60 * 60 * 24));
  const cadenceDays = total > 1 ? Math.max(14, Math.round(spanDays / (total - 1))) : 365;

  const connectionPulse = Math.round(Math.max(0, Math.min(100, 94 - (58 * days / Math.max(45, cadenceDays * 3)) + (8 * Math.log(total + 1)))));

  const freshnessSignal = Math.max(-18, 20 - (days / 30));
  const advocateReadiness = Math.round(Math.max(0, Math.min(100, (0.28 * balance) + (7 * Math.log(total + 1)) + seniorityBoost + freshnessSignal)));

  const reentryScore = days > 120 && total >= 3
    ? Math.round(Math.min(100, (0.45 * advocateReadiness) + (0.25 * Math.max(staleScore, 35)) + (0.15 * Math.min(100, total * 1.5)) + seniorityBoost))
    : 0;

  const pulseState = days <= Math.max(90, cadenceDays * 1.5) ? 'Active'
    : days <= Math.max(180, cadenceDays * 3) ? 'Cooling' : 'Dormant';

  let searchAction;
  if (advocateReadiness >= 72 && days < 270) searchAction = 'Discuss role fit, then test referral comfort';
  else if (reentryScore >= 58) searchAction = 'Reconnect around shared context before making an ask';
  else if (balance < 35 && total >= 5) searchAction = 'Use a low-pressure update; do not lead with a request';
  else searchAction = 'Ask for market context or an informational conversation';

  const topics = Object.entries(rel.topicCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  return {
    name: rel.name, url: rel.url,
    company: rel.company, position: rel.position, domain: rel.domain,
    connectedOn: rel.connectedOn,
    sent: rel.sent, received: rel.received, total, balance,
    firstContact: rel.firstContact ? rel.firstContact.toISOString().slice(0, 10) : null,
    lastContact: rel.lastContact ? rel.lastContact.toISOString().slice(0, 10) : null,
    daysSince: days, strength, staleScore, cadenceDays,
    connectionPulse, pulseState, advocateReadiness, reentryScore, searchAction,
    lastSnippet: rel.lastSnippet, topics
  };
}

/**
 * Main transformation entry point.
 *
 * @param {Object} parsed - { connections, messages, shares, comments, reactions, invitations, positions, skills, certifications, endorsementsReceived, learning, profile }
 *   Each is an array of objects (PapaParse header:true output).
 *   'connections' are raw CSV rows; the first 3 should be skipped by the caller.
 * @param {string} [asOf] - Reference date for time-based scoring.
 * @returns {Object} Fully derived LinkdSight data object.
 */
export function transform(parsed, asOf = todayIso()) {
  const {
    connections = [],
    messages = [],
    shares = [],
    comments = [],
    reactions = [],
    invitations = [],
    positions = [],
    skills = [],
    certifications = [],
    endorsementsReceived = [],
    learning = [],
    profile = []
  } = parsed;

  const asOfDate = new Date(asOf);

  const profileRecord = profile[0] || {};
  const ownerName = `${profileRecord['First Name'] || ''} ${profileRecord['Last Name'] || ''}`.trim();

  // 1. Build connection index
  const { index: connIndex, companyCounts, seniorityCounts, domainCounts, domainCompanyCounts, monthlyCounts } =
    buildConnectionIndex(connections);

  // 2. Build relationships from messages
  const { relMap, topicCounts: conversationTopicCounts } =
    buildRelationships(messages, connIndex, ownerName);

  // 3. Score relationships
  const allRelationships = [];
  for (const rel of relMap.values()) {
    allRelationships.push(scoreRelationship(rel, asOfDate));
  }

  const relationshipLeaders = [...allRelationships]
    .sort((a, b) => b.total - a.total)
    .slice(0, 80);

  const staleRelationships = allRelationships
    .filter(r => r.staleScore > 0)
    .sort((a, b) => b.staleScore - a.staleScore || b.total - a.total)
    .slice(0, 40);

  // 4. Company, domain, seniority lists
  const companyList = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([name, count]) => ({ name, count, share: Math.round(count / Math.max(1, connections.length) * 1000) / 10 }));

  const seniorityList = Object.entries(seniorityCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const domainList = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, share: Math.round(count / Math.max(1, connections.length) * 1000) / 10 }));

  // 5. Growth by month
  const growth = Object.entries(monthlyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  // 6. Identity from shares
  const topicByYear = {};
  for (const share of shares) {
    const date = parseDate(share.Date);
    if (!date) continue;
    const year = String(date.getFullYear());
    if (!topicByYear[year]) topicByYear[year] = {};
    const text = share.ShareCommentary || '';
    for (const topic of Object.keys(TOPIC_RULES)) {
      if (TOPIC_RULES[topic].test(text)) {
        topicByYear[year][topic] = (topicByYear[year][topic] || 0) + 1;
      }
    }
  }

  const identity = Object.entries(topicByYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, counts]) => {
      const topics = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));
      const total = topics.reduce((s, t) => s + t.count, 0);
      return { year, total, topics };
    });

  // 7. Recent shares (first 12)
  const recentShares = shares.slice(0, 12).map(s => {
    const date = parseDate(s.Date);
    const text = (s.ShareCommentary || '').replace(/\s+/g, ' ').trim();
    return {
      date: date ? date.toISOString().slice(0, 10) : null,
      text: text.length > 190 ? text.substring(0, 187) + '...' : text,
      url: s.ShareLink || '',
      visibility: s.Visibility || ''
    };
  });

  // 8. Positions
  const positionList = positions.map(p => ({
    company: p['Company Name'] || '',
    title: (p.Title || '').trim(),
    started: p['Started On'] || '',
    finished: p['Finished On'] || ''
  }));

  // 9. Conversation topics
  const conversationTopics = Object.keys(TOPIC_RULES)
    .map(topic => ({
      name: topic,
      messages: conversationTopicCounts[topic] || 0,
      contacts: allRelationships.filter(r => (r.topics || []).some(t => t.name === topic)).length
    }))
    .sort((a, b) => b.messages - a.messages);

  // 10. Authority signals
  const publicTopicCounts = {};
  for (const share of shares) {
    for (const topic of getTopicMatches(share.ShareCommentary || '')) {
      publicTopicCounts[topic] = (publicTopicCounts[topic] || 0) + 1;
    }
  }
  for (const comment of comments) {
    for (const topic of getTopicMatches(comment.Message || '')) {
      publicTopicCounts[topic] = (publicTopicCounts[topic] || 0) + 1;
    }
  }

  const learningTopicCounts = {};
  for (const item of learning) {
    const text = `${item['Content Title'] || ''} ${item['Content Description'] || ''}`;
    for (const topic of getTopicMatches(text)) {
      learningTopicCounts[topic] = (learningTopicCounts[topic] || 0) + 1;
    }
  }

  const evidenceTopicCounts = {};
  const evidenceTexts = [
    ...skills.map(s => s.Name || ''),
    ...certifications.map(c => `${c.Name || ''} ${c.Authority || ''}`),
    ...endorsementsReceived.map(e => e['Skill Name'] || ''),
    ...positions.map(p => `${p.Title || ''} ${p.Description || ''}`)
  ];
  for (const text of evidenceTexts) {
    for (const topic of getTopicMatches(text)) {
      evidenceTopicCounts[topic] = (evidenceTopicCounts[topic] || 0) + 1;
    }
  }

  const authoritySignals = Object.keys(TOPIC_RULES).map(topic => ({
    name: topic,
    private: conversationTopicCounts[topic] || 0,
    public: publicTopicCounts[topic] || 0,
    learning: learningTopicCounts[topic] || 0,
    evidence: evidenceTopicCounts[topic] || 0
  }));

  // 11. Network resilience
  const domainResilience = domainList
    .filter(d => d.name !== 'Other')
    .map(domain => {
      const companyMap = domainCompanyCounts[domain.name] || {};
      const topEntry = Object.entries(companyMap).sort((a, b) => b[1] - a[1])[0];
      const activeRelationships = allRelationships.filter(r => r.domain === domain.name && r.total >= 2).length;
      return {
        name: domain.name,
        connections: domain.count,
        organizations: Object.keys(companyMap).length,
        topCompany: topEntry ? topEntry[0] : 'Unknown',
        topCompanyShare: topEntry ? Math.round(topEntry[1] / Math.max(1, domain.count) * 1000) / 10 : 0,
        activeRelationships
      };
    });

  const dominantCompany = companyList[0] || { name: 'Unknown', share: 0 };
  const strongOutsideDominant = allRelationships.filter(r =>
    r.total >= 2 && r.strength >= 50 && r.company !== dominantCompany.name
  ).length;

  const networkResilience = {
    dominantCompany: dominantCompany.name,
    dominantCompanyShare: dominantCompany.share,
    outsideDominantShare: Math.round((100 - dominantCompany.share) * 10) / 10,
    strongOutsideDominant,
    independentDomains: domainResilience.filter(d => d.activeRelationships >= 5 && d.organizations >= 5).length,
    domains: domainResilience
  };

  // 12. Profile
  const profileOut = {
    name: ownerName || 'Unknown',
    headline: profileRecord.Headline || '',
    location: profileRecord['Geo Location'] || '',
    industry: profileRecord.Industry || ''
  };

  // 13. Totals
  const totals = {
    connections: connections.length,
    messages: messages.length,
    shares: shares.length,
    comments: comments.length,
    reactions: reactions.length,
    invitations: invitations.length,
    activeRelationships: allRelationships.filter(r => r.total >= 2).length,
    staleRelationships: allRelationships.filter(r => r.staleScore > 0).length
  };

  const coverage = {
    inboundContentReactions: false,
    note: 'The LinkedIn export records your reactions to other content, but not who reacted to your posts. Message reciprocity is available; inbound post reactions require a separate creator analytics export or manual import.'
  };

  return {
    generatedAt: new Date().toISOString(),
    exportDate: asOf,
    profile: profileOut,
    totals,
    companies: companyList,
    seniority: seniorityList,
    domains: domainList,
    growth,
    relationships: relationshipLeaders,
    staleRelationships,
    recentShares,
    identity,
    positions: positionList,
    conversationTopics,
    authoritySignals,
    networkResilience,
    coverage
  };
}

/**
 * Lightweight validation report that runs before full transformation.
 * Returns what was found, missing, malformed, or unsupported.
 */
export function validateParsed(parsed) {
  const expected = [
    'connections', 'messages', 'shares', 'comments', 'reactions',
    'invitations', 'positions', 'skills', 'certifications',
    'endorsementsReceived', 'learning', 'profile'
  ];

  const report = { found: [], missing: [], malformed: [], partial: [] };

  for (const name of expected) {
    const records = parsed[name];
    if (!records || !Array.isArray(records)) {
      report.missing.push(name);
      continue;
    }
    if (records.length === 0) {
      report.missing.push(name);
      continue;
    }
    report.found.push({ name, count: records.length });
  }

  // Check connections for expected fields
  if (parsed.connections && parsed.connections.length > 0) {
    const first = parsed.connections[0];
    const expectedConnFields = ['First Name', 'Last Name', 'Company', 'Position'];
    const present = expectedConnFields.filter(f => f in first);
    if (present.length < 3) {
      report.malformed.push('connections (missing expected columns)');
      report.found = report.found.filter(f => f.name !== 'connections');
    }
  }

  return report;
}

export default { transform, validateParsed };
