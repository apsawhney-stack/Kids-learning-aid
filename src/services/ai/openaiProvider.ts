import { LLMRequestPayload, LLMResponse } from '../../types/provider';

export async function callOpenAI(
  apiKey: string,
  modelName: string = 'gpt-4o-mini',
  payload: LLMRequestPayload
): Promise<LLMResponse> {
  const endpoint = 'https://api.openai.com/v1/chat/completions';

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
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: msg.content },
          {
            type: 'image_url',
            image_url: {
              url: `data:${payload.imageMimeType || 'image/jpeg'};base64,${payload.imageBase64}`
            }
          }
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
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature: 0.6,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API Error (${response.status}): ${errorData?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const textOutput = data?.choices?.[0]?.message?.content || '';

  return {
    text: textOutput,
    raw: data
  };
}
