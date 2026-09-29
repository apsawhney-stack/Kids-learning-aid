import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Subject, ChatMessage, HomeworkSession } from '../../types/chat';
import { GamificationState } from '../../types/gamification';
import { CURRICULUM_DATA } from '../../config/curriculumTopics';
import { SubjectSelector } from '../../components/SubjectSelector';
import { ProblemBanner } from '../../components/ProblemBanner';
import { ChatBubble } from '../../components/ChatBubble';
import { QuickActionChips, ActionChipType } from '../../components/QuickActionChips';
import { GamificationBar } from '../../components/gamification/GamificationBar';
import { ConfettiOverlay } from '../../components/gamification/ConfettiOverlay';
import { BadgeUnlockModal } from '../../components/gamification/BadgeUnlockModal';
import { HomeworkIntakeModal } from './HomeworkIntakeModal';
import { ParentPinModal } from '../Parent/ParentPinModal';
import { ParentDashboardScreen } from '../Parent/ParentDashboardScreen';
import { SettingsScreen } from '../Settings/SettingsScreen';
import { sendCoachMessage } from '../../services/ai/aiService';
import { buildActionPrompt } from '../../services/ai/promptTemplates';
import { awardXP } from '../../services/gamification/gamificationService';
import { summarizeSessionForParent } from '../../services/analytics/sessionSummarizer';
import { synthesizeLearnerHabits } from '../../services/ai/habitSynthesizer';
import {
  getGamificationState,
  saveSession,
  getStoredStudentProfile,
  getActiveSessionState,
  saveActiveSessionState,
  clearActiveSessionState
} from '../../services/storage/storageService';
import {
  speakCoachMessage,
  stopSpeech,
  startAudioRecording,
  stopAudioRecording,
  transcribeAudioWithGemini,
  getVoiceOutputEnabled,
  setVoiceOutputEnabled,
  prewarmCoachAudio
} from '../../services/audio/audioService';

