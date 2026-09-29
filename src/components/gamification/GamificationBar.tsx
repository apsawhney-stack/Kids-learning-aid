import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GamificationState, XP_PER_LEVEL } from '../../types/gamification';
import { getLevelTitle } from '../../services/gamification/gamificationService';

interface GamificationBarProps {
  state: GamificationState;
  onPressBadges?: () => void;
}

export const GamificationBar: React.FC<GamificationBarProps> = ({ state, onPressBadges }) => {
  const currentLevel = state.level || 1;
  const currentXP = state.xp || 0;
  const xpInCurrentLevel = currentXP % XP_PER_LEVEL;
  const progressPercent = Math.min((xpInCurrentLevel / XP_PER_LEVEL) * 100, 100);
  const levelTitle = getLevelTitle(currentLevel);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPressBadges}
      style={styles.container}
    >
      <View style={styles.leftRow}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelNumber}>Lv.{currentLevel}</Text>
        </View>
        <View style={styles.titleColumn}>
          <Text style={styles.levelTitle}>{levelTitle}</Text>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.xpText}>
            {xpInCurrentLevel} / {XP_PER_LEVEL} XP
          </Text>
        </View>
      </View>

      {/* Streak Badge */}
      <View style={styles.streakBadge}>
        <Text style={styles.streakIcon}>🔥</Text>
        <Text style={styles.streakCount}>{state.currentStreak}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  levelBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  levelNumber: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  titleColumn: {
    flex: 1,
    marginRight: 12,
  },
  levelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 3,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  xpText: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  streakIcon: {
    fontSize: 13,
    marginRight: 2,
  },
  streakCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
});
