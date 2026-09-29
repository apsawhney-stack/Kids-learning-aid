import { LLMRequestPayload, LLMResponse } from '../../types/provider';

export async function callClaude(
  apiKey: string,
  modelName: string = 'claude-3-5-sonnet-20241022',
  payload: LLMRequestPayload
): Promise<LLMResponse> {
  const endpoint = 'https://api.anthropic.com/v1/messages';

  const messages: any[] = [];

  for (let i = 0; i < payload.messages.length; i++) {
    const msg = payload.messages[i];
    const isLastUser = i === payload.messages.length - 1 && msg.role === 'user';

    if (isLastUser && payload.imageBase64) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: payload.imageMimeType || 'image/jpeg',
              data: payload.imageBase64
            }
          },
          { type: 'text', text: msg.content }
        ]
      });
    } else {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelName,
      system: payload.systemPrompt,
      messages,
      max_tokens: 2048,
      temperature: 0.6
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Claude API Error (${response.status}): ${errorData?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const textOutput = data?.content?.[0]?.text || '';

  return {
    text: textOutput,
    raw: data
  };
}
