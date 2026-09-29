import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeworkSession } from '../../types/chat';
import { ProviderConfig, StudentProfile, LLMProviderId } from '../../types/provider';
import { GamificationState } from '../../types/gamification';
import { SessionInsight, ParentDashboardData } from '../../types/parent';
import { LearnerCognitiveProfile } from '../../types/learnerProfile';
import {
  getSecureItem,
  saveSecureItem,
  KEY_GEMINI_KEY,
  KEY_DEEPSEEK_KEY,
  KEY_OPENAI_KEY,
  KEY_CLAUDE_KEY,
  KEY_PARENT_PIN
} from './secureStore';

const STORAGE_KEYS = {
  SESSIONS: 'mindstep_sessions',
  STUDENT_PROFILE: 'mindstep_student_profile',
  ACTIVE_PROVIDER: 'mindstep_active_provider',
  PROVIDER_MODEL: 'mindstep_provider_model',
  GAMIFICATION: 'mindstep_gamification',
  PARENT_INSIGHTS: 'mindstep_parent_insights',
  VOICE_ENABLED: 'mindstep_voice_enabled',
  COACH_VOICE_NAME: 'mindstep_coach_voice_name',
  ACTIVE_SESSION_DATA: 'mindstep_active_session_data',
  LEARNER_PROFILE: 'mindstep_learner_profile'
};

const DEFAULT_PROFILE: StudentProfile = {
  name: 'Alex',
  grade: '6th grade',
  interests: ['Basketball & Sports', 'Minecraft & Roblox', 'Marvel Superheroes']
};

export async function getStoredStudentProfile(): Promise<StudentProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.STUDENT_PROFILE);
    return raw ? JSON.parse(raw) : DEFAULT_PROFILE;
  } catch (err) {
    return DEFAULT_PROFILE;
  }
}

export async function saveStudentProfile(profile: StudentProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.STUDENT_PROFILE, JSON.stringify(profile));
}

export async function getStoredProviderConfig(): Promise<ProviderConfig> {
  try {
    const activeProvider = (await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_PROVIDER)) || 'gemini';
    const savedModel = await AsyncStorage.getItem(STORAGE_KEYS.PROVIDER_MODEL);
    let apiKey = '';
    let modelName = savedModel || 'gemini-2.5-flash';

    if (activeProvider === 'gemini') {
      apiKey = (await getSecureItem(KEY_GEMINI_KEY)) || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
      modelName = savedModel || 'gemini-2.5-flash';
    } else if (activeProvider === 'deepseek') {
      apiKey = (await getSecureItem(KEY_DEEPSEEK_KEY)) || process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY || '';
      modelName = savedModel || 'deepseek-chat';
    } else if (activeProvider === 'openai') {
      apiKey = (await getSecureItem(KEY_OPENAI_KEY)) || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
      modelName = savedModel || 'gpt-4o-mini';
    } else if (activeProvider === 'claude') {
      apiKey = (await getSecureItem(KEY_CLAUDE_KEY)) || process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '';
      modelName = savedModel || 'claude-3-5-sonnet-20241022';
    }

    return {
      provider: activeProvider as any,
      apiKey,
      modelName
    };
  } catch (err) {
    return { provider: 'gemini', apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '', modelName: 'gemini-2.5-flash' };
  }
}

export async function saveProviderConfig(
  provider: LLMProviderId,
  apiKey: string,
  modelName?: string
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_PROVIDER, provider);
  if (modelName) {
    await AsyncStorage.setItem(STORAGE_KEYS.PROVIDER_MODEL, modelName);
  }
  if (provider === 'gemini') await saveSecureItem(KEY_GEMINI_KEY, apiKey);
  if (provider === 'deepseek') await saveSecureItem(KEY_DEEPSEEK_KEY, apiKey);
  if (provider === 'openai') await saveSecureItem(KEY_OPENAI_KEY, apiKey);
  if (provider === 'claude') await saveSecureItem(KEY_CLAUDE_KEY, apiKey);
}

export async function getDeepSeekApiKey(): Promise<string> {
  const stored = await getSecureItem(KEY_DEEPSEEK_KEY);
  if (stored && stored.trim()) return stored.trim();
  return process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY?.trim() || '';
}

export async function saveDeepSeekApiKey(key: string): Promise<void> {
  await saveSecureItem(KEY_DEEPSEEK_KEY, key);
}

