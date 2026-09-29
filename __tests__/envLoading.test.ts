import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' }
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve())
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve())
}));

import {
  getDeepSeekApiKey,
  getBackupProviderConfig,
  getStoredProviderConfig
} from '../src/services/storage/storageService';

describe('Environment Variable API Key Loading', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('reads EXPO_PUBLIC_DEEPSEEK_API_KEY from environment variables', async () => {
    process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY = 'sk-deepseek-env-12345';

    const key = await getDeepSeekApiKey();
    expect(key).toBe('sk-deepseek-env-12345');
  });

  test('configures backup provider from EXPO_PUBLIC_DEEPSEEK_API_KEY', async () => {
    process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY = 'sk-deepseek-env-backup';

    const backup = await getBackupProviderConfig();
    expect(backup).not.toBeNull();
    expect(backup?.provider).toBe('deepseek');
    expect(backup?.apiKey).toBe('sk-deepseek-env-backup');
    expect(backup?.modelName).toBe('deepseek-chat');
  });

  test('falls back to EXPO_PUBLIC_GEMINI_API_KEY for primary Gemini provider', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'gemini-env-key-999';

    const config = await getStoredProviderConfig();
    expect(config.provider).toBe('gemini');
    expect(config.apiKey).toBe('gemini-env-key-999');
  });
});
