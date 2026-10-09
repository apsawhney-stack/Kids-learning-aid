import { LLMRequestPayload, LLMResponse } from '../../types/provider';

let cachedGeminiModel: string | null = null;
let activeHealthyModel: string | null = null;
const degradedModels = new Map<string, number>();
const DEGRADED_COOLDOWN_MS = 5 * 60 * 1000; // 5-minute health cooldown before retrying a 503 model

export function isModelDegraded(model: string): boolean {
  const timestamp = degradedModels.get(model);
  if (!timestamp) return false;
  if (Date.now() - timestamp > DEGRADED_COOLDOWN_MS) {
    degradedModels.delete(model);
    return false;
  }
  return true;
}

export function markModelDegraded(model: string): void {
  degradedModels.set(model, Date.now());
}

export function getActiveHealthyModel(): string {
  return activeHealthyModel || cachedGeminiModel || 'gemini-2.5-flash';
}

export async function listAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => m.name.replace('models/', ''));
  } catch {
    return [];
  }
}

export async function getBestGeminiModel(apiKey: string): Promise<string> {
  if (activeHealthyModel && !isModelDegraded(activeHealthyModel)) return activeHealthyModel;
  if (cachedGeminiModel && !isModelDegraded(cachedGeminiModel)) return cachedGeminiModel;
  const available = await listAvailableGeminiModels(apiKey);
  if (available.length === 0) return 'gemini-2.5-flash';

  const priorities = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-3.7-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro'
  ];

  for (const p of priorities) {
    if (available.includes(p) && !isModelDegraded(p)) {
      cachedGeminiModel = p;
      activeHealthyModel = p;
      return p;
    }
  }

  cachedGeminiModel = available[0] || 'gemini-2.5-flash';
  activeHealthyModel = cachedGeminiModel;
  return cachedGeminiModel;
}

export async function callGemini(
  apiKey: string,
  modelName: string = 'gemini-2.5-flash',
  payload: LLMRequestPayload
): Promise<LLMResponse> {
  const configuredModel = (modelName || activeHealthyModel || cachedGeminiModel || 'gemini-2.5-flash').replace(/^models\//, '');

  // Fast-routing: If the configured model recently returned 503, 429, or timed out,
  // bypass it immediately to eliminate the 4.3s stall and go straight to our verified healthy model.
  let targetModel = configuredModel;
  if (isModelDegraded(configuredModel)) {
    targetModel = activeHealthyModel && !isModelDegraded(activeHealthyModel) ? activeHealthyModel : 'gemini-2.5-flash';
    console.log(`[Gemini] Model ${configuredModel} is currently degraded. Fast-routing directly to ${targetModel}.`);
  }

  const contents: any[] = [];
  for (const msg of payload.messages) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  }

  if (payload.imageBase64) {
    const firstUserIndex = contents.map((c) => c.role).indexOf('user');
    const imagePart = {
      inlineData: {
        mimeType: payload.imageMimeType || 'image/jpeg',
        data: payload.imageBase64
      }
    };

    if (firstUserIndex !== -1) {
      contents[firstUserIndex].parts.unshift(imagePart);
    } else {
      contents.push({
        role: 'user',
        parts: [imagePart, { text: "Here is the homework image I'm working on." }]
      });
    }
  }

  const generationConfig: any = {
    temperature: 0.6,
    maxOutputTokens: 2048
  };

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: payload.systemPrompt }]
    },
    generationConfig
  };

  const executeCall = async (model: string, timeoutMs: number = 7000): Promise<Response> => {
    const config = { ...generationConfig };
    // Only pass thinking config if explicitly requested in model name to avoid high TTFT latency
    if (!model.includes('thinking')) {
      delete config.thinkingConfig;
    }
    const body = {
      ...requestBody,
      generationConfig: config
    };
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  let response: Response | null = null;
  let callError: any = null;

  try {
    // If attempting the user's primary model that hasn't degraded yet, cap timeout at 3.5s to fail-fast
    const timeout = isModelDegraded(configuredModel) ? 6000 : 3500;
    response = await executeCall(targetModel, timeout);
  } catch (err: any) {
    callError = err;
    console.warn(`Primary Gemini model ${targetModel} call failed or timed out:`, err?.message || err);
  }

  const isAccountQuotaOrAuth = response && (
    response.status === 429 ||
    response.status === 403 ||
    response.status === 401
  );

  const isModelSpecificError = response && !response.ok && (
    response.status === 503 ||
    response.status === 404 ||
    response.status >= 500
  );

  // Attempt alternative Gemini models ONLY for model-specific spikes (503), missing model (404), or timeout.
  // Never loop through Gemini models for 429 (quota exhausted) or 401/403 (auth) since they affect the whole key!
  if (!isAccountQuotaOrAuth && (!response || isModelSpecificError)) {
    const status = response ? response.status : (callError?.name === 'AbortError' ? 'timeout (3.5s)' : 'network_error');
    console.warn(`Gemini model ${targetModel} issue (${status}). Attempting fast healthy backup model...`);
    markModelDegraded(targetModel);

    const fallbackCandidates = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash'
    ].filter((m) => m !== targetModel && !isModelDegraded(m));

    for (const fbModel of fallbackCandidates) {
      try {
        const fbResponse = await executeCall(fbModel, 4000);
        if (fbResponse.ok) {
          response = fbResponse;
          targetModel = fbModel;
          activeHealthyModel = fbModel;
          cachedGeminiModel = fbModel;
          console.log(`Successfully connected and switched active model to: ${fbModel}`);
          break;
        } else if (fbResponse.status === 503 || fbResponse.status === 429) {
          markModelDegraded(fbModel);
        }
      } catch (fbErr) {
        console.warn(`Fallback to ${fbModel} failed:`, fbErr);
      }
    }
  }

  if (!response || !response.ok) {
    const errorData = response ? await response.json().catch(() => ({})) : {};
    throw new Error(
      `Gemini API Error (${response?.status || 'network'}): ${errorData?.error?.message || response?.statusText || callError?.message || 'Request failed'}`
    );
  }

  // Active target model succeeded
  activeHealthyModel = targetModel;
  cachedGeminiModel = targetModel;

  const data = await response.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return {
    text: textOutput,
    raw: data
  };
}
