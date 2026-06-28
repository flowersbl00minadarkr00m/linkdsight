/**
 * Privacy-sensitive context packet construction for optional AI advisor.
 *
 * Never includes raw ZIP or raw message bodies.
 * Uses only derived aggregates and summary statistics.
 * Configurable token/size cap.
 */

const DEFAULT_MAX_TOKENS = 4000;

/**
 * Build a minimized context packet from derived data.
 *
 * @param {Object} data - Full LinkdSight derived dataset.
 * @param {Object} options
 * @param {number} options.maxTokens - Rough token budget (4 chars ≈ 1 token).
 * @param {string} options.question - The user's question for context targeting.
 * @returns {Object} { packet, estimatedTokens, includedFields }
 */
export function buildContextPacket(data, options = {}) {
  const { maxTokens = DEFAULT_MAX_TOKENS, question = '' } = options;
  const charBudget = maxTokens * 4;

  const packet = {
    _meta: {
      generatedAt: new Date().toISOString(),
      derivedFrom: 'LinkdSight local-first analysis',
      dataExportDate: data.exportDate || 'unknown',
      privacyNote: 'Contains derived aggregates and summary statistics. Contact names, email addresses, profile URLs, and raw messages are excluded. Organization and topic labels may be included.'
    },
    overview: {
      totalConnections: data.totals?.connections || 0,
      totalMessages: data.totals?.messages || 0,
      activeRelationships: data.totals?.activeRelationships || 0,
      staleRelationships: data.totals?.staleRelationships || 0,
      totalShares: data.totals?.shares || 0,
      totalComments: data.totals?.comments || 0,
      totalReactions: data.totals?.reactions || 0
    },
    domains: (data.domains || []).map(d => ({
      name: d.name,
      share: d.share,
      count: d.count
    })),
    companies: (data.companies || []).slice(0, 5).map(c => ({
      name: c.name,
      share: c.share,
      count: c.count
    })),
    growthSummary: summarizeGrowth(data.growth || []),
    relationshipSummary: {
      averageStrength: averageOf((data.relationships || []).map(r => r.strength)),
      averageBalance: averageOf((data.relationships || []).map(r => r.balance)),
      topSeniority: topNSeniorities(data.relationships || []),
      staleCount: (data.staleRelationships || []).length
    },
    identitySummary: summarizeIdentity(data.identity || []),
    conversationTopics: (data.conversationTopics || []).map(t => ({
      name: t.name,
      messages: t.messages,
      contacts: t.contacts
    })),
    networkResilience: data.networkResilience ? {
      dominantCompany: data.networkResilience.dominantCompany,
      dominantCompanyShare: data.networkResilience.dominantCompanyShare,
      outsideDominantShare: data.networkResilience.outsideDominantShare,
      independentDomains: data.networkResilience.independentDomains
    } : null,
    questionContext: question || null
  };

  // Measure and truncate if needed
  let json = JSON.stringify(packet);
  if (json.length > charBudget) {
    // Remove largest fields progressively
    const fields = ['domains', 'conversationTopics', 'growthSummary', 'relationshipSummary'];
    for (const field of fields) {
      delete packet[field];
      json = JSON.stringify(packet);
      if (json.length <= charBudget) break;
    }
  }

  return {
    packet,
    estimatedTokens: Math.ceil(json.length / 4),
    includedFields: Object.keys(packet).filter(k => k !== '_meta' && packet[k] != null)
  };
}

function summarizeGrowth(growth) {
  if (!growth || growth.length === 0) return null;
  const total = growth.reduce((s, g) => s + (g.count || 0), 0);
  const last12 = growth.slice(-12);
  const recent = last12.reduce((s, g) => s + (g.count || 0), 0);
  return {
    totalConnectionsAdded: total,
    recent12Months: recent,
    recentMonthlyAverage: Math.round(recent / Math.max(1, last12.length)),
    quarters: growth.slice(-4).map(g => ({ month: g.month, count: g.count }))
  };
}

function summarizeIdentity(identity) {
  if (!identity || identity.length === 0) return null;
  const latest = identity[identity.length - 1];
  return {
    yearsTracked: identity.length,
    latestYear: latest.year,
    topThemes: (latest.topics || []).slice(0, 3).map(t => ({ name: t.name, count: t.count }))
  };
}

function averageOf(arr) {
  if (!arr || arr.length === 0) return 0;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}

function topNSeniorities(relationships) {
  const counts = {};
  for (const r of relationships) {
    const s = getSeniority(r.position);
    counts[s] = (counts[s] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }));
}

function getSeniority(position) {
  const p = (position || '').toLowerCase();
  if (/chief|\bceo\b|\bcfo\b|\bcio\b|president|founder|partner|executive/i.test(p)) return 'Executive';
  if (/vice president|\bvp\b|director|head of/i.test(p)) return 'Director/VP';
  if (/senior manager|manager|lead|principal/i.test(p)) return 'Manager/Lead';
  return 'Professional';
}

/**
 * Test that no raw identifiers leak into the packet.
 * @returns {Array<string>} Leaked fields, empty array if clean.
 */
export function auditPacket(packetObj) {
  const issues = [];
  const json = JSON.stringify(packetObj);
  const rawFields = ['rawMessages', 'rawZip', 'messageBodies', 'fullNames', 'emailAddresses'];

  for (const field of rawFields) {
    if (json.toLowerCase().includes(field.toLowerCase())) {
      issues.push(`Potential leak: packet references "${field}"`);
    }
  }

  // Ensure _meta.privacyNote is present
  if (!packetObj._meta || !packetObj._meta.privacyNote) {
    issues.push('Missing _meta.privacyNote');
  }

  return issues;
}

export default { buildContextPacket, auditPacket };
