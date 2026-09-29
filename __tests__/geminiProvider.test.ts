import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  callGemini,
  isModelDegraded,
  markModelDegraded,
  getActiveHealthyModel
} from '../src/services/ai/geminiProvider';

describe('Gemini Provider Health & Fast Fallback', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('tracks degraded models correctly', () => {
    expect(isModelDegraded('test-model')).toBe(false);
    markModelDegraded('test-model');
    expect(isModelDegraded('test-model')).toBe(true);
  });

  test('falls back and switches healthy active model when primary returns 503', async () => {
    const mockFetch = jest.fn() as jest.MockedFunction<any>;

    // First call to gemini-3.7-flash returns 503 Service Unavailable
    // Backup call to gemini-2.5-flash succeeds
    mockFetch.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('gemini-3.7-flash')) {
        return {
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          json: async () => ({ error: { message: 'The model is overloaded. Please try again later.' } })
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Great question! What do you think the first step is?' }]
              }
            }
          ]
        })
      };
    });

    global.fetch = mockFetch;

    const res = await callGemini('fake-api-key', 'gemini-3.7-flash', {
      systemPrompt: 'You are coach',
      messages: [{ role: 'user', content: 'Help with math' }]
    });

    expect(res.text).toContain('Great question!');
    // 3.7 should now be marked degraded
    expect(isModelDegraded('gemini-3.7-flash')).toBe(true);
    // Healthy model should have switched to 2.5
    expect(getActiveHealthyModel()).toBe('gemini-2.5-flash');

    // On subsequent turn, calling gemini-3.7-flash should fast-route directly to gemini-2.5-flash
    mockFetch.mockClear();
    await callGemini('fake-api-key', 'gemini-3.7-flash', {
      systemPrompt: 'You are coach',
      messages: [{ role: 'user', content: 'Next step' }]
    });

    // Verify it called gemini-2.5-flash directly without querying 3.7
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('gemini-2.5-flash');
    expect(calledUrl).not.toContain('gemini-3.7-flash');
  });
});
