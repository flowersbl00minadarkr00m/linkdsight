import { describe, expect, it } from 'vitest';
import { AI_PROVIDER_PRESETS } from '../src/advisor.js';

describe('AI provider presets', () => {
  it('supports local, hosted, gateway, and custom compatible endpoints', () => {
    expect(Object.keys(AI_PROVIDER_PRESETS)).toEqual(expect.arrayContaining([
      'custom', 'ollama', 'openai', 'openrouter', 'deepseek', 'groq', 'together', 'mistral'
    ]));
  });

  it('provides editable endpoint and model defaults for every named provider', () => {
    for (const [key, preset] of Object.entries(AI_PROVIDER_PRESETS)) {
      expect(preset.label).toBeTruthy();
      if (key === 'custom') continue;
      expect(preset.endpoint).toMatch(/^https?:\/\//);
      expect(preset.endpoint).toContain('chat/completions');
      expect(preset.model).toBeTruthy();
    }
  });
});
