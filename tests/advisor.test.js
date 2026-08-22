import { beforeEach, describe, expect, it } from 'vitest';
import { AI_PROVIDER_PRESETS, AI_SETTINGS_KEY, clearAISecrets, getAISettings, purgeLegacyAISettings, saveAISettings } from '../src/advisor.js';

const stored = new Map();
globalThis.localStorage = {
  getItem: key => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, String(value)),
  removeItem: key => stored.delete(key),
  clear: () => stored.clear()
};

beforeEach(() => {
  stored.clear();
  clearAISecrets();
});

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

describe('AI secret storage', () => {
  it('removes API settings left by the older session-storage implementation', () => {
    const legacy = new Map([[AI_SETTINGS_KEY, '{"apiKey":"old-key"}']]);
    purgeLegacyAISettings({ removeItem: key => legacy.delete(key) });
    expect(legacy.has(AI_SETTINGS_KEY)).toBe(false);
  });

  it('persists non-secret preferences but keeps the API key out of storage', () => {
    saveAISettings({ enabled: true, provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'example-model', apiKey: 'private-test-key' });
    expect(stored.get(AI_SETTINGS_KEY)).not.toContain('private-test-key');
    expect(getAISettings().apiKey).toBe('private-test-key');

    clearAISecrets();
    expect(getAISettings()).toMatchObject({ enabled: false, apiKey: '' });
  });
});
