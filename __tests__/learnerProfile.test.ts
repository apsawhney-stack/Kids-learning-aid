import { describe, test, expect, jest, beforeEach } from '@jest/globals';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' }
}));

const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, val: string) => {
    mockStorage[key] = val;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  })
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve())
}));

import {
  getStoredLearnerProfile,
  saveLearnerProfile,
  resetLearnerProfile,
  addParentTip,
  removeParentTip,
  DEFAULT_LEARNER_PROFILE
} from '../src/services/storage/storageService';
import {
  extractSessionHabitSignals,
  applyHeuristicSynthesis
} from '../src/services/ai/habitSynthesizer';
import { buildSocraticSystemPrompt } from '../src/services/ai/promptTemplates';
import { HomeworkSession } from '../src/types/chat';
import { LearnerCognitiveProfile } from '../src/types/learnerProfile';

describe('Learner Personalization Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  });

  test('retrieves default learner profile and allows saving updates', async () => {
    const profile = await getStoredLearnerProfile();
    expect(profile.studentName).toBe('Alex');
    expect(profile.pacingPreference).toBe('bite-sized');
    expect(profile.visualPreference).toBe('diagrams-first');
    expect(profile.totalSessionsAnalyzed).toBe(0);

    profile.pacingPreference = 'standard';
    await saveLearnerProfile(profile);

    const reloaded = await getStoredLearnerProfile();
    expect(reloaded.pacingPreference).toBe('standard');
  });

  test('extracts habit signals: frustration, breakthrough, visual models, and analogies', () => {
    const mockSession: HomeworkSession = {
      id: 'sess_1',
      subject: 'math',
      title: 'Equivalent Ratios',
      messages: [
        { id: '1', role: 'assistant', content: 'Let us imagine you are crafting in Minecraft with 3 iron and 4 wood.', timestamp: 1 },
        { id: '2', role: 'user', content: "Ugh this is too hard, just tell me the answer!", timestamp: 2 },
        { id: '3', role: 'assistant', content: 'Check this out:\n<visual-svg><svg></svg></visual-svg>\nWhat pattern do you notice?', timestamp: 3 },
        { id: '4', role: 'user', content: 'Oh I see it now! That makes sense!', timestamp: 4 }
      ],
      startTime: 1000,
      endTime: 2000,
      hintCount: 3,
      isCompleted: true,
      xpEarned: 120
    };

    const signals = extractSessionHabitSignals(mockSession);
    expect(signals.frustrationCount).toBe(1);
    expect(signals.breakthroughDetected).toBe(true);
    expect(signals.visualsRenderedCount).toBe(1);
    expect(signals.hintLevelReached).toBe(3);
    expect(signals.analogiesUsed).toContain('Minecraft crafting & building');
  });

  test('heuristic synthesis adapts learner profile based on signals', () => {
    const baseProfile: LearnerCognitiveProfile = { ...DEFAULT_LEARNER_PROFILE };

    const mockSession: HomeworkSession = {
      id: 'sess_2',
      subject: 'math',
      title: 'Ratio Word Problems',
      messages: [
        { id: '1', role: 'assistant', content: 'Think of this like Roblox tycoon upgrading.', timestamp: 1 },
        { id: '2', role: 'user', content: 'I am stuck, give me the answer', timestamp: 2 },
        { id: '3', role: 'assistant', content: 'Here is a tape diagram.', timestamp: 3 },
        { id: '4', role: 'user', content: 'Oh I get it! It is 15!', timestamp: 4 }
      ],
      startTime: 1000,
      endTime: 2000,
      hintCount: 3,
      isCompleted: true,
      xpEarned: 120
    };

    const signals = extractSessionHabitSignals(mockSession);
    const synthesized = applyHeuristicSynthesis(baseProfile, mockSession, signals);

    expect(synthesized.pacingPreference).toBe('bite-sized');
    expect(synthesized.hintSensitivity).toBe('needs-quick-scaffolding');
    expect(synthesized.visualPreference).toBe('diagrams-first');
    expect(synthesized.masteredConcepts.math).toContain('Ratio Word Problems');
    expect(synthesized.totalSessionsAnalyzed).toBe(1);
  });

  test('dynamically injects personalized playbook into Socratic prompt', () => {
    const profile = { name: 'Alex', grade: '6th grade', interests: ['Basketball', 'Minecraft'] };
    const learnerProfile: LearnerCognitiveProfile = {
      ...DEFAULT_LEARNER_PROFILE,
      pacingPreference: 'bite-sized',
      visualPreference: 'diagrams-first',
      hintSensitivity: 'needs-quick-scaffolding',
      topAnalogies: ['Roblox tycoon cash flow', 'Basketball 3-point percentage'],
      parentTips: ['Tired after soccer on Tuesdays; keep questions short']
    };

    const prompt = buildSocraticSystemPrompt('math', profile, 1, learnerProfile);

    // Verify personalized sections are present
    expect(prompt).toContain('CUSTOMIZED LEARNING PLAYBOOK FOR ALEX');
    expect(prompt).toContain('Thrives on bite-sized micro-steps');
    expect(prompt).toContain('Roblox tycoon cash flow');
    expect(prompt).toContain('Highly visual learner');
    expect(prompt).toContain('PARENT COACHING INSTRUCTIONS: "Tired after soccer on Tuesdays; keep questions short"');
  });

  test('parent can add, remove tips and reset learner habits', async () => {
    await addParentTip('Alex loves detective stories and solving mysteries');
    let profile = await getStoredLearnerProfile();
    expect(profile.parentTips).toContain('Alex loves detective stories and solving mysteries');

    await removeParentTip(0);
    profile = await getStoredLearnerProfile();
    expect(profile.parentTips.length).toBe(0);

    profile.pacingPreference = 'challenge';
    await saveLearnerProfile(profile);

    const reset = await resetLearnerProfile();
    expect(reset.pacingPreference).toBe('bite-sized');
  });
});
