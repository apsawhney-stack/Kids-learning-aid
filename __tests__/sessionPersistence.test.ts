import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
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

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' }
}));

import {
  getActiveSessionState,
  saveActiveSessionState,
  clearActiveSessionState,
  saveSession
} from '../src/services/storage/storageService';
import { HomeworkSession } from '../src/types/chat';

describe('Session Chat History Persistence', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
    jest.clearAllMocks();
  });

  test('restores session from allSessions fallback when active session key is not yet set', async () => {
    // Simulate user previously had a session saved via saveSession
    const previousSession: HomeworkSession = {
      id: 'session_math_1790462100000',
      subject: 'math',
      title: 'Finding Ratios & Simplifying',
      problemDescription: 'Find the ratio of boys to girls if there are 12 boys and 16 girls.',
      messages: [
        { id: 'm1', role: 'assistant', content: 'What numbers are we comparing?', timestamp: 1000 },
        { id: 'm2', role: 'user', content: '12 boys and 16 girls', timestamp: 2000 },
        { id: 'm3', role: 'assistant', content: 'Awesome! So how can we write that ratio?', timestamp: 3000 }
      ],
      startTime: Date.now() - 3600000,
      endTime: Date.now() - 1800000,
      hintCount: 1,
      isCompleted: false,
      xpEarned: 40
    };

    await saveSession(previousSession);

    // Call getActiveSessionState with mindstep_active_session_data being empty
    const restored = await getActiveSessionState();

    expect(restored).not.toBeNull();
    expect(restored?.id).toBe('session_math_1790462100000');
    expect(restored?.messages.length).toBe(3);
    expect(restored?.messages[1].content).toBe('12 boys and 16 girls');
  });

  test('saves and retrieves active session directly', async () => {
    const activeSession: HomeworkSession = {
      id: 'session_science_999',
      subject: 'science',
      title: 'Photosynthesis',
      messages: [
        { id: 's1', role: 'assistant', content: 'Let us explore plants!', timestamp: 1000 }
      ],
      startTime: Date.now(),
      endTime: Date.now(),
      hintCount: 1,
      isCompleted: false,
      xpEarned: 20
    };

    await saveActiveSessionState(activeSession);
    const result = await getActiveSessionState();

    expect(result).not.toBeNull();
    expect(result?.id).toBe('session_science_999');
    expect(result?.title).toBe('Photosynthesis');

    await clearActiveSessionState();
    const afterClear = await getActiveSessionState();
    expect(afterClear).toBeNull();
  });
});
