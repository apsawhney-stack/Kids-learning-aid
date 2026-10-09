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

  test('reads EXPO_PUBLIC_DEEPSEEK_API_KEY from environment variables for primary DeepSeek provider', async () => {
    process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY = 'sk-deepseek-env-12345';

    const key = await getDeepSeekApiKey();
    expect(key).toBe('sk-deepseek-env-12345');

    const config = await getStoredProviderConfig();
    expect(config.provider).toBe('deepseek');
    expect(config.apiKey).toBe('sk-deepseek-env-12345');
    expect(config.modelName).toBe('deepseek-chat');
  });

  test('configures Gemini backup provider when DeepSeek is primary', async () => {
    process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY = 'sk-deepseek-env-primary';
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'gemini-env-backup-key';

    const backup = await getBackupProviderConfig();
    expect(backup).not.toBeNull();
    expect(backup?.provider).toBe('gemini');
    expect(backup?.apiKey).toBe('gemini-env-backup-key');
    expect(backup?.modelName).toBe('gemini-2.5-flash');
  });
});
