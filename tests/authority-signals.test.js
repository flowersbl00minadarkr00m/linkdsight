import { describe, it, expect } from 'vitest';
import { normalizeAuthoritySignals } from '../src/utils.js';

// Spec 001 R5/T4: per-channel scaling must be explicit and correct so the
// dot-plot never implies cross-channel comparability (audit finding L-4).
describe('normalizeAuthoritySignals', () => {
  const signals = [
    { name: 'AI & Technology', private: 100, public: 48, learning: 3, evidence: 7 },
    { name: 'Risk & GRC', private: 80, public: 47, learning: 1, evidence: 2 },
  ];

  it('scales each channel to its own max, not a shared one', () => {
    const { maxes, rows } = normalizeAuthoritySignals(signals);
    expect(maxes).toEqual({ private: 100, public: 48, learning: 3, evidence: 7 });
    expect(rows[0].normalized).toEqual({ private: 100, public: 100, learning: 100, evidence: 100 });
    expect(rows[1].normalized.learning).toBe(33); // 1 of max 3 — not a near-full bar
    expect(rows[1].normalized.private).toBe(80);
  });

  it('never divides by zero on empty channels', () => {
    const { rows } = normalizeAuthoritySignals([{ name: 'X', private: 0, public: 0, learning: 0, evidence: 0 }]);
    expect(rows[0].normalized).toEqual({ private: 0, public: 0, learning: 0, evidence: 0 });
  });
});
