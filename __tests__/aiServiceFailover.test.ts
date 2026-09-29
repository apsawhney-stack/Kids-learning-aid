import { describe, test, expect, jest, beforeEach } from '@jest/globals';

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

import { sendCoachMessage, resetProviderCooldown, isProviderInCooldown } from '../src/services/ai/aiService';
import * as storageService from '../src/services/storage/storageService';
import * as geminiProvider from '../src/services/ai/geminiProvider';
import * as deepseekProvider from '../src/services/ai/deepseekProvider';

describe('AI Service Backup Failover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetProviderCooldown();
  });

  test('automatically fails over to DeepSeek backup when Gemini runs out of quota', async () => {
    // Mock stored config: Gemini primary with an API key
    jest.spyOn(storageService, 'getStoredProviderConfig').mockResolvedValue({
      provider: 'gemini',
      apiKey: 'gemini-key',
      modelName: 'gemini-2.5-flash'
    });

    jest.spyOn(storageService, 'getStoredStudentProfile').mockResolvedValue({
      name: 'Alex',
      grade: '6th grade',
      interests: ['Basketball']
    });

    // Mock backup provider config: DeepSeek is configured as backup
    jest.spyOn(storageService, 'getBackupProviderConfig').mockResolvedValue({
      provider: 'deepseek',
      apiKey: 'sk-deepseek-backup-key',
      modelName: 'deepseek-chat'
    });

    // Mock Gemini throwing quota exceeded (429)
    jest.spyOn(geminiProvider, 'callGemini').mockRejectedValue(
      new Error('Gemini API Error (429): Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests')
    );

    // Mock DeepSeek returning coach guidance
    jest.spyOn(deepseekProvider, 'callDeepSeek').mockResolvedValue({
      text: 'Great effort, Alex! Let us look at what numbers we have to start with.',
      raw: {}
    });

    const result = await sendCoachMessage({
      subject: 'math',
      messages: [{ role: 'user', content: 'I am stuck on this ratio problem' }]
    });

    // Assert that DeepSeek was called as failover
    expect(deepseekProvider.callDeepSeek).toHaveBeenCalledWith(
      'sk-deepseek-backup-key',
      'deepseek-chat',
      expect.anything()
    );

    // Assert that the user received the real AI response, NOT offline mode
    expect(result.text).toContain('Great effort, Alex!');
    expect(result.text).not.toContain('Offline Mode');
  });

  test('circuit breaker fast-routes subsequent messages directly to backup without calling Gemini', async () => {
    jest.spyOn(storageService, 'getStoredProviderConfig').mockResolvedValue({
      provider: 'gemini',
      apiKey: 'gemini-key',
      modelName: 'gemini-2.5-flash'
    });

    jest.spyOn(storageService, 'getStoredStudentProfile').mockResolvedValue({
      name: 'Alex',
      grade: '6th grade',
      interests: ['Basketball']
    });

    jest.spyOn(storageService, 'getBackupProviderConfig').mockResolvedValue({
      provider: 'deepseek',
      apiKey: 'sk-deepseek-backup-key',
      modelName: 'deepseek-chat'
    });

    const geminiMock = jest.spyOn(geminiProvider, 'callGemini').mockRejectedValue(
      new Error('Gemini API Error (429): Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests')
    );

    const deepseekMock = jest.spyOn(deepseekProvider, 'callDeepSeek').mockResolvedValue({
      text: 'DeepSeek response for student',
      raw: {}
    });

    // 1st call: Gemini fails, triggers failover to DeepSeek, and trips the circuit breaker
    await sendCoachMessage({
      subject: 'science',
      messages: [{ role: 'user', content: 'What is photosynthesis?' }]
    });

    expect(geminiMock).toHaveBeenCalledTimes(1);
    expect(deepseekMock).toHaveBeenCalledTimes(1);
    expect(isProviderInCooldown('gemini')).toBe(true);

    geminiMock.mockClear();
    deepseekMock.mockClear();

    // 2nd call: Since Gemini is in cooldown, it should be COMPLETELY BYPASSED with 0 calls to callGemini
    const secondResult = await sendCoachMessage({
      subject: 'science',
      messages: [{ role: 'user', content: 'How do leaves absorb sunlight?' }]
    });

    // Verify Gemini was NOT called at all
    expect(geminiMock).not.toHaveBeenCalled();
    // Verify DeepSeek received the request directly
    expect(deepseekMock).toHaveBeenCalledTimes(1);
    expect(secondResult.text).toContain('DeepSeek response for student');

    // 3rd step: Resetting the cooldown allows Gemini to be attempted again
    resetProviderCooldown('gemini');
    expect(isProviderInCooldown('gemini')).toBe(false);

    geminiMock.mockClear();
    deepseekMock.mockClear();

    // Now call again - Gemini should be attempted
    await sendCoachMessage({
      subject: 'science',
      messages: [{ role: 'user', content: 'What are stomata?' }]
    });
    expect(geminiMock).toHaveBeenCalledTimes(1);
  });
});

