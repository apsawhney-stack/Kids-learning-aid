import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Badge } from '../../types/gamification';

interface BadgeUnlockModalProps {
  badge: Badge | null;
  visible: boolean;
  onClose: () => void;
}

export const BadgeUnlockModal: React.FC<BadgeUnlockModalProps> = ({
  badge,
  visible,
  onClose
}) => {
  if (!badge) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.trophyEmoji}>🏆</Text>
          <Text style={styles.unlockTitle}>BADGE UNLOCKED!</Text>
          <Text style={styles.badgeName}>{badge.title}</Text>
          <Text style={styles.badgeDesc}>{badge.description}</Text>

          <TouchableOpacity style={styles.claimButton} onPress={onClose}>
            <Text style={styles.claimButtonText}>Awesome! +50 XP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  trophyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  unlockTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 1,
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  claimButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  }
});