export async function getBackupProviderConfig(): Promise<{
  provider: LLMProviderId;
  apiKey: string;
  modelName: string;
} | null> {
  const deepseekKey = (await getSecureItem(KEY_DEEPSEEK_KEY)) || process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
  if (deepseekKey && deepseekKey.trim()) {
    return { provider: 'deepseek', apiKey: deepseekKey.trim(), modelName: 'deepseek-chat' };
  }
  const openaiKey = (await getSecureItem(KEY_OPENAI_KEY)) || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (openaiKey && openaiKey.trim()) {
    return { provider: 'openai', apiKey: openaiKey.trim(), modelName: 'gpt-4o-mini' };
  }
  const claudeKey = (await getSecureItem(KEY_CLAUDE_KEY)) || process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
  if (claudeKey && claudeKey.trim()) {
    return { provider: 'claude', apiKey: claudeKey.trim(), modelName: 'claude-3-5-sonnet-20241022' };
  }
  return null;
}

export async function getActiveSessionState(): Promise<HomeworkSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_DATA);
    if (raw) {
      const session: HomeworkSession = JSON.parse(raw);
      const lastActive = session.endTime || session.startTime || 0;
      // Keep active session if it occurred within the last 24 hours
      if (Date.now() - lastActive < 24 * 60 * 60 * 1000) {
        return session;
      }
    }

    // Fallback: If no dedicated active session is recorded, restore the most recent session from all saved sessions!
    const allSessions = await getAllSessions();
    if (allSessions && allSessions.length > 0) {
      // Find the most recent session with multiple turns or messages
      const recent = allSessions.find(
        (s) => s.messages && s.messages.length > 1
      ) || allSessions[0];

      if (recent && recent.messages && recent.messages.length > 0) {
        return recent;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function saveActiveSessionState(session: HomeworkSession): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_DATA, JSON.stringify(session));
  } catch {}
}

export async function clearActiveSessionState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_DATA);
  } catch {}
}

export async function getParentPin(): Promise<string> {
  const pin = await getSecureItem(KEY_PARENT_PIN);
  return pin || '1234'; // Default PIN is 1234
}

export async function setParentPin(pin: string): Promise<void> {
  await saveSecureItem(KEY_PARENT_PIN, pin);
}

export async function getAllSessions(): Promise<HomeworkSession[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export async function saveSession(session: HomeworkSession): Promise<void> {
  try {
    const sessions = await getAllSessions();
    const index = sessions.findIndex((s) => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.error('Error saving session:', err);
  }
}

export async function getGamificationState(): Promise<GamificationState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.GAMIFICATION);
    if (raw) return JSON.parse(raw);
  } catch (err) {}

  return {
    xp: 120,
    level: 2,
    currentStreak: 3,
    lastActiveDate: new Date().toISOString().split('T')[0],
    badges: [
      {
        id: 'starter_rookie',
        title: 'Curious Starter',
        description: 'Began the learning quest with Coach Spark!',
        iconName: 'sparkles',
        category: 'general',
        unlockedAt: Date.now()
      }
    ]
  };
}

export async function saveGamificationState(state: GamificationState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.GAMIFICATION, JSON.stringify(state));
}

export async function getParentInsights(): Promise<ParentDashboardData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PARENT_INSIGHTS);
    if (raw) return JSON.parse(raw);
  } catch (err) {}

  // Initial starter data for immediate demo
  return {
    totalSessions: 5,
    totalTimeMinutes: 110,
    averageIndependence: 84,
    recentInsights: [
      {
        sessionId: 'session_demo_1',
        timestamp: Date.now() - 86400000,
        subject: 'math',
        topicTitle: 'Ratios & Tape Diagrams',
        durationMinutes: 24,
        independenceScore: 88,
        masteredConcepts: ['Setting up part-to-part ratios', 'Visualizing units with tape diagram'],
        stickingPoints: ['Simplifying 12/16 by finding Greatest Common Factor'],
        dinnerQuestion: 'Ask Alex how ratios relate to crafting recipes in Minecraft!',
        parentNote: 'Alex showed great persistence and unlocked the ratio on his own after viewing the tape diagram.'
      }
    ]
  };
}

