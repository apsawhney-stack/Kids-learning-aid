export interface Badge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: 'math' | 'science' | 'english' | 'history' | 'general';
  unlockedAt?: number;
}

export interface GamificationState {
  xp: number;
  level: number;
  currentStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  badges: Badge[];
}

export const LEVEL_TITLES = [
  'Rookie Thinker',        // Level 1
  'Junior Explorer',       // Level 2
  'Curious Scholar',       // Level 3
  'Rising Strategist',     // Level 4
  'Logic Detective',       // Level 5
  'Problem Buster',        // Level 6
  'Middle School All-Star',// Level 7
  'Concept Champion',      // Level 8
  'Mastermind Coach',      // Level 9
  'Grand Grandmaster'      // Level 10+
];

export const XP_PER_LEVEL = 150;
