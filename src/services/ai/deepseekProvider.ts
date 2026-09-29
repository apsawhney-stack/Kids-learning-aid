import { LLMRequestPayload, LLMResponse } from '../../types/provider';

export async function callDeepSeek(
  apiKey: string,
  modelName: string = 'deepseek-chat',
  payload: LLMRequestPayload
): Promise<LLMResponse> {
  const endpoint = 'https://api.deepseek.com/chat/completions';
  const targetModel = modelName || 'deepseek-chat';

  const messages: any[] = [
    {
      role: 'system',
      content: payload.systemPrompt
    }
  ];

  for (let i = 0; i < payload.messages.length; i++) {
    const msg = payload.messages[i];
    const isLastUser = i === payload.messages.length - 1 && msg.role === 'user';

    if (isLastUser && payload.imageBase64) {
      // DeepSeek text API currently accepts text; attach clear homework context if an image was uploaded
      messages.push({
        role: 'user',
        content: `${msg.content}\n\n[Note: The student uploaded a photo of their homework worksheet. Help guide them through the problem described above.]`
      });
    } else {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages,
        temperature: 0.6,
        max_tokens: 2048
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `DeepSeek API Error (${response.status}): ${errorData?.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;
    const textOutput = message?.content || message?.reasoning_content || '';

    return {
      text: textOutput,
      raw: data
    };
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('DeepSeek API request timed out (12s).');
    }
    throw err;
  }
}
