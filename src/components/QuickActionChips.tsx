import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export type ActionChipType = 'visual' | 'analogy' | 'breakdown' | 'check' | 'stuck';

interface QuickActionChipsProps {
  onSelectAction: (type: ActionChipType) => void;
  disabled?: boolean;
}

export const QuickActionChips: React.FC<QuickActionChipsProps> = ({
  onSelectAction,
  disabled
}) => {
  const actions: Array<{ type: ActionChipType; label: string; icon: string }> = [
    { type: 'visual', label: 'Show Visual', icon: '👁️' },
    { type: 'analogy', label: 'Give Analogy', icon: '🏀' },
    { type: 'breakdown', label: 'Break It Down', icon: '🧩' },
    { type: 'check', label: 'Check My Work', icon: '📝' },
    { type: 'stuck', label: "I'm Stuck", icon: '🆘' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {actions.map((act) => (
          <TouchableOpacity
            key={act.type}
            activeOpacity={0.7}
            disabled={disabled}
            onPress={() => onSelectAction(act.type)}
            style={[styles.chip, disabled && styles.disabledChip]}
          >
            <Text style={styles.icon}>{act.icon}</Text>
            <Text style={styles.label}>{act.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  scroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  disabledChip: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 13,
    marginRight: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
});
