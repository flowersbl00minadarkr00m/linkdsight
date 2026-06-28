/**
 * Tests for CSV normalization and transformation logic.
 */

import { describe, it, expect } from 'vitest';
import { transform, validateParsed } from '../src/transform.js';
import { generateSampleData } from '../src/sample-data.js';
import {
  normalizeName, getSeniority, getDomain, getTopicMatches,
  parseDate, initials, fmt, pct
} from '../src/utils.js';

/* ── Utility tests ─────────────────────────────── */
describe('normalizeName', () => {
  it('strips professional designations', () => {
    expect(normalizeName('John Smith, CPA')).toBe('john smith');
    expect(normalizeName('Jane Doe, CFA, MBA')).toBe('jane doe');
    expect(normalizeName('Bob Wilson PMP')).toBe('bob wilson');
  });

  it('removes special characters', () => {
    expect(normalizeName('María José García-López')).toBe('mara jos garcalpez');
  });

  it('handles empty input', () => {
    expect(normalizeName('')).toBe('');
    expect(normalizeName(null)).toBe('');
  });

  it('lowercases and trims', () => {
    expect(normalizeName('  ALICE BROWN  ')).toBe('alice brown');
  });
});

describe('getSeniority', () => {
  it('identifies executives', () => {
    expect(getSeniority('Chief Technology Officer')).toBe('Executive & Partner');
    expect(getSeniority('CEO')).toBe('Executive & Partner');
    expect(getSeniority('Founder & CEO')).toBe('Executive & Partner');
    expect(getSeniority('Partner')).toBe('Executive & Partner');
  });

  it('identifies directors', () => {
    expect(getSeniority('Vice President of Engineering')).toBe('Director & VP');
    expect(getSeniority('Director of Marketing')).toBe('Director & VP');
    expect(getSeniority('Head of Product')).toBe('Director & VP');
  });

  it('identifies managers', () => {
    expect(getSeniority('Senior Manager')).toBe('Manager & Lead');
    expect(getSeniority('Lead Engineer')).toBe('Manager & Lead');
  });

  it('identifies early career', () => {
    expect(getSeniority('Intern')).toBe('Early Career');
    expect(getSeniority('Student Assistant')).toBe('Early Career');
  });

  it('defaults to Professional', () => {
    expect(getSeniority('Software Engineer')).toBe('Professional');
    expect(getSeniority('')).toBe('Professional');
  });
});

describe('getDomain', () => {
  it('classifies AI & Technology', () => {
    expect(getDomain('OpenAI', 'Data Scientist')).toBe('AI & Technology');
    expect(getDomain('Google', 'Software Engineer')).toBe('AI & Technology');
    expect(getDomain('CyberCorp', '')).toBe('AI & Technology');
  });

  it('classifies Risk & GRC', () => {
    expect(getDomain('PwC', 'Audit Manager')).toBe('Risk, GRC & Assurance');
    expect(getDomain('Deloitte', '')).toBe('Risk, GRC & Assurance');
    expect(getDomain('Acme', 'Compliance Officer')).toBe('Risk, GRC & Assurance');
  });

  it('classifies Education', () => {
    expect(getDomain('University of Toronto', 'Professor')).toBe('Education & Community');
  });

  it('classifies Financial Services', () => {
    expect(getDomain('RBC', 'Analyst')).toBe('Financial Services');
    expect(getDomain('TD', '')).toBe('Financial Services');
  });

  it('defaults to Other', () => {
    expect(getDomain('', '')).toBe('Other');
    expect(getDomain('RandomCorp', 'Worker')).toBe('Other');
  });
});

describe('getTopicMatches', () => {
  it('matches AI topics', () => {
    const matches = getTopicMatches('AI is transforming the software industry with machine learning');
    expect(matches).toContain('AI & Technology');
  });

  it('matches risk topics', () => {
    const matches = getTopicMatches('Risk governance and compliance framework');
    expect(matches).toContain('Risk, GRC & Trust');
  });

  it('matches multiple topics', () => {
    const matches = getTopicMatches('AI risk management and leadership training');
    expect(matches).toContain('AI & Technology');
    expect(matches).toContain('Risk, GRC & Trust');
    expect(matches).toContain('Leadership & Boards');
  });

  it('returns empty for no matches', () => {
    expect(getTopicMatches('')).toEqual([]);
    expect(getTopicMatches('nothing relevant here')).toEqual([]);
  });
});

