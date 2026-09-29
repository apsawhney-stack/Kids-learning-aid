import { Subject, VisualSpec } from '../../types/chat';
import { StudentProfile, LLMRequestPayload, LLMResponse } from '../../types/provider';
import { buildSocraticSystemPrompt } from './promptTemplates';
import { callGemini } from './geminiProvider';
import { callDeepSeek } from './deepseekProvider';
import { callOpenAI } from './openaiProvider';
import { callClaude } from './claudeProvider';
import { validateSocraticResponse, extractVisualFromResponse } from '../../utils/socraticValidator';
import {
  getStoredProviderConfig,
  getStoredStudentProfile,
  getBackupProviderConfig,
  getStoredLearnerProfile
} from '../storage/storageService';

export interface SendCoachMessageParams {
  subject: Subject;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  hintLevel?: number;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface CoachMessageResult {
  text: string;
  visual?: VisualSpec;
  isGuarded: boolean;
}

/**
 * Intelligent mock responses for instant testing when no external API key is entered yet.
 */
function getMockCoachResponse(
  subject: Subject,
  lastMessage: string,
  profile: StudentProfile
): string {
  const msgLower = lastMessage.toLowerCase();

  // If asking for direct answer
  if (msgLower.includes('just tell me') || msgLower.includes('give me the answer') || msgLower.includes('what is the answer')) {
    return `Haha nice try, ${profile.name}! 🎯 But a real coach never shoots the free-throw for you. Let's make this super simple: what is the very first clue or number given to us in the problem?`;
  }

  // If asking for a visual model
  if (msgLower.includes('visual') || msgLower.includes('diagram') || msgLower.includes('model') || subject === 'math') {
    if (msgLower.includes('equation') || msgLower.includes('solve') || msgLower.includes('algebra') || msgLower.includes('scale')) {
      return `Let's use an Algebra Balance Scale so you can see how both sides stay equal!
<visual type="balance-scale" data={"title":"Balance the Equation","equation":"2x + 4 = 10","leftItems":[{"label":"x","count":2},{"value":4}],"rightItems":[{"value":10}]} />
What do you think happens if we take away 4 from both sides of the scale?`;
    }

    if (msgLower.includes('fraction') || msgLower.includes('part') || msgLower.includes('ratio')) {
      return `Let's break this down with a visual Fraction Model:
<visual type="fraction-model" data={"title":"Visualizing 3/4","shape":"bar","totalParts":4,"shadedParts":3,"label":"3/4"} />
Tap the parts to see how shading changes the fraction! How many unshaded parts are left?`;
    }

    return `Let's break this down visually with a Tape Diagram so you can see the chunks clearly!
<visual type="tape-diagram" data={"title":"Comparing the Quantities","parts":[{"label":"Part A","count":3,"valuePerUnit":"4","color":"#3B82F6"},{"label":"Part B","count":4,"valuePerUnit":"4","color":"#EC4899"}]} />
Notice how each block is the exact same size. How many total chunks do you see on Part A compared to Part B?`;
  }

  if (subject === 'science') {
    if (msgLower.includes('photosynthesis') || msgLower.includes('plant') || msgLower.includes('leaf')) {
      return `Awesome question! Let's examine how a plant transforms light into food:
<visual-svg title="Photosynthesis: Plant Food Factory">
<svg viewBox="0 0 340 220" xmlns="http://www.w3.org/2000/svg">
  <rect width="340" height="220" rx="12" fill="#F8FAFC" />
  
  <!-- Left Panel: Inputs (Reactants) -->
  <rect x="8" y="10" width="100" height="200" rx="10" fill="#F0F9FF" stroke="#BAE6FD" stroke-width="1.5" />
  <rect x="18" y="16" width="80" height="18" rx="5" fill="#0284C7" />
  <text x="58" y="29" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">INPUTS (IN)</text>
  
  <!-- Sun & Light -->
  <circle cx="58" cy="62" r="14" fill="#FBBF24" stroke="#F59E0B" stroke-width="2" />
  <line x1="58" y1="42" x2="58" y2="46" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" />
  <line x1="58" y1="78" x2="58" y2="82" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" />
  <line x1="38" y1="62" x2="42" y2="62" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" />
  <line x1="74" y1="62" x2="78" y2="62" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" />
  <text x="58" y="91" font-size="9" font-weight="bold" fill="#92400E" text-anchor="middle">Sunlight Energy</text>
  
  <!-- Carbon Dioxide -->
  <rect x="16" y="103" width="84" height="28" rx="6" fill="#FFFFFF" stroke="#CBD5E1" />
  <text x="58" y="117" font-size="10" font-weight="bold" fill="#0F172A" text-anchor="middle">CO₂</text>
  <text x="58" y="127" font-size="8" fill="#64748B" text-anchor="middle">Carbon Dioxide</text>
  
  <!-- Water -->
  <rect x="16" y="140" width="84" height="28" rx="6" fill="#FFFFFF" stroke="#CBD5E1" />
  <text x="58" y="154" font-size="10" font-weight="bold" fill="#0284C7" text-anchor="middle">H₂O</text>
  <text x="58" y="164" font-size="8" fill="#64748B" text-anchor="middle">Water from Roots</text>

  <!-- Input Flow Arrows pointing to Leaf -->
  <path d="M 108 65 Q 125 75 140 95" fill="none" stroke="#F59E0B" stroke-width="2" />
  <polygon points="140,90 146,98 137,100" fill="#F59E0B" />

  <path d="M 108 117 L 138 117" fill="none" stroke="#64748B" stroke-width="2" />
  <polygon points="135,113 143,117 135,121" fill="#64748B" />

  <path d="M 108 154 Q 125 149 140 135" fill="none" stroke="#0284C7" stroke-width="2" />
  <polygon points="137,130 146,132 140,140" fill="#0284C7" />

  <!-- Center: Realistic Leaf with Stem and Branching Veins -->
  <path d="M 130 145 Q 140 130 150 120" fill="none" stroke="#047857" stroke-width="3" stroke-linecap="round" />
  <path d="M 145 120 C 140 80, 200 65, 220 115 C 200 160, 145 150, 145 120 Z" fill="#10B981" stroke="#047857" stroke-width="2" />
  <path d="M 145 120 Q 180 115 220 115" fill="none" stroke="#047857" stroke-width="1.8" />
  <line x1="165" y1="117" x2="180" y2="95" stroke="#047857" stroke-width="1.2" />
  <line x1="165" y1="117" x2="180" y2="135" stroke="#047857" stroke-width="1.2" />
  <line x1="190" y1="116" x2="205" y2="102" stroke="#047857" stroke-width="1.2" />
  <line x1="190" y1="116" x2="205" y2="128" stroke="#047857" stroke-width="1.2" />
  <text x="180" y="152" font-size="10" font-weight="bold" fill="#064E3B" text-anchor="middle">Chloroplasts</text>

  <!-- Output Flow Arrows leaving Leaf -->
  <path d="M 222 105 Q 235 90 248 85" fill="none" stroke="#BE185D" stroke-width="2" />
  <polygon points="244,81 254,84 246,89" fill="#BE185D" />

  <path d="M 222 125 Q 235 140 248 145" fill="none" stroke="#059669" stroke-width="2" />
  <polygon points="246,141 254,146 244,149" fill="#059669" />

  <!-- Right Panel: Outputs (Products) -->
  <rect x="232" y="10" width="100" height="200" rx="10" fill="#FDF2F8" stroke="#FBCFE8" stroke-width="1.5" />
  <rect x="242" y="16" width="80" height="18" rx="5" fill="#BE185D" />
  <text x="282" y="29" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">OUTPUTS (MADE)</text>

  <!-- Glucose / Sugar -->
  <rect x="240" y="65" width="84" height="38" rx="6" fill="#FFFFFF" stroke="#F472B6" />
  <text x="282" y="80" font-size="10" font-weight="bold" fill="#9D174D" text-anchor="middle">GLUCOSE</text>
  <text x="282" y="93" font-size="8" fill="#64748B" text-anchor="middle">Sugar / Energy</text>

  <!-- Oxygen -->
  <rect x="240" y="128" width="84" height="38" rx="6" fill="#FFFFFF" stroke="#34D399" />
  <text x="282" y="144" font-size="11" font-weight="bold" fill="#065F46" text-anchor="middle">O₂</text>
  <text x="282" y="157" font-size="8" fill="#64748B" text-anchor="middle">Oxygen for Air</text>
</svg>
</visual-svg>
Now, look at the INPUTS panel on the left: based on this diagram, what are the ingredients that go IN?`;
    }

    return `Awesome question! Let's examine this science model:
<visual-svg title="Water Cycle & State Changes">
<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
  <rect width="320" height="180" rx="8" fill="#F0F9FF" />
  <!-- Water body -->
  <path d="M 0 140 Q 80 130 160 140 T 320 140 L 320 180 L 0 180 Z" fill="#38BDF8" />
  <text x="160" y="165" font-size="12" font-weight="bold" fill="#0369A1" text-anchor="middle">Ocean (Liquid)</text>
  <!-- Sun -->
  <circle cx="45" cy="40" r="20" fill="#FBBF24" stroke="#F59E0B" stroke-width="2" />
  <text x="45" y="44" font-size="10" font-weight="bold" fill="#78350F" text-anchor="middle">Sun</text>
  <!-- Cloud -->
  <path d="M 220 50 a 16 16 0 0 1 28 -6 a 20 20 0 0 1 34 8 a 15 15 0 0 1 -4 28 l -54 0 a 15 15 0 0 1 -4 -30 z" fill="#CBD5E1" stroke="#94A3B8" stroke-width="1.5" />
  <text x="250" y="65" font-size="10" font-weight="bold" fill="#334155" text-anchor="middle">Condensation</text>
  <!-- Evaporation Arrow -->
  <path d="M 90 125 Q 120 90 190 75" fill="none" stroke="#F59E0B" stroke-width="2.5" stroke-dasharray="4,4" />
  <polygon points="190,70 198,75 190,82" fill="#F59E0B" />
  <text x="125" y="95" font-size="10" font-weight="bold" fill="#D97706" text-anchor="middle">Evaporation ↑</text>
  <!-- Precipitation Arrow -->
  <path d="M 260 85 L 260 125" fill="none" stroke="#0284C7" stroke-width="2.5" stroke-dasharray="4,4" />
  <polygon points="255,123 260,132 265,123" fill="#0284C7" />
  <text x="290" y="110" font-size="10" font-weight="bold" fill="#0369A1">Rain ↓</text>
</svg>
</visual-svg>
When the sun warms liquid water on the surface, what state of matter does it turn into as it rises?`;
  }

  if (subject === 'english') {
    return `Great thought! In English, every strong argument uses the CER framework:
<visual type="cer" data={"claim":"Your main argument","evidence":["Quote or fact from the text"],"reasoning":"Why this quote proves your argument"} />
What sentence in the paragraph best proves your thought?`;
  }

  return `Great start, ${profile.name}! 🚀 Imagine you are planning a strategy in ${profile.interests[0] || 'your favorite game'}. What goal are we trying to reach here, and what tool do we need first?`;
}

// In-memory circuit breaker to prevent hammering providers that are out of quota or broken
const providerCooldownUntil = new Map<string, number>();

export function setProviderCooldown(provider: string, durationMs: number = 30 * 60 * 1000): void {
  providerCooldownUntil.set(provider, Date.now() + durationMs);
}

export function isProviderInCooldown(provider: string): boolean {
  const expiry = providerCooldownUntil.get(provider);
  return !!expiry && Date.now() < expiry;
}

export function resetProviderCooldown(provider?: string): void {
  if (provider) {
    providerCooldownUntil.delete(provider);
  } else {
    providerCooldownUntil.clear();
  }
}

export async function sendCoachMessage(
  params: SendCoachMessageParams
): Promise<CoachMessageResult> {
  const config = await getStoredProviderConfig();
  const profile = await getStoredStudentProfile();
  const learnerProfile = await getStoredLearnerProfile();

  const systemPrompt = buildSocraticSystemPrompt(
    params.subject,
    profile,
    params.hintLevel || 1,
    learnerProfile
  );

  const payload: LLMRequestPayload = {
    systemPrompt,
    messages: params.messages,
    imageBase64: params.imageBase64,
    imageMimeType: params.imageMimeType
  };

  let rawText = '';
  const backup = await getBackupProviderConfig();
  const primaryInCooldown = isProviderInCooldown(config.provider);

  // 1. Fast-Route: If primary provider is on cooldown (e.g. 429 quota exhausted), skip it completely!
  if (primaryInCooldown && backup && backup.apiKey && backup.provider !== config.provider) {
    try {
      console.log(
        `[Fast-Route] Primary provider ${config.provider} is on cooldown. Routing directly to backup ${backup.provider} (${backup.modelName}) with 0ms delay.`
      );
      let backupResponse: LLMResponse;
      if (backup.provider === 'deepseek') {
        backupResponse = await callDeepSeek(backup.apiKey, backup.modelName || 'deepseek-chat', payload);
      } else if (backup.provider === 'openai') {
        backupResponse = await callOpenAI(backup.apiKey, backup.modelName || 'gpt-4o-mini', payload);
      } else {
        backupResponse = await callClaude(backup.apiKey, backup.modelName || 'claude-3-5-sonnet-20241022', payload);
      }
      rawText = backupResponse.text;
    } catch (err: any) {
      console.warn(`Backup provider ${backup.provider} failed:`, err.message);
      const lastUserMsg = params.messages[params.messages.length - 1]?.content || '';
      rawText = `[Offline Mode: ${err.message}]\n` + getMockCoachResponse(params.subject, lastUserMsg, profile);
    }
  } else if (!config.apiKey || config.apiKey.trim() === '') {
    // 2. If no primary API key configured, check if a backup key exists or use intelligent mock
    if (backup && backup.apiKey) {
      try {
        console.log(`[Backup Mode] No primary key found. Connecting via backup provider: ${backup.provider}`);
        let res: LLMResponse;
        if (backup.provider === 'deepseek') {
          res = await callDeepSeek(backup.apiKey, backup.modelName || 'deepseek-chat', payload);
        } else if (backup.provider === 'openai') {
          res = await callOpenAI(backup.apiKey, backup.modelName || 'gpt-4o-mini', payload);
        } else {
          res = await callClaude(backup.apiKey, backup.modelName || 'claude-3-5-sonnet-20241022', payload);
        }
        rawText = res.text;
      } catch (err: any) {
        const lastUserMsg = params.messages[params.messages.length - 1]?.content || '';
        rawText = getMockCoachResponse(params.subject, lastUserMsg, profile);
      }
    } else {
      const lastUserMsg = params.messages[params.messages.length - 1]?.content || '';
      rawText = getMockCoachResponse(params.subject, lastUserMsg, profile);
    }
  } else {
    // 3. Attempt primary provider
    try {
      let response: LLMResponse;
      if (config.provider === 'gemini') {
        response = await callGemini(config.apiKey, config.modelName || 'gemini-2.5-flash', payload);
      } else if (config.provider === 'deepseek') {
        response = await callDeepSeek(config.apiKey, config.modelName || 'deepseek-chat', payload);
      } else if (config.provider === 'openai') {
        response = await callOpenAI(config.apiKey, config.modelName || 'gpt-4o-mini', payload);
      } else if (config.provider === 'claude') {
        response = await callClaude(config.apiKey, config.modelName || 'claude-3-5-sonnet-20241022', payload);
      } else {
        throw new Error(`Unsupported provider: ${config.provider}`);
      }
      rawText = response.text;
      // Success: clear cooldown for primary
      resetProviderCooldown(config.provider);
    } catch (err: any) {
      console.warn(`Primary provider ${config.provider} error: ${err.message}. Checking backup providers...`);

      // Put primary provider on cooldown so future messages skip it and route to backup immediately
      const isQuotaOrAuth =
        err.message.includes('429') ||
        err.message.includes('Quota exceeded') ||
        err.message.includes('RESOURCE_EXHAUSTED') ||
        err.message.includes('403') ||
        err.message.includes('PERMISSION_DENIED') ||
        err.message.includes('401');

      const cooldownMs = isQuotaOrAuth ? 2 * 60 * 60 * 1000 : 15 * 60 * 1000;
      setProviderCooldown(config.provider, cooldownMs);
      console.log(
        `[Circuit Breaker] Placed ${config.provider} on ${isQuotaOrAuth ? '2-hour' : '15-minute'} cooldown due to persistent error. Future calls will bypass it automatically.`
      );

      // Automatic backup failover
      if (backup && backup.provider !== config.provider && backup.apiKey) {
        try {
          console.log(`[Failover] Auto-switching from failed ${config.provider} to backup provider: ${backup.provider} (${backup.modelName})`);
          let backupResponse: LLMResponse;
          if (backup.provider === 'deepseek') {
            backupResponse = await callDeepSeek(backup.apiKey, backup.modelName || 'deepseek-chat', payload);
          } else if (backup.provider === 'openai') {
            backupResponse = await callOpenAI(backup.apiKey, backup.modelName || 'gpt-4o-mini', payload);
          } else if (backup.provider === 'claude') {
            backupResponse = await callClaude(backup.apiKey, backup.modelName || 'claude-3-5-sonnet-20241022', payload);
          } else {
            throw new Error(`Unsupported backup provider: ${backup.provider}`);
          }
          rawText = backupResponse.text;
        } catch (backupErr: any) {
          console.warn(`Backup provider ${backup.provider} also failed:`, backupErr.message);
          const lastUserMsg = params.messages[params.messages.length - 1]?.content || '';
          rawText = `[Offline Mode: ${err.message}]\n` + getMockCoachResponse(params.subject, lastUserMsg, profile);
        }
      } else {
        const lastUserMsg = params.messages[params.messages.length - 1]?.content || '';
        rawText = `[Offline Mode: ${err.message}]\n` + getMockCoachResponse(params.subject, lastUserMsg, profile);
      }
    }
  }

  // Socratic guardrail validation
  const validation = validateSocraticResponse(rawText);
  let { cleanText, visual } = extractVisualFromResponse(validation.sanitizedText);

  // Visual Fallback Safeguard: If the student asked for a visual or the coach references a diagram,
  // ensure a visual is always attached even if the LLM omitted the tag in its text response
  if (!visual) {
    const lastUserMsg = (params.messages[params.messages.length - 1]?.content || '').toLowerCase();
    const coachLower = cleanText.toLowerCase();

    const studentRequestedVisual =
      lastUserMsg.includes('visual') ||
      lastUserMsg.includes('diagram') ||
      lastUserMsg.includes('picture') ||
      lastUserMsg.includes('model') ||
      lastUserMsg.includes('show me');

    const coachMentionsVisual =
      coachLower.includes('here is a diagram') ||
      coachLower.includes("here's a diagram") ||
      coachLower.includes("here's a detailed one") ||
      coachLower.includes('the diagram shows') ||
      coachLower.includes('this diagram') ||
      coachLower.includes('this picture') ||
      coachLower.includes('based on this picture');

    if (studentRequestedVisual || coachMentionsVisual) {
      const fallbackMock = getMockCoachResponse(params.subject, lastUserMsg, profile);
      const fallbackExtraction = extractVisualFromResponse(fallbackMock);
      if (fallbackExtraction.visual) {
        visual = fallbackExtraction.visual;
      }
    }
  }

  return {
    text: cleanText,
    visual: visual as VisualSpec | undefined,
    isGuarded: !validation.isSafe
  };
}
