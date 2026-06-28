/**
 * Advisor system: Local Insights (deterministic, offline) + Optional AI Advisor.
 */

import { fmt, shortDate } from './utils.js';

/**
 * Deterministic local insights advisor.
 * Each response identifies the data used.
 */
export function localInsight(question, data) {
  const q = question.toLowerCase();
  const top = data.companies?.[0];
  const topDomain = data.domains?.[0];

  // Where is my network thin?
  if (/thin|under|gap|build|concentrat/i.test(q)) {
    const domains = (data.domains || []).filter(d => d.share < 10).slice(0, 3);
    const domainNames = domains.map(d => `${d.name} (${d.share}%)`).join(', ') || 'several domains';
    return {
      title: 'Where your network is thin',
      body: `Your clearest gap is in ${domainNames}. The dominant domain, ${topDomain?.name || 'Unknown'}, represents ${topDomain?.share || 0}% of your graph. I would avoid adding contacts indiscriminately. Start with 10 to 15 people who bridge your thinner domains and your existing credibility.`,
      dataUsed: ['domains', 'totals.connections'],
      confidence: 'observed'
    };
  }

  // Who should I reconnect with?
  if (/reconnect|stale|quiet/i.test(q)) {
    const people = (data.staleRelationships || []).slice(0, 3);
    if (!people.length) {
      return {
        title: 'Reconnect candidates',
        body: 'No relationships currently meet the stale threshold. This means your active relationships are current, or the export does not contain enough message history.',
        dataUsed: ['staleRelationships', 'relationships'],
        confidence: 'observed'
      };
    }
    const list = people.map(p =>
      `${p.name} (${p.company}, ${p.total} messages, last contact ${shortDate(p.lastContact)})`
    ).join('; ');
    return {
      title: 'Top reconnect candidates',
      body: `Start with three established relationships. ${list}. They rank highly because there is enough interaction history to make reconnection natural, but the relationship has been quiet long enough to warrant attention. Review the context before reaching out; the export can rank attention but cannot judge personal circumstances.`,
      dataUsed: ['staleRelationships', 'relationships.staleScore', 'relationships.total', 'relationships.lastContact'],
      confidence: 'derived'
    };
  }

  // Career / identity
  if (/identity|shift|career|narrative/i.test(q)) {
    const positions = (data.positions || []).slice(0, 3);
    const posList = positions.map(p => `${p.title} at ${p.company}`).join(' → ');
    return {
      title: 'Your identity shift',
      body: `Your position history shows progression through ${posList}. Your recent publishing and interaction signals suggest a broadening identity spanning technology, governance, and community leadership. The profile opportunity is to connect those threads explicitly.`,
      dataUsed: ['positions', 'identity', 'conversationTopics'],
      confidence: 'inferred'
    };
  }

  // Profile / headline
  if (/profile|headline|about|enhance|improve/i.test(q)) {
    return {
      title: 'Profile optimization',
      body: `Your headline lists credible roles but may not yet state the through-line. Consider leading with the value you create, then retaining the strongest proof points. Make the first clause do more strategic work by connecting your domains of expertise.`,
      dataUsed: ['profile.headline', 'profile.industry', 'positions', 'skills'],
      confidence: 'inferred'
    };
  }

  // Referral / advocate
  if (/referral|advocate|vouch|warm path|introduction|route/i.test(q)) {
    const advocate = [...(data.relationships || [])]
      .sort((a, b) => (b.advocateReadiness || 0) - (a.advocateReadiness || 0))[0];
    if (!advocate) {
      return {
        title: 'Advocate readiness',
        body: 'No high-confidence advocate candidates are available in the current dataset. This may indicate limited message history or relationships that have not yet reached the advocate-readiness threshold.',
        dataUsed: ['relationships.advocateReadiness', 'relationships'],
        confidence: 'unavailable'
      };
    }
    return {
      title: 'Top advocate candidate',
      body: `${advocate.name} is the highest modeled Advocate Readiness candidate in this snapshot. The score is based on ${advocate.total} messages, ${advocate.balance}% mutuality and recency. It does not mean they have agreed to advocate. The appropriate action is to discuss the role and your fit first.`,
      dataUsed: ['relationships.advocateReadiness', 'relationships.total', 'relationships.balance'],
      confidence: 'derived'
    };
  }

  // Content / engagement
  if (/content|post|reaction|engag/i.test(q)) {
    return {
      title: 'Content and engagement',
      body: `The export records ${fmt(data.totals?.shares || 0)} posts, ${fmt(data.totals?.comments || 0)} comments and ${fmt(data.totals?.reactions || 0)} reactions you made. It does not identify who reacted to your posts. Use this tool to assess topic consistency and attention allocation; import creator analytics separately before making claims about audience response.`,
      dataUsed: ['totals.shares', 'totals.comments', 'totals.reactions', 'coverage'],
      confidence: 'observed'
    };
  }

  // General / strategic
  return {
    title: 'Strategic network observation',
    body: `The strongest observation is concentration. ${top?.name || 'Unknown'} represents ${top?.share || 0}% of your first-degree network, and ${topDomain?.name || 'Unknown'} is the dominant domain. Your next useful move is deliberate bridge-building across your thinner domains while reactivating relationships that already connect those areas.`,
    dataUsed: ['companies', 'domains', 'totals', 'staleRelationships'],
    confidence: 'observed'
  };
}

