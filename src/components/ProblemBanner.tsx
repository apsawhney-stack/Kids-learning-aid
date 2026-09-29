import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

interface ProblemBannerProps {
  title: string;
  imageUri?: string;
  description?: string;
  onPressNewProblem?: () => void;
}

export const ProblemBanner: React.FC<ProblemBannerProps> = ({
  title,
  imageUri,
  description,
  onPressNewProblem
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.headerLeft}
          activeOpacity={0.7}
          onPress={() => setCollapsed(!collapsed)}
        >
          <Text style={styles.badge}>📌 ACTIVE PROBLEM</Text>
          <Text style={styles.chevron}>{collapsed ? ' ▼' : ' ▲'}</Text>
        </TouchableOpacity>

        {onPressNewProblem ? (
          <TouchableOpacity
            style={styles.newButton}
            onPress={onPressNewProblem}
            activeOpacity={0.7}
          >
            <Text style={styles.newButtonText}>+ New Quest</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Problem Title */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setCollapsed(!collapsed)}
      >
        <Text style={styles.title} numberOfLines={collapsed ? 1 : 2}>
          {title || 'Current Homework Challenge'}
        </Text>
      </TouchableOpacity>

      {/* Collapsible Body */}
      {!collapsed ? (
        <View style={styles.bodyRow}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
          ) : null}
          <Text style={styles.description} numberOfLines={3}>
            {description || 'Snap a worksheet photo or type your homework problem below!'}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    marginHorizontal: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.5,
  },
  chevron: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '700',
  },
  newButton: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  newButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
    marginBottom: 2,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  thumbnail: {
    width: 38,
    height: 38,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    lineHeight: 16,
  },
});