export const HomeworkCoachScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  // Navigation / Modal States
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showParentDashboard, setShowParentDashboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Gamification States
  const [gamification, setGamification] = useState<GamificationState>({
    xp: 120,
    level: 2,
    currentStreak: 3,
    lastActiveDate: new Date().toISOString().split('T')[0],
    badges: []
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState<any>(null);

  // Active Session State
  const [sessionId, setSessionId] = useState<string>(() => `session_math_${Date.now()}`);
  const [currentSubject, setCurrentSubject] = useState<Subject>('math');
  const [problemTitle, setProblemTitle] = useState('Finding Ratios & Simplifying');
  const [problemDesc, setProblemDesc] = useState('Find the ratio of boys to girls if there are 12 boys and 16 girls.');
  const [problemImage, setProblemImage] = useState<string | undefined>();
  const [problemImageBase64, setProblemImageBase64] = useState<string | undefined>();

  const [hintLevel, setHintLevel] = useState(1);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      role: 'assistant',
      content: "Hey there! Ready to tackle some homework? Snap a picture of your worksheet or type your question below. Let's do this! 🎯",
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isCoachThinking, setIsCoachThinking] = useState(false);

  // Audio & Voice States
  const [voiceAutoPlay, setVoiceAutoPlay] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [loadingAudioMessageId, setLoadingAudioMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadInitialState();

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      stopSpeech();
      stopAudioRecording();
    };
  }, []);

  const loadInitialState = async () => {
    const gState = await getGamificationState();
    setGamification(gState);
    const voiceSetting = await getVoiceOutputEnabled();
    setVoiceAutoPlay(voiceSetting);

    // Restore active session chat history so student work is always preserved
    const activeSession = await getActiveSessionState();
    if (activeSession && activeSession.messages && activeSession.messages.length > 0) {
      setSessionId(activeSession.id);
      setCurrentSubject(activeSession.subject || 'math');
      setProblemTitle(activeSession.title || 'Homework Session');
      setProblemDesc(activeSession.problemDescription || '');
      setProblemImage(activeSession.problemImageUri);
      setMessages(activeSession.messages);
      setHintLevel(activeSession.hintCount || 1);
      setTimeout(() => scrollToBottom(), 150);
    }
  };

  const handleToggleVoiceAutoPlay = async () => {
    const nextVal = !voiceAutoPlay;
    setVoiceAutoPlay(nextVal);
    await setVoiceOutputEnabled(nextVal);
    if (!nextVal) {
      stopSpeech();
      setSpeakingMessageId(null);
      setLoadingAudioMessageId(null);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleToggleSpeakMessage = (msg: ChatMessage) => {
    // If this message is actively playing audio, stop it
    if (speakingMessageId === msg.id) {
      stopSpeech();
      setSpeakingMessageId(null);
      setLoadingAudioMessageId(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    // If this message is currently preparing audio, cancel it
    if (loadingAudioMessageId === msg.id) {
      stopSpeech();
      setLoadingAudioMessageId(null);
      setSpeakingMessageId(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    // Start playback: indicate loading until audio actually begins
    stopSpeech();
    setSpeakingMessageId(null);
    setLoadingAudioMessageId(msg.id);

    speakCoachMessage(msg.content, {
      onStart: () => {
        setLoadingAudioMessageId(null);
        setSpeakingMessageId(msg.id);
      },
      onDone: () => {
        setSpeakingMessageId(null);
        setLoadingAudioMessageId(null);
      },
      onError: (err) => {
        console.warn('Coach speech playback error:', err);
        setSpeakingMessageId(null);
        setLoadingAudioMessageId(null);
      }
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleStartVoiceInput = async () => {
    if (isCoachThinking || isTranscribing) return;

    // Stop coach audio before student speaks
    stopSpeech();
    setSpeakingMessageId(null);
    setLoadingAudioMessageId(null);

    const started = await startAudioRecording();
    if (!started) {
      Alert.alert(
        'Microphone Permission Required',
        'MindStep needs microphone access so you can speak to Coach Spark. Please enable microphone permissions in your iOS Settings.'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(true);
    setRecordingDuration(0);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };

  const handleFinishVoiceInput = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const uri = await stopAudioRecording();
      if (uri) {
        const transcript = await transcribeAudioWithGemini(uri);
        if (transcript && transcript.trim()) {
          setInputText(transcript.trim());
        }
      }
    } catch (err: any) {
      console.warn('Voice recording finish error:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCancelVoiceInput = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await stopAudioRecording();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content && !problemImage) return;

    setInputText('');

    const userMessage: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    scrollToBottom();
    setIsCoachThinking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Award participation XP (+20 XP)
      const xpRes = await awardXP(20, 'hint', currentSubject);
      setGamification((prev) => ({
        ...prev,
        xp: xpRes.newXP,
        level: xpRes.newLevel,
        badges: xpRes.newBadges.length ? [...prev.badges, ...xpRes.newBadges] : prev.badges
      }));
      if (xpRes.newBadges.length) {
        setUnlockedBadge(xpRes.newBadges[0]);
      }

      // Check if user's input solved or concluded the problem
      const isSolving = content.toLowerCase().includes('3:4') ||
        content.toLowerCase().includes('3 to 4') ||
        content.toLowerCase().includes('solved') ||
        content.toLowerCase().includes('got it');

      if (isSolving) {
        setShowConfetti(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const solveXP = await awardXP(100, 'solve', currentSubject);
        setGamification((prev) => ({
          ...prev,
          xp: solveXP.newXP,
          level: solveXP.newLevel,
          badges: solveXP.newBadges.length ? [...prev.badges, ...solveXP.newBadges] : prev.badges
        }));
        if (solveXP.newBadges.length) {
          setUnlockedBadge(solveXP.newBadges[0]);
        }
      }

      // Dispatch to AI Service
      const result = await sendCoachMessage({
        subject: currentSubject,
        messages: newMessages.map((m) => ({ role: m.role as any, content: m.content })),
        hintLevel,
        imageBase64: problemImageBase64
      });

      const assistantMessage: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: result.text,
        visual: result.visual,
        timestamp: Date.now()
      };

      const updatedWithCoach = [...newMessages, assistantMessage];
      setMessages(updatedWithCoach);
      scrollToBottom();

      // Auto-speak Coach response if voice output is enabled
      if (voiceAutoPlay && result.text) {
        setLoadingAudioMessageId(assistantMessage.id);
        setSpeakingMessageId(null);
        speakCoachMessage(result.text, {
          onStart: () => {
            setLoadingAudioMessageId(null);
            setSpeakingMessageId(assistantMessage.id);
          },
          onDone: () => {
            setSpeakingMessageId(null);
            setLoadingAudioMessageId(null);
          },
          onError: () => {
            setSpeakingMessageId(null);
            setLoadingAudioMessageId(null);
          }
        });
      } else if (result.text) {
        // Pre-warm speech audio in background so tapping "Listen" is instantaneous
        prewarmCoachAudio(result.text);
      }

      // Auto-save session
      const sessionData: HomeworkSession = {
        id: sessionId,
        subject: currentSubject,
        title: problemTitle,
        problemDescription: problemDesc,
        problemImageUri: problemImage,
        messages: updatedWithCoach,
        startTime: Date.now() - 600000,
        endTime: Date.now(),
        hintCount: hintLevel,
        isCompleted: isSolving,
        xpEarned: 120
      };
      await saveSession(sessionData);
      await saveActiveSessionState(sessionData);

      // If problem completed or reached meaningful depth, synthesize habits & generate parent digest in background
      if (isSolving) {
        summarizeSessionForParent(sessionData).catch(console.warn);
        synthesizeLearnerHabits(sessionData).catch(console.warn);
      } else if (updatedWithCoach.length >= 6 && updatedWithCoach.length % 4 === 0) {
        // Rolling update every 4 turns
        synthesizeLearnerHabits(sessionData).catch(console.warn);
      }
    } catch (err: any) {
      Alert.alert('Coach Error', err.message || 'Could not connect to coach.');
    } finally {
      setIsCoachThinking(false);
    }
  };

  const handleQuickAction = (action: ActionChipType) => {
    if (isCoachThinking) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (action === 'breakdown' || action === 'stuck') {
      setHintLevel((prev) => Math.min(prev + 1, 4));
    }

    const lastMsg = messages[messages.length - 1]?.content;
    const prompt = buildActionPrompt(action, lastMsg);
    handleSendMessage(prompt);
  };

  const handleStartNewQuest = (data: {
    subject: Subject;
    problemTitle: string;
    description: string;
    imageUri?: string;
    imageBase64?: string;
  }) => {
    const newSessionId = `session_${data.subject}_${Date.now()}`;
    setSessionId(newSessionId);
    setCurrentSubject(data.subject);
    setProblemTitle(data.problemTitle);
    setProblemDesc(data.description);
    setProblemImage(data.imageUri);
    setProblemImageBase64(data.imageBase64);
    setHintLevel(1);

    const initialCoachGreeting: ChatMessage = {
      id: `a_${Date.now()}`,
      role: 'assistant',
      content: `Awesome, let's take on this ${CURRICULUM_DATA[data.subject].title} problem together! 🎯 What is the problem asking us to figure out?`,
      timestamp: Date.now()
    };
    setMessages([initialCoachGreeting]);

    saveActiveSessionState({
      id: newSessionId,
      subject: data.subject,
      title: data.problemTitle,
      problemDescription: data.description,
      problemImageUri: data.imageUri,
      messages: [initialCoachGreeting],
      startTime: Date.now(),
      endTime: Date.now(),
      hintCount: 1,
      isCompleted: false,
      xpEarned: 0
    });

    if (voiceAutoPlay) {
      setLoadingAudioMessageId(initialCoachGreeting.id);
      setSpeakingMessageId(null);
      speakCoachMessage(initialCoachGreeting.content, {
        onStart: () => {
          setLoadingAudioMessageId(null);
          setSpeakingMessageId(initialCoachGreeting.id);
        },
        onDone: () => {
          setSpeakingMessageId(null);
          setLoadingAudioMessageId(null);
        },
        onError: () => {
          setSpeakingMessageId(null);
          setLoadingAudioMessageId(null);
        }
      });
    }
  };

  // If Parent Dashboard active
  if (showParentDashboard) {
    return (
      <ParentDashboardScreen
        onBack={() => setShowParentDashboard(false)}
        onResumeSession={(sess) => {
          setSessionId(sess.id);
          setCurrentSubject(sess.subject);
          setProblemTitle(sess.title);
          setProblemDesc(sess.problemDescription || '');
          setProblemImage(sess.problemImageUri);
          setMessages(sess.messages);
          setHintLevel(sess.hintCount || 1);
          saveActiveSessionState(sess);
          setShowParentDashboard(false);
        }}
      />
    );
  }

  // If Settings active
  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} />;
  }

  return (
    <View style={styles.container}>
      {/* Confetti Overlay for celebrations */}
      <ConfettiOverlay active={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Badge Unlock Celebration */}
      <BadgeUnlockModal
        badge={unlockedBadge}
        visible={!!unlockedBadge}
        onClose={() => setUnlockedBadge(null)}
      />

      {/* App Header */}
      <View style={[styles.navHeader, { paddingTop: Math.max(insets.top + 6, 50) }]}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => {
            stopSpeech();
            setSpeakingMessageId(null);
            setLoadingAudioMessageId(null);
            setShowSettings(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.headerIconText}>⚙️</Text>
        </TouchableOpacity>

        <Text style={styles.headerAppTitle}>MindStep</Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.headerVoiceBtn, voiceAutoPlay && styles.headerVoiceBtnActive]}
            onPress={handleToggleVoiceAutoPlay}
            activeOpacity={0.7}
            accessibilityLabel={voiceAutoPlay ? 'Mute coach voice' : 'Enable coach voice'}
          >
            <Text style={styles.headerVoiceIcon}>{voiceAutoPlay ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              stopSpeech();
              setSpeakingMessageId(null);
              setLoadingAudioMessageId(null);
              setShowPinModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.headerIconText}>🔒 Parent</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gamification Bar */}
      <GamificationBar
        state={gamification}
        onPressBadges={() => {
          Alert.alert(
            `Quests & Badges (${gamification.badges.length} Unlocked)`,
            gamification.badges.map((b) => `🏆 ${b.title}: ${b.description}`).join('\n\n') ||
              'Keep solving problems with Coach Spark to unlock awesome badges!'
          );
        }}
      />

      {/* Subject Selector Bar */}
      <SubjectSelector
        selectedSubject={currentSubject}
        onSelectSubject={(s) => {
          setCurrentSubject(s);
          setProblemTitle(`${CURRICULUM_DATA[s].title} Problem`);
          setProblemDesc(`Exploring ${CURRICULUM_DATA[s].title} topics.`);
        }}
      />

      {/* Pinned Homework Banner */}
      <ProblemBanner
        title={problemTitle}
        description={problemDesc}
        imageUri={problemImage}
        onPressNewProblem={() => setShowIntakeModal(true)}
      />

      {/* Chat Messages */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              isSpeaking={speakingMessageId === item.id}
              isLoadingAudio={loadingAudioMessageId === item.id}
              onToggleSpeak={item.role === 'assistant' ? handleToggleSpeakMessage : undefined}
            />
          )}
          contentContainerStyle={[styles.messageList, { paddingBottom: 32 }]}
        />

        {/* Coach Thinking Spinner */}
        {isCoachThinking ? (
          <View style={styles.thinkingRow}>
            <ActivityIndicator size="small" color="#4F46E5" />
            <Text style={styles.thinkingText}>Coach Spark is strategizing...</Text>
          </View>
        ) : null}

        {/* Quick Action Scaffolding Chips */}
        <QuickActionChips
          onSelectAction={handleQuickAction}
          disabled={isCoachThinking || isRecording}
        />

        {/* Input Bar: Switches between text/mic mode and active recording mode */}
        {isRecording ? (
          <View style={[styles.inputBar, styles.recordingInputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.recordingLeft}>
              <View style={styles.recordingRedDot} />
              <Text style={styles.recordingTimer}>
                {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
              </Text>
              <Text style={styles.recordingLabel}>Listening to you...</Text>
            </View>

            <View style={styles.recordingControls}>
              <TouchableOpacity
                style={styles.cancelRecordBtn}
                onPress={handleCancelVoiceInput}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelRecordText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.finishRecordBtn}
                onPress={handleFinishVoiceInput}
                activeOpacity={0.7}
              >
                <Text style={styles.finishRecordText}>✓ Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowIntakeModal(true)}
              activeOpacity={0.7}
              disabled={isCoachThinking || isTranscribing}
              accessibilityLabel="Upload photo"
            >
              <Text style={styles.actionBtnIcon}>📸</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.micBtn]}
              onPress={handleStartVoiceInput}
              activeOpacity={0.7}
              disabled={isCoachThinking || isTranscribing}
              accessibilityLabel="Speak your thought or question"
            >
              <Text style={styles.actionBtnIcon}>🎙️</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder={isTranscribing ? 'Listening to your voice...' : 'Type your thought or step...'}
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSendMessage()}
              returnKeyType="send"
              editable={!isTranscribing}
            />

            {/* Collapse Keyboard Button when virtual keyboard is active */}
            {isKeyboardVisible ? (
              <TouchableOpacity
                style={styles.keyboardDismissBtn}
                onPress={() => Keyboard.dismiss()}
                activeOpacity={0.7}
                accessibilityLabel="Collapse keyboard"
              >
                <Text style={styles.keyboardDismissIcon}>⌄</Text>
              </TouchableOpacity>
            ) : null}

            {isTranscribing ? (
              <View style={styles.transcribingSpinner}>
                <ActivityIndicator size="small" color="#4F46E5" />
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() && styles.disabledSendBtn]}
                onPress={() => handleSendMessage()}
                disabled={!inputText.trim() || isCoachThinking}
                activeOpacity={0.7}
              >
                <Text style={styles.sendIcon}>➔</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Modals */}
      <HomeworkIntakeModal
        visible={showIntakeModal}
        initialSubject={currentSubject}
        onClose={() => setShowIntakeModal(false)}
        onSubmit={handleStartNewQuest}
      />

      <ParentPinModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={() => {
          setShowPinModal(false);
          setShowParentDashboard(true);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerIconBtn: {
    padding: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerIconText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  headerAppTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerVoiceBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerVoiceBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  headerVoiceIcon: {
    fontSize: 14,
  },
  chatArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  messageList: {
    paddingVertical: 10,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  thinkingText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  recordingInputBar: {
    backgroundColor: '#FEF2F2',
    borderTopColor: '#FECACA',
    justifyContent: 'space-between',
  },
  recordingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  recordingRedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  recordingTimer: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B91C1C',
  },
  recordingLabel: {
    fontSize: 13,
    color: '#7F1D1D',
    fontWeight: '500',
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelRecordBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  cancelRecordText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  finishRecordBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#10B981',
  },
  finishRecordText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtn: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  actionBtnIcon: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transcribingSpinner: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendBtn: {
    backgroundColor: '#CBD5E1',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  keyboardDismissBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  keyboardDismissIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#475569',
    marginTop: -3,
  },
});
