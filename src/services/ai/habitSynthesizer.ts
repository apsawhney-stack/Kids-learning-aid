import { HomeworkSession } from '../../types/chat';
import {
  LearnerCognitiveProfile,
  SessionHabitSignals,
  PacingPreference,
  VisualPreference,
  HintSensitivity
} from '../../types/learnerProfile';
import {
  getStoredLearnerProfile,
  saveLearnerProfile,
  getStoredProviderConfig,
  getBackupProviderConfig
} from '../storage/storageService';
import { callGemini } from './geminiProvider';
import { callDeepSeek } from './deepseekProvider';
import { callOpenAI } from './openaiProvider';
import { callClaude } from './claudeProvider';

const FRUSTRATION_REGEX = /i don't get (it|this)|just tell me|give me the answer|what('?s| is) the answer|i give up|this is too hard|i'?m stuck|i hate this/i;
const BREAKTHROUGH_REGEX = /oh i (get|see) it|that makes sense|aha|i got it|easy now|now i understand|i figured it out/i;

const ANALOGY_KEYWORDS: Record<string, string> = {
  minecraft: 'Minecraft crafting & building',
  roblox: 'Roblox tycoon & trading',
  basketball: 'Basketball shooting & sports stats',
  marvel: 'Marvel superheroes & powers',
  lego: 'Lego building & modular pieces',
  pizza: 'Pizza slice sharing'
};

/**
 * Extracts passive habit signals from the session messages and interactions.
 */
export function extractSessionHabitSignals(session: HomeworkSession): SessionHabitSignals {
  let frustrationCount = 0;
  let breakthroughDetected = false;
  let visualsRenderedCount = 0;
  const detectedAnalogies = new Set<string>();

  const messages = session.messages || [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const content = msg.content || '';

    if (msg.role === 'user') {
      if (FRUSTRATION_REGEX.test(content)) {
        frustrationCount++;
      }
      if (BREAKTHROUGH_REGEX.test(content)) {
        breakthroughDetected = true;
      }
    } else if (msg.role === 'assistant') {
      if (content.includes('<visual') || content.includes('<svg') || msg.visual) {
        visualsRenderedCount++;
      }

      // Check which analogies the coach referenced
      const lower = content.toLowerCase();
      for (const [key, label] of Object.entries(ANALOGY_KEYWORDS)) {
        if (lower.includes(key)) {
          // If the student subsequently had a breakthrough or responded with positive momentum
          const nextStudentMsg = messages[i + 1];
          if (nextStudentMsg && (BREAKTHROUGH_REGEX.test(nextStudentMsg.content) || nextStudentMsg.content.length > 5)) {
            detectedAnalogies.add(label);
          }
        }
      }
    }
  }

  return {
    sessionId: session.id,
    subject: session.subject,
    turnCount: messages.length,
    hintLevelReached: session.hintCount || 1,
    visualsRenderedCount,
    frustrationCount,
    breakthroughDetected,
    analogiesUsed: Array.from(detectedAnalogies)
  };
}

/**
 * Deterministic rule-based synthesizer that learns habits locally even without internet/API calls.
 */
export function applyHeuristicSynthesis(
  current: LearnerCognitiveProfile,
  session: HomeworkSession,
  signals: SessionHabitSignals
): LearnerCognitiveProfile {
  const updated: LearnerCognitiveProfile = {
    ...current,
    totalSessionsAnalyzed: current.totalSessionsAnalyzed + 1,
    lastUpdated: Date.now()
  };

  // 1. Pacing adjustment
  if (signals.frustrationCount >= 2 || signals.hintLevelReached >= 3) {
    updated.pacingPreference = 'bite-sized';
  } else if (signals.turnCount > 10 && signals.frustrationCount === 0) {
    updated.pacingPreference = 'standard';
  }

  // 2. Hint sensitivity
  if (signals.hintLevelReached >= 3 || signals.frustrationCount > 0) {
    updated.hintSensitivity = 'needs-quick-scaffolding';
  } else if (signals.hintLevelReached === 1 && signals.turnCount <= 4) {
    updated.hintSensitivity = 'prefers-self-discovery';
  }

  // 3. Visual preference
  if (signals.visualsRenderedCount > 0 || session.subject === 'math' || session.subject === 'science') {
    updated.visualPreference = 'diagrams-first';
  }

  // 4. Analogies that connected
  for (const analogy of signals.analogiesUsed) {
    if (!updated.topAnalogies.includes(analogy)) {
      updated.topAnalogies = [analogy, ...updated.topAnalogies].slice(0, 5);
    }
  }

  // 5. Concept tracking
  const subj = session.subject;
  const topicTitle = session.title?.trim() || `${session.subject} Practice`;
  if (session.isCompleted || signals.breakthroughDetected) {
    const existing = updated.masteredConcepts[subj] || [];
    if (!existing.includes(topicTitle)) {
      updated.masteredConcepts[subj] = [...existing, topicTitle].slice(-10);
    }
  } else if (signals.frustrationCount > 0 || signals.hintLevelReached >= 3) {
    const existingGrowth = updated.growthAreas[subj] || [];
    if (!existingGrowth.includes(topicTitle)) {
      updated.growthAreas[subj] = [...existingGrowth, topicTitle].slice(-10);
    }
  }

  return updated;
}

/**
 * Builds the AI prompt to reflect on the session transcript and extract nuanced learner habits.
 */
