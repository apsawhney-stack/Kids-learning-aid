import { describe, test, expect, jest, afterEach } from '@jest/globals';
import { callDeepSeek } from '../src/services/ai/deepseekProvider';

describe('DeepSeek Provider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('calls DeepSeek endpoint with proper authentication and parameters', async () => {
    const mockFetch = jest.fn() as jest.MockedFunction<any>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'What do you notice about the ratio 12:16?'
            }
          }
        ]
      })
    });

    global.fetch = mockFetch;

    const result = await callDeepSeek('sk-deepseek-test-key', 'deepseek-chat', {
      systemPrompt: 'You are Coach Spark.',
      messages: [{ role: 'user', content: 'Help me solve 12:16 ratio' }]
    });

    expect(result.text).toBe('What do you notice about the ratio 12:16?');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [calledUrl, options] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('https://api.deepseek.com/chat/completions');
    expect(options.headers['Authorization']).toBe('Bearer sk-deepseek-test-key');
    const parsedBody = JSON.parse(options.body);
    expect(parsedBody.model).toBe('deepseek-chat');
  });

  test('handles DeepSeek API errors gracefully', async () => {
    const mockFetch = jest.fn() as jest.MockedFunction<any>;
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({
        error: { message: 'Invalid API key provided' }
      })
    });

    global.fetch = mockFetch;

    await expect(
      callDeepSeek('invalid-key', 'deepseek-chat', {
        systemPrompt: 'System',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    ).rejects.toThrow('DeepSeek API Error (401)');
  });
});
