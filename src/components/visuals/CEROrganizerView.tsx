import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CERData } from '../../types/visuals';

interface CEROrganizerViewProps {
  data: CERData;
}

export const CEROrganizerView: React.FC<CEROrganizerViewProps> = ({ data }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>🧩 CER Argument Builder</Text>

      {/* 1. Claim */}
      <View style={[styles.card, styles.claimCard]}>
        <View style={styles.badgeRow}>
          <Text style={[styles.badge, styles.claimBadge]}>C • CLAIM</Text>
          <Text style={styles.helperText}>What do you think is true?</Text>
        </View>
        <Text style={styles.cardContent}>{data.claim || 'State your main answer or point here.'}</Text>
      </View>

      {/* Arrow Down */}
      <View style={styles.arrowRow}>
        <Text style={styles.arrowText}>⬇️ Supported By</Text>
      </View>

      {/* 2. Evidence */}
      <View style={[styles.card, styles.evidenceCard]}>
        <View style={styles.badgeRow}>
          <Text style={[styles.badge, styles.evidenceBadge]}>E • EVIDENCE</Text>
          <Text style={styles.helperText}>Quotes or facts from the text</Text>
        </View>
        {(data.evidence || []).map((item, idx) => (
          <Text key={idx} style={styles.cardContent}>
            💬 "{item}"
          </Text>
        ))}
      </View>

      {/* Arrow Down */}
      <View style={styles.arrowRow}>
        <Text style={styles.arrowText}>⬇️ Connected By</Text>
      </View>

      {/* 3. Reasoning */}
      <View style={[styles.card, styles.reasoningCard]}>
        <View style={styles.badgeRow}>
          <Text style={[styles.badge, styles.reasoningBadge]}>R • REASONING</Text>
          <Text style={styles.helperText}>How the evidence proves the claim</Text>
        </View>
        <Text style={styles.cardContent}>{data.reasoning || 'Explain why this fact proves your point.'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1.5,
  },
  claimCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  evidenceCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  reasoningCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: '#FFFFFF',
    marginRight: 6,
  },
  claimBadge: { backgroundColor: '#10B981' },
  evidenceBadge: { backgroundColor: '#3B82F6' },
  reasoningBadge: { backgroundColor: '#F59E0B' },
  helperText: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
  },
  cardContent: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
    fontWeight: '500',
  },
  arrowRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  arrowText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
});