export function buildHabitSynthesisPrompt(
  transcript: string,
  currentProfile: LearnerCognitiveProfile,
  signals: SessionHabitSignals
): string {
  return `
You are an expert cognitive learning specialist analyzing a 6th-grade student's interaction with their AI tutor.

CURRENT KNOWN PROFILE FOR ${currentProfile.studentName}:
- Pacing Preference: ${currentProfile.pacingPreference}
- Visual Preference: ${currentProfile.visualPreference}
- Hint Sensitivity: ${currentProfile.hintSensitivity}
- Known Top Analogies: ${currentProfile.topAnalogies.join(', ')}

OBSERVED SESSION SIGNALS:
- Subject: ${signals.subject}
- Turns: ${signals.turnCount}, Hints Used: ${signals.hintLevelReached}
- Visuals Shown: ${signals.visualsRenderedCount}
- Frustration Instances: ${signals.frustrationCount}
- Breakthrough Detected: ${signals.breakthroughDetected}

TRANSCRIPT:
${transcript}

Task: Reflect on how this student learns best based on this conversation.
Return a strictly valid JSON object matching this schema (with NO markdown code fences or conversational text):
{
  "pacingPreference": "bite-sized" | "standard" | "challenge",
  "visualPreference": "diagrams-first" | "step-by-step" | "conceptual-first",
  "hintSensitivity": "needs-quick-scaffolding" | "prefers-self-discovery" | "balanced",
  "effectiveAnalogies": ["analogy1", "analogy2"],
  "frustrationTrigger": "brief description or empty string",
  "masteredConcept": "concept name if mastered or empty string",
  "growthArea": "specific hurdle observed or empty string"
}
`;
}

/**
 * Synthesizes student habits from a session, persisting the updated LearnerCognitiveProfile.
 */
export async function synthesizeLearnerHabits(
  session: HomeworkSession
): Promise<LearnerCognitiveProfile> {
  const currentProfile = await getStoredLearnerProfile();
  const signals = extractSessionHabitSignals(session);

  // Apply deterministic baseline first
  let synthesized = applyHeuristicSynthesis(currentProfile, session, signals);

  // Attempt nuanced AI synthesis if provider is available
  try {
    const config = await getStoredProviderConfig();
    const backup = await getBackupProviderConfig();
    const activeKey = config.apiKey || backup?.apiKey;
    const activeProvider = config.apiKey ? config.provider : backup?.provider;

    if (activeKey && activeKey.trim() !== '' && session.messages && session.messages.length >= 4) {
      const transcript = session.messages
        .slice(-12)
        .map((m) => `${m.role === 'user' ? 'Student' : 'Coach'}: ${m.content}`)
        .join('\n');

      const prompt = buildHabitSynthesisPrompt(transcript, currentProfile, signals);
      let rawResponse = '';

      if (activeProvider === 'deepseek') {
        const res = await callDeepSeek(activeKey, 'deepseek-chat', {
          systemPrompt: 'You are an educational psychologist outputting strictly valid JSON.',
          messages: [{ role: 'user', content: prompt }]
        });
        rawResponse = res.text;
      } else if (activeProvider === 'gemini') {
        const res = await callGemini(activeKey, 'gemini-1.5-flash', {
          systemPrompt: 'You are an educational psychologist outputting strictly valid JSON.',
          messages: [{ role: 'user', content: prompt }]
        });
        rawResponse = res.text;
      } else if (activeProvider === 'openai') {
        const res = await callOpenAI(activeKey, 'gpt-4o-mini', {
          systemPrompt: 'You are an educational psychologist outputting strictly valid JSON.',
          messages: [{ role: 'user', content: prompt }]
        });
        rawResponse = res.text;
      } else if (activeProvider === 'claude') {
        const res = await callClaude(activeKey, 'claude-3-5-sonnet-20241022', {
          systemPrompt: 'You are an educational psychologist outputting strictly valid JSON.',
          messages: [{ role: 'user', content: prompt }]
        });
        rawResponse = res.text;
      }

      if (rawResponse) {
        const clean = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(clean);

        if (aiData.pacingPreference) synthesized.pacingPreference = aiData.pacingPreference;
        if (aiData.visualPreference) synthesized.visualPreference = aiData.visualPreference;
        if (aiData.hintSensitivity) synthesized.hintSensitivity = aiData.hintSensitivity;
        if (Array.isArray(aiData.effectiveAnalogies)) {
          synthesized.topAnalogies = Array.from(
            new Set([...aiData.effectiveAnalogies, ...synthesized.topAnalogies])
          ).slice(0, 5);
        }
        if (aiData.frustrationTrigger && aiData.frustrationTrigger.trim()) {
          synthesized.frustrationTriggers = Array.from(
            new Set([aiData.frustrationTrigger.trim(), ...synthesized.frustrationTriggers])
          ).slice(0, 4);
        }
        if (aiData.masteredConcept && aiData.masteredConcept.trim()) {
          const list = synthesized.masteredConcepts[session.subject] || [];
          if (!list.includes(aiData.masteredConcept.trim())) {
            synthesized.masteredConcepts[session.subject] = [...list, aiData.masteredConcept.trim()].slice(-10);
          }
        }
        if (aiData.growthArea && aiData.growthArea.trim()) {
          const list = synthesized.growthAreas[session.subject] || [];
          if (!list.includes(aiData.growthArea.trim())) {
            synthesized.growthAreas[session.subject] = [...list, aiData.growthArea.trim()].slice(-10);
          }
        }
      }
    }
  } catch (err) {
    // Non-blocking: If AI synthesis times out or errors, heuristic synthesis is already safely applied
    console.log('[HabitSynthesizer] AI synthesis skipped, heuristic profile retained.');
  }

  await saveLearnerProfile(synthesized);
  return synthesized;
}
