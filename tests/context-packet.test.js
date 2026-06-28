/**
 * Tests for privacy-sensitive context packet construction.
 */

import { describe, it, expect } from 'vitest';
import { buildContextPacket, auditPacket } from '../src/context-packet.js';
import { transform } from '../src/transform.js';
import { generateSampleData } from '../src/sample-data.js';

describe('buildContextPacket', () => {
  const parsed = generateSampleData();
  const data = transform(parsed, '2026-06-28');

  it('builds a packet with metadata', () => {
    const { packet, estimatedTokens, includedFields } = buildContextPacket(data);
    expect(packet._meta).toBeDefined();
    expect(packet._meta.privacyNote).toBeDefined();
    expect(packet._meta.derivedFrom).toContain('LinkdSight');
    expect(estimatedTokens).toBeGreaterThan(0);
    expect(includedFields.length).toBeGreaterThan(0);
  });

  it('includes overview aggregates', () => {
    const { packet } = buildContextPacket(data);
    expect(packet.overview).toBeDefined();
    expect(packet.overview.totalConnections).toBe(data.totals.connections);
    expect(packet.overview.totalMessages).toBe(data.totals.messages);
    expect(packet.overview.activeRelationships).toBe(data.totals.activeRelationships);
  });

  it('includes domain summaries (not raw data)', () => {
    const { packet } = buildContextPacket(data);
    expect(packet.domains).toBeDefined();
    expect(Array.isArray(packet.domains)).toBe(true);
    packet.domains.forEach(d => {
      expect(d.name).toBeDefined();
      expect(d.share).toBeDefined();
      expect(d.count).toBeDefined();
      // Should not contain raw message content
      expect(d.rawMessages).toBeUndefined();
    });
  });

  it('includes top companies (limited)', () => {
    const { packet } = buildContextPacket(data);
    expect(packet.companies.length).toBeLessThanOrEqual(5);
  });

  it('includes growth summary (not raw growth data)', () => {
    const { packet } = buildContextPacket(data);
    expect(packet.growthSummary).toBeDefined();
    expect(packet.growthSummary.totalConnectionsAdded).toBeDefined();
    // Should be summary, not raw array
    expect(Array.isArray(packet.growthSummary)).toBe(false);
  });

  it('includes relationship summary aggregates', () => {
    const { packet } = buildContextPacket(data);
    expect(packet.relationshipSummary).toBeDefined();
    expect(typeof packet.relationshipSummary.averageStrength).toBe('number');
    expect(typeof packet.relationshipSummary.averageBalance).toBe('number');
    expect(packet.relationshipSummary.staleCount).toBeDefined();
  });

  it('includes conversation topic summaries', () => {
    const { packet } = buildContextPacket(data);
    expect(packet.conversationTopics).toBeDefined();
    expect(packet.conversationTopics.length).toBe(6);
    packet.conversationTopics.forEach(t => {
      expect(t.name).toBeDefined();
      expect(typeof t.messages).toBe('number');
      expect(typeof t.contacts).toBe('number');
    });
  });

  it('includes network resilience aggregates', () => {
    const { packet } = buildContextPacket(data);
    expect(packet.networkResilience).toBeDefined();
    if (packet.networkResilience) {
      expect(packet.networkResilience.dominantCompany).toBeDefined();
      expect(typeof packet.networkResilience.dominantCompanyShare).toBe('number');
    }
  });

  it('includes identity summary (not raw topic data)', () => {
    const { packet } = buildContextPacket(data);
    expect(packet.identitySummary).toBeDefined();
    if (packet.identitySummary) {
      expect(packet.identitySummary.yearsTracked).toBeDefined();
      expect(packet.identitySummary.topThemes).toBeDefined();
      expect(Array.isArray(packet.identitySummary.topThemes)).toBe(true);
    }
  });

  it('respects token budget by truncating (note: small budgets can only drop entire sections)', () => {
    const { packet, estimatedTokens } = buildContextPacket(data, { maxTokens: 100 });
    // Should be very small
    expect(estimatedTokens).toBeLessThanOrEqual(350);
    // Should at minimum have overview and meta
    expect(packet.overview).toBeDefined();
  });

  it('includes question context when provided', () => {
    const { packet } = buildContextPacket(data, { question: 'Where is my network thin?' });
    expect(packet.questionContext).toBe('Where is my network thin?');
  });

  it('handles null/empty data gracefully', () => {
    const emptyData = {
      exportDate: '2026-01-01',
      totals: {},
      domains: [],
      companies: [],
      growth: [],
      relationships: [],
      staleRelationships: [],
      conversationTopics: [],
      identity: [],
      networkResilience: null
    };
    const { packet } = buildContextPacket(emptyData);
    expect(packet._meta).toBeDefined();
    expect(packet.overview).toBeDefined();
  });
});

describe('auditPacket', () => {
  it('passes a clean packet', () => {
    const { packet } = buildContextPacket(transform(generateSampleData()), { maxTokens: 4000 });
    const issues = auditPacket(packet);
    expect(issues).toEqual([]);
  });

  it('detects missing privacy note', () => {
    const issues = auditPacket({ overview: { totalConnections: 100 } });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some(i => i.includes('privacyNote'))).toBe(true);
  });

  it('detects raw data references', () => {
    const issues = auditPacket({
      _meta: { privacyNote: 'ok' },
      rawMessages: ['some message body']
    });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some(i => i.includes('rawMessages'))).toBe(true);
  });

  it('detects messageBodies field', () => {
    const issues = auditPacket({
      _meta: { privacyNote: 'ok' },
      messageBodies: ['text']
    });
    expect(issues.some(i => i.includes('messageBodies'))).toBe(true);
  });
});
