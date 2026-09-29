import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeworkSession } from '../../types/chat';
import { CURRICULUM_DATA } from '../../config/curriculumTopics';

interface TranscriptDetailScreenProps {
  session: HomeworkSession;
  onBack: () => void;
  onResumeSession?: (session: HomeworkSession) => void;
}

export const TranscriptDetailScreen: React.FC<TranscriptDetailScreenProps> = ({
  session,
  onBack,
  onResumeSession
}) => {
  const insets = useSafeAreaInsets();
  const subjectInfo = CURRICULUM_DATA[session.subject];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 48) }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Transcript</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Session Meta */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.subjectBadge}>
              {subjectInfo.icon} {subjectInfo.title}
            </Text>
            <Text style={styles.dateText}>
              {new Date(session.startTime).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.sessionTitle}>{session.title}</Text>
          {session.problemDescription ? (
            <Text style={styles.problemDesc}>"{session.problemDescription}"</Text>
          ) : null}
          {session.problemImageUri ? (
            <Image
              source={{ uri: session.problemImageUri }}
              style={styles.worksheetPhoto}
              resizeMode="contain"
            />
          ) : null}

          {onResumeSession ? (
            <TouchableOpacity
              style={styles.resumeBtn}
              onPress={() => onResumeSession(session)}
              activeOpacity={0.8}
            >
              <Text style={styles.resumeBtnText}>⚡ Continue This Session in Coach</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Message Log */}
        <Text style={styles.sectionHeader}>CONVERSATION LOG ({session.messages.length} TURNS)</Text>
        {session.messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <View
              key={idx}
              style={[
                styles.messageRow,
                isUser ? styles.userMessageRow : styles.assistantMessageRow
              ]}
            >
              <Text style={styles.speakerLabel}>
                {isUser ? '👦 Alex (Student)' : '⚡ Coach Spark'}
              </Text>
              <Text style={styles.messageContent}>{m.content}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { padding: 4 },
  backText: { color: '#4F46E5', fontWeight: '700', fontSize: 15 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  content: { padding: 16 },
  metaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subjectBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  dateText: { fontSize: 12, color: '#94A3B8' },
  sessionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  problemDesc: { fontSize: 13, color: '#64748B', fontStyle: 'italic', marginBottom: 8 },
  worksheetPhoto: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginTop: 6,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  messageRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userMessageRow: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  assistantMessageRow: {
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  speakerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  messageContent: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  resumeBtn: {
    marginTop: 14,
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