export async function saveParentInsight(insight: SessionInsight): Promise<void> {
  try {
    const current = await getParentInsights();
    current.recentInsights.unshift(insight);
    current.totalSessions += 1;
    current.totalTimeMinutes += insight.durationMinutes;
    current.averageIndependence = Math.round(
      (current.averageIndependence * (current.totalSessions - 1) + insight.independenceScore) / current.totalSessions
    );
    await AsyncStorage.setItem(STORAGE_KEYS.PARENT_INSIGHTS, JSON.stringify(current));
  } catch (err) {
    console.error('Error saving parent insight:', err);
  }
}

export async function getStoredVoiceEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_ENABLED);
    return val === null ? true : val === 'true'; // Default enabled
  } catch (err) {
    return true;
  }
}

export async function saveStoredVoiceEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.VOICE_ENABLED, String(enabled));
  } catch (err) {
    console.error('Error saving voice setting:', err);
  }
}

export async function getStoredCoachVoice(): Promise<string> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.COACH_VOICE_NAME);
    return val || 'Puck'; // Default to Puck (Energetic young coach)
  } catch (err) {
    return 'Puck';
  }
}

export async function saveStoredCoachVoice(voice: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.COACH_VOICE_NAME, voice);
  } catch (err) {
    console.error('Error saving coach voice:', err);
  }
}

export const DEFAULT_LEARNER_PROFILE: LearnerCognitiveProfile = {
  studentName: 'Alex',
  grade: '6th grade',
  pacingPreference: 'bite-sized',
  visualPreference: 'diagrams-first',
  hintSensitivity: 'balanced',
  topAnalogies: ['Minecraft & Roblox crafting', 'Basketball shooting & stats', 'Marvel Superheroes'],
  frustrationTriggers: [],
  masteredConcepts: {
    math: [],
    science: [],
    english: [],
    history: []
  },
  growthAreas: {
    math: [],
    science: [],
    english: [],
    history: []
  },
  parentTips: [],
  totalSessionsAnalyzed: 0,
  lastUpdated: Date.now()
};

export async function getStoredLearnerProfile(): Promise<LearnerCognitiveProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.LEARNER_PROFILE);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_LEARNER_PROFILE));
    const parsed = JSON.parse(raw);
    return {
      ...JSON.parse(JSON.stringify(DEFAULT_LEARNER_PROFILE)),
      ...parsed,
      masteredConcepts: { ...DEFAULT_LEARNER_PROFILE.masteredConcepts, ...(parsed.masteredConcepts || {}) },
      growthAreas: { ...DEFAULT_LEARNER_PROFILE.growthAreas, ...(parsed.growthAreas || {}) },
      parentTips: parsed.parentTips || []
    };
  } catch (err) {
    return JSON.parse(JSON.stringify(DEFAULT_LEARNER_PROFILE));
  }
}

export async function saveLearnerProfile(profile: LearnerCognitiveProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LEARNER_PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.error('Error saving learner profile:', err);
  }
}

export async function updateLearnerProfile(
  partial: Partial<LearnerCognitiveProfile>
): Promise<LearnerCognitiveProfile> {
  const current = await getStoredLearnerProfile();
  const updated: LearnerCognitiveProfile = {
    ...current,
    ...partial,
    lastUpdated: Date.now()
  };
  await saveLearnerProfile(updated);
  return updated;
}

export async function resetLearnerProfile(): Promise<LearnerCognitiveProfile> {
  const resetProfile: LearnerCognitiveProfile = {
    ...JSON.parse(JSON.stringify(DEFAULT_LEARNER_PROFILE)),
    lastUpdated: Date.now()
  };
  await saveLearnerProfile(resetProfile);
  return resetProfile;
}

export async function addParentTip(tip: string): Promise<LearnerCognitiveProfile> {
  const trimmed = tip.trim();
  if (!trimmed) return getStoredLearnerProfile();
  const current = await getStoredLearnerProfile();
  if (!current.parentTips.includes(trimmed)) {
    current.parentTips.push(trimmed);
    current.lastUpdated = Date.now();
    await saveLearnerProfile(current);
  }
  return current;
}

export async function removeParentTip(index: number): Promise<LearnerCognitiveProfile> {
  const current = await getStoredLearnerProfile();
  if (index >= 0 && index < current.parentTips.length) {
    current.parentTips.splice(index, 1);
    current.lastUpdated = Date.now();
    await saveLearnerProfile(current);
  }
  return current;
}


