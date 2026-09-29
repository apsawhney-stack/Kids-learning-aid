import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ParentDashboardData, SessionInsight } from '../../types/parent';
import { HomeworkSession } from '../../types/chat';
import {
  getParentInsights,
  getAllSessions,
  getStoredLearnerProfile,
  addParentTip,
  removeParentTip,
  resetLearnerProfile
} from '../../services/storage/storageService';
import { LearnerCognitiveProfile } from '../../types/learnerProfile';
import { TranscriptDetailScreen } from './TranscriptDetailScreen';
import { CURRICULUM_DATA } from '../../config/curriculumTopics';

interface ParentDashboardScreenProps {
  onBack: () => void;
  onResumeSession?: (session: HomeworkSession) => void;
}

export const ParentDashboardScreen: React.FC<ParentDashboardScreenProps> = ({ onBack, onResumeSession }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<ParentDashboardData | null>(null);
  const [learnerProfile, setLearnerProfile] = useState<LearnerCognitiveProfile | null>(null);
  const [sessions, setSessions] = useState<HomeworkSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<HomeworkSession | null>(null);
  const [newParentTip, setNewParentTip] = useState('');
  const [isAddingTip, setIsAddingTip] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getParentInsights();
    const sessionList = await getAllSessions();
    const profile = await getStoredLearnerProfile();
    setDashboardData(data);
    setSessions(sessionList);
    setLearnerProfile(profile);
    setLoading(false);
  };

  const handleAddTip = async () => {
    if (!newParentTip.trim()) return;
    const updated = await addParentTip(newParentTip.trim());
    setLearnerProfile(updated);
    setNewParentTip('');
    setIsAddingTip(false);
  };

  const handleRemoveTip = async (index: number) => {
    const updated = await removeParentTip(index);
    setLearnerProfile(updated);
  };

  const handleResetLearnerHabits = () => {
    Alert.alert(
      'Reset Learned Habits?',
      'This will reset Coach Spark\'s learned pacing and visual preferences back to defaults. Your past session logs will NOT be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Habits',
          style: 'destructive',
          onPress: async () => {
            const reset = await resetLearnerProfile();
            setLearnerProfile(reset);
            Alert.alert('Memory Reset', 'Coach Spark\'s personalized learning habits have been reset to defaults.');
          }
        }
      ]
    );
  };

  if (selectedSession) {
    return (
      <TranscriptDetailScreen
        session={selectedSession}
        onBack={() => setSelectedSession(null)}
        onResumeSession={onResumeSession}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 48) }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to Coach</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parent Insights</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Top KPI Cards */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiNumber}>{dashboardData?.totalSessions || 0}</Text>
              <Text style={styles.kpiLabel}>Sessions</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiNumber}>{dashboardData?.totalTimeMinutes || 0}m</Text>
              <Text style={styles.kpiLabel}>Time Spent</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiNumber, { color: '#10B981' }]}>
                {dashboardData?.averageIndependence || 85}%
              </Text>
              <Text style={styles.kpiLabel}>Independence</Text>
            </View>
          </View>

          {/* Dinner Discussion Prompt */}
          {dashboardData?.recentInsights?.[0]?.dinnerQuestion ? (
            <View style={styles.dinnerCard}>
              <View style={styles.dinnerHeader}>
                <Text style={styles.dinnerEmoji}>💬</Text>
                <Text style={styles.dinnerTitle}>DINNER TABLE DISCUSSION STARTER</Text>
              </View>
              <Text style={styles.dinnerText}>
                "{dashboardData.recentInsights[0].dinnerQuestion}"
              </Text>
              <Text style={styles.dinnerSub}>
                Generated from today's {dashboardData.recentInsights[0].subject} session to reinforce learning.
              </Text>
            </View>
          ) : null}

          {/* Personalized Cognitive Habits (Layer 4) */}
          <Text style={styles.sectionHeader}>LEARNER PROFILE & HABITS</Text>
          <View style={styles.habitsCard}>
            <View style={styles.habitsHeader}>
              <Text style={styles.habitsEmoji}>🧠</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.habitsTitle}>COACH SPARK'S LEARNED HABITS</Text>
                <Text style={styles.habitsSub}>
                  Tailored for {learnerProfile?.studentName || 'Alex'} • {learnerProfile?.totalSessionsAnalyzed || 0} sessions analyzed
                </Text>
              </View>
              <TouchableOpacity onPress={handleResetLearnerHabits} style={styles.resetHabitsBtn}>
                <Text style={styles.resetHabitsText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.habitRow}>
              <View style={styles.habitTag}>
                <Text style={styles.habitTagLabel}>Pacing Style</Text>
                <Text style={styles.habitTagValue}>
                  {learnerProfile?.pacingPreference === 'bite-sized' ? '⚡️ Micro-steps (<25w)' : '📖 Standard Pacing'}
                </Text>
              </View>
              <View style={styles.habitTag}>
                <Text style={styles.habitTagLabel}>Visual Preference</Text>
                <Text style={styles.habitTagValue}>
                  {learnerProfile?.visualPreference === 'diagrams-first' ? '📊 Diagrams & SVGs' : '🧩 Step-by-step'}
                </Text>
              </View>
            </View>

            {learnerProfile?.topAnalogies && learnerProfile.topAnalogies.length > 0 ? (
              <View style={styles.habitItemBlock}>
                <Text style={styles.habitSectionLabel}>💡 Top Connecting Metaphors:</Text>
                <Text style={styles.habitDetailText}>
                  {learnerProfile.topAnalogies.join(' • ')}
                </Text>
              </View>
            ) : null}

            {/* Parent Custom Tips */}
            <View style={styles.divider} />
            <View style={styles.tipsHeaderRow}>
              <Text style={styles.habitSectionLabel}>📝 Parent Custom Coaching Tips:</Text>
              {!isAddingTip && (
                <TouchableOpacity onPress={() => setIsAddingTip(true)}>
                  <Text style={styles.addTipText}>+ Add Tip</Text>
                </TouchableOpacity>
              )}
            </View>

            {learnerProfile?.parentTips && learnerProfile.parentTips.length > 0 ? (
              learnerProfile.parentTips.map((tip, idx) => (
                <View key={`tip-${idx}`} style={styles.tipRow}>
                  <Text style={styles.tipText}>"{tip}"</Text>
                  <TouchableOpacity onPress={() => handleRemoveTip(idx)} style={styles.deleteTipBtn}>
                    <Text style={styles.deleteTipText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyTipsText}>
                No custom tips yet. Add notes like "Tired after basketball on Tuesdays; keep questions short" to guide Coach Spark directly.
              </Text>
            )}

            {isAddingTip && (
              <View style={styles.addTipBox}>
                <TextInput
                  style={styles.tipInput}
                  placeholder="e.g. Needs extra encouragement when working on fractions"
                  placeholderTextColor="#94A3B8"
                  value={newParentTip}
                  onChangeText={setNewParentTip}
                  multiline
                />
                <View style={styles.tipBtnRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsAddingTip(false);
                      setNewParentTip('');
                    }}
                    style={styles.tipCancelBtn}
                  >
                    <Text style={styles.tipCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAddTip} style={styles.tipSaveBtn}>
                    <Text style={styles.tipSaveText}>Save Tip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Learning Insights: Mastered vs Sticking Points */}
          <Text style={styles.sectionHeader}>CONCEPTS & FOCUS AREAS</Text>
          <View style={styles.insightsCard}>
            <Text style={styles.subHeading}>✅ Mastered Concepts</Text>
            {dashboardData?.recentInsights?.[0]?.masteredConcepts?.map((c, i) => (
              <Text key={`m-${i}`} style={styles.bulletItem}>
                • {c}
              </Text>
            ))}

            <View style={styles.divider} />

            <Text style={styles.subHeading}>⚠️ Sticking Points (Needs Reinforcement)</Text>
            {dashboardData?.recentInsights?.[0]?.stickingPoints?.map((s, i) => (
              <Text key={`s-${i}`} style={[styles.bulletItem, { color: '#B45309' }]}>
                • {s}
              </Text>
            ))}
          </View>

          {/* Session Transcripts */}
          <Text style={styles.sectionHeader}>RECENT HOMEWORK SESSIONS</Text>
          {sessions.length === 0 ? (
            <Text style={styles.emptyText}>No homework sessions recorded yet.</Text>
          ) : (
            sessions.map((sess) => {
              const subjInfo = CURRICULUM_DATA[sess.subject];
              return (
                <TouchableOpacity
                  key={sess.id}
                  style={styles.sessionItem}
                  onPress={() => setSelectedSession(sess)}
                >
                  <View style={styles.sessionLeft}>
                    <Text style={styles.sessionIcon}>{subjInfo?.icon || '📚'}</Text>
                    <View>
                      <Text style={styles.sessionTitle}>{sess.title}</Text>
                      <Text style={styles.sessionDate}>
                        {new Date(sess.startTime).toLocaleDateString()} • {sess.messages.length} turns
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.viewTranscript}>Inspect ›</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
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
  backText: { color: '#4F46E5', fontWeight: '700', fontSize: 14 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  content: { padding: 16 },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiNumber: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  kpiLabel: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  dinnerCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    marginBottom: 16,
  },
  dinnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dinnerEmoji: { fontSize: 16, marginRight: 6 },
  dinnerTitle: { fontSize: 11, fontWeight: '800', color: '#4338CA', letterSpacing: 0.5 },
  dinnerText: { fontSize: 14, color: '#1E293B', fontWeight: '600', lineHeight: 20 },
  dinnerSub: { fontSize: 11, color: '#64748B', marginTop: 6 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  insightsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  subHeading: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  bulletItem: { fontSize: 12, color: '#334155', lineHeight: 18, marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 },
  sessionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sessionLeft: { flexDirection: 'row', alignItems: 'center' },
  sessionIcon: { fontSize: 20, marginRight: 10 },
  sessionTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  sessionDate: { fontSize: 11, color: '#64748B', marginTop: 2 },
  viewTranscript: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginVertical: 20 },
  habitsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  habitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  habitsEmoji: { fontSize: 20, marginRight: 8 },
  habitsTitle: { fontSize: 12, fontWeight: '800', color: '#1E293B', letterSpacing: 0.5 },
  habitsSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  resetHabitsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  resetHabitsText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  habitRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  habitTag: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  habitTagLabel: { fontSize: 10, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' },
  habitTagValue: { fontSize: 12, color: '#0F172A', fontWeight: '700', marginTop: 2 },
  habitItemBlock: {
    marginTop: 6,
    paddingTop: 6,
  },
  habitSectionLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 },
  habitDetailText: { fontSize: 12, color: '#475569', lineHeight: 18 },
  tipsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addTipText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tipText: { fontSize: 12, color: '#1E293B', flex: 1, fontStyle: 'italic', marginRight: 8 },
  deleteTipBtn: { padding: 4 },
  deleteTipText: { fontSize: 12, color: '#EF4444', fontWeight: '700' },
  emptyTipsText: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic', lineHeight: 16 },
  addTipBox: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tipInput: {
    fontSize: 12,
    color: '#0F172A',
    minHeight: 40,
    textAlignVertical: 'top',
  },
  tipBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  tipCancelBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  tipCancelText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  tipSaveBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tipSaveText: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },
});
