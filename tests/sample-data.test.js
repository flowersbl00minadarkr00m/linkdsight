import { describe, it, expect } from 'vitest';
import { generateSampleData } from '../src/sample-data.js';
import { transform } from '../src/transform.js';

// Spec 001 R5 (T3): the synthetic dataset must produce differentiated
// relationship scores so ranked demo views don't collapse to one value.
describe('sample data variance', () => {
  const data = transform(generateSampleData(), '2026-06-28');

  it('spreads message volume across contacts', () => {
    const totals = data.relationships.map(r => r.total);
    expect(new Set(totals).size).toBeGreaterThanOrEqual(5);
  });

  it('spreads pulse and advocate scores so rankings mean something', () => {
    const pulses = new Set(data.relationships.map(r => r.connectionPulse));
    const advocacy = new Set(data.relationships.map(r => r.advocateReadiness));
    expect(pulses.size).toBeGreaterThanOrEqual(5);
    expect(advocacy.size).toBeGreaterThanOrEqual(5);
  });

  it('includes more than one relationship pulse state', () => {
    const states = new Set(data.relationships.map(r => r.pulseState));
    expect(states.size).toBeGreaterThanOrEqual(2);
  });
});
