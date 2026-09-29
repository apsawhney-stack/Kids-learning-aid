import { describe, test, expect } from '@jest/globals';
import { getLevelTitle, awardXP } from '../src/services/gamification/gamificationService';
import { XP_PER_LEVEL } from '../src/types/gamification';

// Mock AsyncStorage and SecureStore
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
}));

jest.mock('../src/services/storage/secureStore', () => ({
  getSecureItem: jest.fn().mockResolvedValue(null),
  saveSecureItem: jest.fn().mockResolvedValue(null),
}));

describe('Gamification Engine', () => {
  test('returns proper level titles as levels increase', () => {
    expect(getLevelTitle(1)).toBe('Rookie Thinker');
    expect(getLevelTitle(2)).toBe('Junior Explorer');
    expect(getLevelTitle(4)).toBe('Rising Strategist');
    expect(getLevelTitle(7)).toBe('Middle School All-Star');
    expect(getLevelTitle(10)).toBe('Grand Grandmaster');
  });

  test('awards XP and calculates level up correctly', async () => {
    // Initial XP is 120 (Level 1 in mock starting state)
    const result = await awardXP(100, 'solve', 'math');

    expect(result.newXP).toBe(220);
    // At 220 XP and 150 XP/level, level is Math.floor(220/150) + 1 = 2
    expect(result.newLevel).toBe(2);
    expect(result.newBadges.length).toBeGreaterThanOrEqual(1);
    expect(result.newBadges[0].title).toBe('First Breakthrough');
  });
});
