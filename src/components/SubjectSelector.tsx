import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Subject } from '../types/chat';
import { CURRICULUM_DATA } from '../config/curriculumTopics';

interface SubjectSelectorProps {
  selectedSubject: Subject;
  onSelectSubject: (subject: Subject) => void;
}

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  selectedSubject,
  onSelectSubject
}) => {
  const subjects: Subject[] = ['math', 'english', 'science', 'history'];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {subjects.map((subj) => {
          const info = CURRICULUM_DATA[subj];
          const isSelected = selectedSubject === subj;

          return (
            <TouchableOpacity
              key={subj}
              activeOpacity={0.7}
              onPress={() => onSelectSubject(subj)}
              style={[
                styles.chip,
                isSelected && { backgroundColor: info.color, borderColor: info.color }
              ]}
            >
              <Text style={styles.icon}>{info.icon}</Text>
              <Text style={[styles.label, isSelected && styles.selectedLabel]}>
                {subj === 'english' ? 'English' : info.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  icon: {
    fontSize: 13,
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  selectedLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
