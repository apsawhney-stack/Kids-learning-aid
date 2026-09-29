export type LLMProviderId = 'gemini' | 'openai' | 'claude' | 'deepseek';

export interface ProviderConfig {
  provider: LLMProviderId;
  apiKey: string;
  modelName: string;
}

export interface StudentProfile {
  name: string;
  grade: string;
  interests: string[];
}

export interface LLMRequestPayload {
  systemPrompt: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    imageUrl?: string;
  }>;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface LLMResponse {
  text: string;
  visual?: any;
  suggestedActionChips?: string[];
  raw?: any;
}