describe('parseDate', () => {
  it('parses ISO dates', () => {
    const d = parseDate('2024-03-15');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2);
  });

  it('handles UTC suffix', () => {
    const d = parseDate('2024-03-15 UTC');
    expect(d).toBeInstanceOf(Date);
  });

  it('returns null for invalid', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('not a date')).toBeNull();
  });
});

describe('initials', () => {
  it('returns first two initials', () => {
    expect(initials('John Smith')).toBe('JS');
    expect(initials('Mary Jane Watson')).toBe('MJ');
    expect(initials('Alice')).toBe('A');
    expect(initials('')).toBe('?');
  });
});

describe('fmt and pct', () => {
  it('formats numbers', () => {
    expect(fmt(1234)).toBe('1,234');
    expect(fmt(0)).toBe('0');
  });

  it('calculates percentages', () => {
    expect(pct(50, 100)).toBe(50);
    expect(pct(1, 3)).toBe(33);
    expect(pct(0, 10)).toBe(0);
    expect(pct(10, 0)).toBe(0);
  });
});

/* ── Transform tests ──────────────────────────── */
describe('transform', () => {
  it('produces valid output from sample data', () => {
    const parsed = generateSampleData();
    const data = transform(parsed, '2026-06-28');

    // Top-level structure
    expect(data).toHaveProperty('profile');
    expect(data).toHaveProperty('totals');
    expect(data).toHaveProperty('companies');
    expect(data).toHaveProperty('domains');
    expect(data).toHaveProperty('growth');
    expect(data).toHaveProperty('relationships');
    expect(data).toHaveProperty('staleRelationships');
    expect(data).toHaveProperty('recentShares');
    expect(data).toHaveProperty('identity');
    expect(data).toHaveProperty('positions');
    expect(data).toHaveProperty('conversationTopics');
    expect(data).toHaveProperty('authoritySignals');
    expect(data).toHaveProperty('networkResilience');
    expect(data).toHaveProperty('coverage');

    // Totals
    expect(data.totals.connections).toBeGreaterThan(0);
    expect(data.totals.messages).toBeGreaterThan(0);
    expect(data.totals.shares).toBeGreaterThan(0);
    expect(data.totals.comments).toBeGreaterThan(0);
    expect(data.totals.reactions).toBeGreaterThan(0);
    expect(data.relationships.length).toBeGreaterThan(0);
    expect(data.relationships.some(r => r.sent > 0 && r.received > 0)).toBe(true);

    // Companies sorted by count desc
    const companies = data.companies;
    for (let i = 1; i < companies.length; i++) {
      expect(companies[i].count).toBeLessThanOrEqual(companies[i - 1].count);
    }
    companies.forEach(c => {
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('count');
      expect(c).toHaveProperty('share');
      expect(c.share).toBeGreaterThanOrEqual(0);
    });

    // Domains
    data.domains.forEach(d => {
      expect(d).toHaveProperty('name');
      expect(d).toHaveProperty('count');
      expect(d).toHaveProperty('share');
    });

    // Growth
    data.growth.forEach(g => {
      expect(g).toHaveProperty('month');
      expect(g).toHaveProperty('count');
    });

    // Relationships have all scored fields
    if (data.relationships.length > 0) {
      const r = data.relationships[0];
      expect(r).toHaveProperty('sent');
      expect(r).toHaveProperty('received');
      expect(r).toHaveProperty('total');
      expect(r).toHaveProperty('balance');
      expect(r).toHaveProperty('strength');
      expect(r).toHaveProperty('staleScore');
      expect(r).toHaveProperty('connectionPulse');
      expect(r).toHaveProperty('pulseState');
      expect(r).toHaveProperty('advocateReadiness');
      expect(r).toHaveProperty('reentryScore');
      expect(r).toHaveProperty('searchAction');
      expect(r).toHaveProperty('topics');

      // Balance should be between 0 and 100
      expect(r.balance).toBeGreaterThanOrEqual(0);
      expect(r.balance).toBeLessThanOrEqual(100);

      // Pulse state should be valid
      expect(['Active', 'Cooling', 'Dormant']).toContain(r.pulseState);
    }

    // Conversation topics
    expect(data.conversationTopics.length).toBe(6);
    data.conversationTopics.forEach(t => {
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('messages');
      expect(t).toHaveProperty('contacts');
    });

    // Authority signals
    expect(data.authoritySignals.length).toBe(6);
    data.authoritySignals.forEach(s => {
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('private');
      expect(s).toHaveProperty('public');
      expect(s).toHaveProperty('learning');
      expect(s).toHaveProperty('evidence');
    });

    // Network resilience
    expect(data.networkResilience).toHaveProperty('dominantCompany');
    expect(data.networkResilience).toHaveProperty('dominantCompanyShare');
    expect(data.networkResilience).toHaveProperty('domains');

    // Coverage
    expect(data.coverage.inboundContentReactions).toBe(false);
    expect(data.coverage.note).toBeDefined();
  });

  it('handles empty inputs gracefully', () => {
    const data = transform({}, '2026-06-28');
    expect(data.totals.connections).toBe(0);
    expect(data.totals.messages).toBe(0);
    expect(data.companies).toEqual([]);
    expect(data.relationships).toEqual([]);
    expect(data.staleRelationships).toEqual([]);
    expect(data.conversationTopics.length).toBe(6);
    expect(data.conversationTopics.every(t => t.messages === 0)).toBe(true);
  });

  it('handles partial data (connections only)', () => {
    const parsed = { connections: generateSampleData().connections };
    const data = transform(parsed, '2026-06-28');
    expect(data.totals.connections).toBe(350);
    expect(data.totals.messages).toBe(0);
    expect(data.companies.length).toBeGreaterThan(0);
    expect(data.relationships).toEqual([]);
  });

  it('uses Profile.csv to identify the export owner', () => {
    const parsed = generateSampleData();
    parsed.profile = [{
      'First Name': 'Taylor',
      'Last Name': 'Owner'
    }];
    parsed.messages = [
      {
        FROM: 'Taylor Owner',
        TO: 'Jordan Chen',
        DATE: '2026-01-10',
        CONTENT: 'AI governance',
        'SENDER PROFILE URL': '',
        'RECIPIENT PROFILE URLS': 'https://linkedin.com/in/jordan-chen'
      },
      {
        FROM: 'Jordan Chen',
        TO: 'Taylor Owner',
        DATE: '2026-01-11',
        CONTENT: 'Risk controls',
        'SENDER PROFILE URL': 'https://linkedin.com/in/jordan-chen',
        'RECIPIENT PROFILE URLS': ''
      }
    ];

    const data = transform(parsed, '2026-06-28');
    const relationship = data.relationships.find(r => r.name === 'Jordan Chen');

    expect(relationship.sent).toBe(1);
    expect(relationship.received).toBe(1);
  });

  it('infers outbound direction from profile URLs when Profile.csv is absent', () => {
    const parsed = generateSampleData();
    parsed.profile = [];
    parsed.messages = [
      {
        FROM: 'Unknown Owner',
        TO: 'Jordan Chen',
        DATE: '2026-01-10',
        CONTENT: 'AI governance',
        'SENDER PROFILE URL': '',
        'RECIPIENT PROFILE URLS': 'https://linkedin.com/in/jordan-chen'
      },
      {
        FROM: 'Jordan Chen',
        TO: 'Unknown Owner',
        DATE: '2026-01-11',
        CONTENT: 'Risk controls',
        'SENDER PROFILE URL': 'https://linkedin.com/in/jordan-chen',
        'RECIPIENT PROFILE URLS': ''
      }
    ];

    const data = transform(parsed, '2026-06-28');
    const relationship = data.relationships.find(r => r.name === 'Jordan Chen');

    expect(relationship.sent).toBe(1);
    expect(relationship.received).toBe(1);
  });
});

describe('validateParsed', () => {
  it('reports all found when complete', () => {
    const parsed = generateSampleData();
    const report = validateParsed(parsed);
    expect(report.found.length).toBe(12);
    expect(report.missing.length).toBe(0);
  });

  it('reports missing files', () => {
    const report = validateParsed({ connections: [{ 'First Name': 'A', 'Last Name': 'B', Company: 'C', Position: 'D' }] });
    expect(report.missing.length).toBeGreaterThan(0);
    expect(report.missing).toContain('messages');
    expect(report.found.length).toBe(1);
  });

  it('reports missing when no data', () => {
    const report = validateParsed({});
    expect(report.found.length).toBe(0);
    expect(report.missing.length).toBe(12);
  });

  it('detects malformed connections', () => {
    const report = validateParsed({ connections: [{ foo: 'bar' }] });
    expect(report.malformed.length).toBeGreaterThan(0);
  });
});