/**
 * AI Advisor settings management.
 * Secrets are stored in sessionStorage only.
 */
export const AI_SETTINGS_KEY = 'linkdsight_ai_settings';

export const AI_PROVIDER_PRESETS = {
  custom: { label: 'Custom compatible endpoint', endpoint: '', model: '' },
  ollama: {
    label: 'Ollama (local)',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    model: 'llama3.1'
  },
  openai: {
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  },
  openrouter: {
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openai/gpt-4o-mini'
  },
  deepseek: {
    label: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat'
  },
  groq: {
    label: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile'
  },
  together: {
    label: 'Together AI',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
  },
  mistral: {
    label: 'Mistral',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest'
  }
};

export function getAISettings() {
  const defaults = { enabled: false, provider: 'custom', endpoint: '', model: '', apiKey: '' };
  try {
    const raw = sessionStorage.getItem(AI_SETTINGS_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

export function saveAISettings(settings) {
  // Never persist API key to localStorage – sessionStorage only
  sessionStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}

export function clearAISecrets() {
  sessionStorage.removeItem(AI_SETTINGS_KEY);
}

/**
 * Send a request to an OpenAI-compatible endpoint.
 *
 * @param {Object} contextPacket - The minimized context packet.
 * @param {string} question - User question.
 * @param {Object} settings - AI settings from getAISettings().
 * @param {Object} options - { signal, timeout }
 * @returns {Promise<{text: string, error?: string}>}
 */
export async function askAI(contextPacket, question, settings, options = {}) {
  if (!settings.endpoint) {
    return { text: '', error: 'No endpoint configured.' };
  }

  const systemPrompt = `You are LinkdSight Advisor, a network intelligence assistant. You analyze LinkedIn export data to provide strategic insights. You are given a context packet derived from the user's LinkedIn export. The packet contains aggregate statistics and summary data. Contact names, email addresses, profile URLs, and raw messages are excluded; organization and topic labels may be included.

Important rules:
- Base your analysis only on the data provided in the context packet.
- If data is insufficient to answer confidently, say so.
- Never fabricate data or claim to see information not present in the packet.
- Be direct and actionable. Prioritize usefulness over politeness.
- Identify what data supports each recommendation.
- Respect that derived scores are estimates, not certainties.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Context packet:\n${JSON.stringify(contextPacket.packet, null, 2)}\n\nQuestion: ${question}` }
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);
  if (options.signal) options.signal.addEventListener('abort', () => controller.abort());

  try {
    const response = await fetch(settings.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.apiKey ? { 'Authorization': `Bearer ${settings.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o-mini',
        messages,
        max_tokens: 800,
        temperature: 0.3
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { text: '', error: `API error ${response.status}: ${errText.slice(0, 200)}` };
    }

    const json = await response.json();
    const text = json.choices?.[0]?.message?.content || '';
    return { text };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { text: '', error: 'Request timed out or was cancelled.' };
    }
    return { text: '', error: `Connection failed: ${err.message}. Ensure the endpoint supports CORS from browser origins.` };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Test AI endpoint connection.
 */
export async function testAIConnection(settings, options = {}) {
  if (!settings.endpoint) {
    return { ok: false, error: 'No endpoint configured.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);

  try {
    const response = await fetch(settings.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.apiKey ? { 'Authorization': `Bearer ${settings.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Respond with "ok" only.' }],
        max_tokens: 5
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { ok: false, error: `Status ${response.status}: ${errText.slice(0, 200)}` };
    }

    return { ok: true, model: settings.model };
  } catch (err) {
    return { ok: false, error: `Connection failed: ${err.message}` };
  } finally {
    clearTimeout(timeout);
  }
}

export default { localInsight, getAISettings, saveAISettings, clearAISecrets, AI_PROVIDER_PRESETS, askAI, testAIConnection };
