/** Shared helpers */

export const fmt = (value) => new Intl.NumberFormat('en-CA').format(value || 0);

export const pct = (value, total) => total ? Math.round(value / total * 100) : 0;

export const initials = (name) => (name || '?').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[char]));

export const shortDate = (value) => {
  if (!value) return 'Unknown';
  const d = new Date(value + 'T00:00:00');
  return d.toLocaleDateString('en-CA', {year:'numeric', month:'short'});
};

export const ageLabel = (days) => days > 730 ? `${Math.round(days / 365)} years` : days > 365 ? '1 year' : `${Math.round(days / 30)} months`;

export const parseDate = (value) => {
  if (!value) return null;
  const clean = String(value).replace(/\s+UTC$/, '');
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
};

export const normalizeName = (value) => {
  if (!value) return '';
  return value.replace(/,?\s+(CPA|CA|CFA|MBA|MA|MSc|PMP|ICD\.D|FCPA|FCA)(,|\s|$).*$/i, '').replace(/[^a-zA-Z0-9 ]/g, '').trim().toLowerCase();
};

export const getSeniority = (position) => {
  const p = (position || '').toLowerCase();
  if (/\bvice president\b/i.test(p)) return 'Director & VP';
  if (/chief|\bceo\b|\bcfo\b|\bcio\b|\bcto\b|\bpresident\b|founder|partner|executive/i.test(p)) return 'Executive & Partner';
  if (/\bvp\b|director|head of/i.test(p)) return 'Director & VP';
  if (/senior manager|manager|lead|principal/i.test(p)) return 'Manager & Lead';
  if (/student|intern|co-op|assistant/i.test(p)) return 'Early Career';
  return 'Professional';
};

export const getDomain = (company, position) => {
  const text = `${company || ''} ${position || ''}`.toLowerCase();
  if (/artificial intelligence|\bai\b|machine learning|data|software|technology|digital|cyber/i.test(text)) return 'AI & Technology';
  if (/risk|assurance|audit|compliance|governance|control|accounting|pwc|kpmg|deloitte|ey\b|bdo|mnp/i.test(text)) return 'Risk, GRC & Assurance';
  if (/university|college|school|education|alumni/i.test(text)) return 'Education & Community';
  if (/foundation|society|association|nonprofit|non-profit|community|board/i.test(text)) return 'Board & Nonprofit';
  if (/mining|minerals|forestry|resources|energy|oil|gas/i.test(text)) return 'Resources';
  if (/bank|capital|financial|finance|wealth|insurance|rbc|td\b|bmo|cibc|scotiabank/i.test(text)) return 'Financial Services';
  return 'Other';
};

export const TOPIC_RULES = {
  'AI & Technology': /\bAI\b|artificial intelligence|technology|digital|automation|machine learning|data|software|cyber/i,
  'Risk, GRC & Trust': /risk|governance|compliance|assurance|audit|control|trust|privacy|security/i,
  'Finance & Operations': /finance|financial|accounting|budget|bank|capital|operations|process|system/i,
  'Careers & Learning': /career|learning|student|mentor|recruit|skill|professional|course|training/i,
  'Leadership & Boards': /leadership|leader|board|chair|alumni|association|volunteer|strategy/i,
  'Community & Inclusion': /community|inclusion|diversity|belonging|culture/i
};

export function getTopicMatches(text) {
  if (!text) return [];
  return Object.keys(TOPIC_RULES).filter(topic => TOPIC_RULES[topic].test(text));
}

export const COLORS = ['#0a66c2', '#378fe9', '#057642', '#915907', '#7a3e9d', '#c37d16'];
