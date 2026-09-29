import { Badge, GamificationState, XP_PER_LEVEL, LEVEL_TITLES } from '../../types/gamification';
import { getGamificationState, saveGamificationState } from '../storage/storageService';

export interface XPResult {
  previousXP: number;
  newXP: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  newBadges: Badge[];
}

const AVAILABLE_BADGES: Badge[] = [
  {
    id: 'badge_first_solve',
    title: 'First Breakthrough',
    description: 'Solved your first homework challenge with Coach Spark!',
    iconName: 'trophy',
    category: 'general'
  },
  {
    id: 'badge_clutch_player',
    title: 'Clutch Player',
    description: 'Kept trying after being stuck and unlocked the solution!',
    iconName: 'zap',
    category: 'math'
  },
  {
    id: 'badge_master_crafter',
    title: 'Master Crafter',
    description: 'Mastered a tricky ratio problem using a game analogy!',
    iconName: 'box',
    category: 'math'
  },
  {
    id: 'badge_evidence_detective',
    title: 'Evidence Detective',
    description: 'Constructed a rock-solid Claim, Evidence & Reasoning argument!',
    iconName: 'search',
    category: 'english'
  },
  {
    id: 'badge_variable_master',
    title: 'Chief Scientist',
    description: 'Identified the independent and dependent variables on the first try!',
    iconName: 'flask-conical',
    category: 'science'
  },
  {
    id: 'badge_time_traveler',
    title: 'Time Traveler',
    description: 'Successfully analyzed cause-and-effect in an ancient civilization!',
    iconName: 'compass',
    category: 'history'
  },
  {
    id: 'badge_iron_streak',
    title: 'Iron Focus',
    description: 'Maintained a 3-day homework quest streak!',
    iconName: 'flame',
    category: 'general'
  }
];

export async function awardXP(
  amount: number,
  actionType?: 'solve' | 'hint' | 'check' | 'analogy' | 'visual',
  subject?: string
): Promise<XPResult> {
  const state = await getGamificationState();
  const previousXP = state.xp;
  const previousLevel = state.level;

  const newXP = previousXP + amount;
  const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
  const leveledUp = newLevel > previousLevel;

  // Streak calculation
  const today = new Date().toISOString().split('T')[0];
  if (state.lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (state.lastActiveDate === yesterday) {
      state.currentStreak += 1;
    } else {
      state.currentStreak = 1;
    }
    state.lastActiveDate = today;
  }

  // Check badges
  const newBadges: Badge[] = [];
  const unlockedIds = new Set(state.badges.map((b) => b.id));

  // First solve badge
  if (actionType === 'solve' && !unlockedIds.has('badge_first_solve')) {
    const b = AVAILABLE_BADGES.find((x) => x.id === 'badge_first_solve')!;
    newBadges.push({ ...b, unlockedAt: Date.now() });
  }

  // Clutch player badge
  if (actionType === 'solve' && !unlockedIds.has('badge_clutch_player')) {
    const b = AVAILABLE_BADGES.find((x) => x.id === 'badge_clutch_player')!;
    newBadges.push({ ...b, unlockedAt: Date.now() });
  }

  // Streak badge
  if (state.currentStreak >= 3 && !unlockedIds.has('badge_iron_streak')) {
    const b = AVAILABLE_BADGES.find((x) => x.id === 'badge_iron_streak')!;
    newBadges.push({ ...b, unlockedAt: Date.now() });
  }

  const updatedState: GamificationState = {
    ...state,
    xp: newXP,
    level: newLevel,
    badges: [...state.badges, ...newBadges]
  };

  await saveGamificationState(updatedState);

  return {
    previousXP,
    newXP,
    previousLevel,
    newLevel,
    leveledUp,
    newBadges
  };
}

export function getLevelTitle(level: number): string {
  const index = Math.min(Math.max(level - 1, 0), LEVEL_TITLES.length - 1);
  return LEVEL_TITLES[index];
}
