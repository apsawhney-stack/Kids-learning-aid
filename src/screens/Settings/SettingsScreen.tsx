import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LLMProviderId, StudentProfile } from '../../types/provider';
import {
  getStoredProviderConfig,
  saveProviderConfig,
  getStoredStudentProfile,
  saveStudentProfile,
  getParentPin,
  setParentPin,
  getStoredVoiceEnabled,
  saveStoredVoiceEnabled,
  getStoredCoachVoice,
  saveStoredCoachVoice,
  getDeepSeekApiKey,
  saveDeepSeekApiKey
} from '../../services/storage/storageService';
import { callGemini, getBestGeminiModel } from '../../services/ai/geminiProvider';
import { callDeepSeek } from '../../services/ai/deepseekProvider';
import { callOpenAI } from '../../services/ai/openaiProvider';
import { callClaude } from '../../services/ai/claudeProvider';
import { resetProviderCooldown } from '../../services/ai/aiService';
import { speakCoachMessage, stopSpeech, getActiveCoachVoiceName } from '../../services/audio/audioService';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [provider, setProvider] = useState<LLMProviderId>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [deepseekApiKey, setDeepseekApiKey] = useState('');
  const [testingDeepSeek, setTestingDeepSeek] = useState(false);
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [studentName, setStudentName] = useState('Alex');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Basketball & Sports',
    'Minecraft & Roblox',
    'Marvel Superheroes'
  ]);
  const [pin, setPin] = useState('1234');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [coachVoice, setCoachVoice] = useState('Puck');
  const [activeVoiceName, setActiveVoiceName] = useState('Enhanced Natural Voice');
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const interestOptions = [
    'Basketball & Sports',
    'Minecraft & Roblox',
    'Marvel Superheroes',
    'Space & Science Fiction',
    'Animals & Nature',
    'Lego Building'
  ];

  useEffect(() => {
    loadSettings();
    return () => {
      stopSpeech();
    };
  }, []);

  const loadSettings = async () => {
    const config = await getStoredProviderConfig();
    const profile = await getStoredStudentProfile();
    const storedPin = await getParentPin();
    const storedVoice = await getStoredVoiceEnabled();
    const storedCoachVoice = await getStoredCoachVoice();
    const voiceName = await getActiveCoachVoiceName();
    const storedDeepSeek = await getDeepSeekApiKey();

    setProvider(config.provider);
    setApiKey(config.apiKey);
    setDeepseekApiKey(storedDeepSeek);
    setModelName(config.modelName || 'gemini-2.5-flash');
    setStudentName(profile.name);
    setSelectedInterests(profile.interests);
    setPin(storedPin);
    setVoiceEnabled(storedVoice);
    setCoachVoice(storedCoachVoice);
    setActiveVoiceName(voiceName);
  };

  const handleTestVoice = async () => {
    if (isPlayingSample || isLoadingSample) {
      await stopSpeech();
      setIsPlayingSample(false);
      setIsLoadingSample(false);
      return;
    }

    setIsLoadingSample(true);
    setIsPlayingSample(false);
    await saveStoredCoachVoice(coachVoice);
    const refreshedVoiceName = await getActiveCoachVoiceName();
    setActiveVoiceName(refreshedVoiceName);
    const student = studentName.trim() || 'Alex';
    const sampleText =
      coachVoice === 'Puck'
        ? `Hey ${student}! Coach Spark here. Time to bring your A-game! What's our first play?`
        : coachVoice === 'Aoede'
        ? `Hello ${student}, I'm Coach Spark. Take a deep breath, you've got this, and I'm right here with you.`
        : coachVoice === 'Fenrir'
        ? `All right ${student}, Coach Spark in the building! Let's conquer this challenge with zero fear!`
        : coachVoice === 'Kore'
        ? `Hi ${student}, Coach Spark here. Let's take this problem one calm, easy step at a time.`
        : `Coach Spark is ready to assist you with your homework.`;

    await speakCoachMessage(sampleText, {
      onStart: () => {
        setIsLoadingSample(false);
        setIsPlayingSample(true);
      },
      onDone: () => {
        setIsLoadingSample(false);
        setIsPlayingSample(false);
      },
      onError: () => {
        setIsLoadingSample(false);
        setIsPlayingSample(false);
      }
    });
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      if (selectedInterests.length > 1) {
        setSelectedInterests(selectedInterests.filter((i) => i !== interest));
      }
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Missing API Key', 'Please enter an API key to test.');
      return;
    }

    setTesting(true);
    try {
      if (provider === 'gemini') {
        const targetModel = modelName.trim() || 'gemini-2.5-flash';
        await callGemini(apiKey.trim(), targetModel, {
          systemPrompt: 'Respond with OK',
          messages: [{ role: 'user', content: 'Ping' }]
        });
        resetProviderCooldown('gemini');
        Alert.alert('Success! 🎉', `Connected to Google Gemini!\n(Model: ${targetModel})`);
      } else if (provider === 'deepseek') {
        const targetModel = modelName.trim() || 'deepseek-chat';
        await callDeepSeek(apiKey.trim(), targetModel, {
          systemPrompt: 'Respond with OK',
          messages: [{ role: 'user', content: 'Ping' }]
        });
        resetProviderCooldown('deepseek');
        Alert.alert('Success! 🎉', `Connected to DeepSeek API!\n(Model: ${targetModel})`);
      } else if (provider === 'openai') {
        const targetModel = modelName.trim() || 'gpt-4o-mini';
        await callOpenAI(apiKey.trim(), targetModel, {
          systemPrompt: 'Respond with OK',
          messages: [{ role: 'user', content: 'Ping' }]
        });
        resetProviderCooldown('openai');
        Alert.alert('Success! 🎉', `Successfully connected to OpenAI API!\n(Model: ${targetModel})`);
      } else if (provider === 'claude') {
        const targetModel = modelName.trim() || 'claude-3-5-sonnet-20241022';
        await callClaude(apiKey.trim(), targetModel, {
          systemPrompt: 'Respond with OK',
          messages: [{ role: 'user', content: 'Ping' }]
        });
        resetProviderCooldown('claude');
        Alert.alert('Success! 🎉', `Successfully connected to Claude API!\n(Model: ${targetModel})`);
      }
    } catch (err: any) {
      Alert.alert('Connection Failed', err.message || 'Could not verify API key.');
    } finally {
      setTesting(false);
    }
  };

  const handleTestDeepSeekBackup = async () => {
    if (!deepseekApiKey.trim()) {
      Alert.alert('Missing DeepSeek Key', 'Please enter your DeepSeek API key to test.');
      return;
    }

    setTestingDeepSeek(true);
    try {
      await callDeepSeek(deepseekApiKey.trim(), 'deepseek-chat', {
        systemPrompt: 'Respond with OK',
        messages: [{ role: 'user', content: 'Ping' }]
      });
      resetProviderCooldown('deepseek');
      Alert.alert(
        'DeepSeek Verified! 🎉',
        'Your DeepSeek key is active and ready to automatically back up Coach Spark if Gemini runs out of quota.'
      );
    } catch (err: any) {
      Alert.alert('DeepSeek Connection Failed', err.message || 'Could not verify DeepSeek API key.');
    } finally {
      setTestingDeepSeek(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const targetModel =
        modelName.trim() ||
        (provider === 'gemini'
          ? 'gemini-2.5-flash'
          : provider === 'deepseek'
          ? 'deepseek-chat'
          : provider === 'openai'
          ? 'gpt-4o-mini'
          : 'claude-3-5-sonnet-20241022');

      await saveProviderConfig(provider, apiKey.trim(), targetModel);
      await saveDeepSeekApiKey(deepseekApiKey.trim());
      resetProviderCooldown(provider);
      resetProviderCooldown('deepseek');
      await saveStudentProfile({
        name: studentName.trim() || 'Alex',
        grade: '6th grade',
        interests: selectedInterests
      });
      if (pin.length === 4) {
        await setParentPin(pin);
      }
      await saveStoredVoiceEnabled(voiceEnabled);
      await saveStoredCoachVoice(coachVoice);
      stopSpeech();
      Alert.alert('Settings Saved', 'Your preferences and API configuration have been updated.');
      onBack();
    } catch (err: any) {
      Alert.alert('Save Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 48) }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* AI Provider Section */}
        <Text style={styles.sectionHeader}>AI PROVIDER SELECTION</Text>
        <View style={styles.providerRow}>
          {[
            { id: 'gemini', title: 'Google Gemini', sub: 'Recommended (Fast Vision)' },
            { id: 'deepseek', title: 'DeepSeek', sub: 'Socratic & Low Cost' },
            { id: 'openai', title: 'OpenAI (GPT-4o)', sub: 'Fast & Reliable' },
            { id: 'claude', title: 'Claude 3.5', sub: 'Nuanced Reasoning' }
          ].map((item) => {
            const isSelected = provider === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.providerCard, isSelected && styles.selectedProviderCard]}
                onPress={() => {
                  const next = item.id as LLMProviderId;
                  setProvider(next);
                  if (next === 'gemini') setModelName('gemini-2.5-flash');
                  else if (next === 'deepseek') setModelName('deepseek-chat');
                  else if (next === 'openai') setModelName('gpt-4o-mini');
                  else if (next === 'claude') setModelName('claude-3-5-sonnet-20241022');
                }}
              >
                <Text style={[styles.providerTitle, isSelected && styles.selectedProviderTitle]}>
                  {item.title}
                </Text>
                <Text style={styles.providerSub}>{item.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* API Key */}
        <Text style={styles.sectionHeader}>API KEY CONFIGURATION</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={`Enter ${provider.toUpperCase()} API Key (Optional)`}
            placeholderTextColor="#94A3B8"
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestKey}
            disabled={testing || !apiKey}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Text style={styles.testBtnText}>Test Key</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.helperNote}>
          💡 Keys stay private on your iPhone. Leave blank to run in offline demo coaching mode.
        </Text>

        {/* Automatic Backup Provider (DeepSeek) */}
        <Text style={styles.sectionHeader}>AUTOMATIC FAILOVER BACKUP (DEEPSEEK)</Text>
        <Text style={styles.backupSubtext}>
          When your primary provider (like Gemini) runs out of quota or encounters high traffic, Coach Spark will automatically fail over to this DeepSeek key so your son's homework session is never interrupted.
        </Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter DeepSeek Backup API Key (sk-...)"
            placeholderTextColor="#94A3B8"
            value={deepseekApiKey}
            onChangeText={setDeepseekApiKey}
            secureTextEntry
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestDeepSeekBackup}
            disabled={testingDeepSeek || !deepseekApiKey}
          >
            {testingDeepSeek ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Text style={styles.testBtnText}>Test Backup</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.helperNote}>
          💡 You can save your key here, or define EXPO_PUBLIC_DEEPSEEK_API_KEY in your .env file.
        </Text>

        {/* Model ID Selection */}
        <Text style={styles.sectionHeader}>MODEL NAME / ID</Text>
        <View style={styles.fieldBox}>
          <TextInput
            style={styles.input}
            placeholder={
              provider === 'gemini'
                ? 'gemini-2.5-flash'
                : provider === 'deepseek'
                ? 'deepseek-chat'
                : provider === 'openai'
                ? 'gpt-4o-mini'
                : 'claude-3-5-sonnet-20241022'
            }
            placeholderTextColor="#94A3B8"
            value={modelName}
            onChangeText={setModelName}
            autoCapitalize="none"
          />
        </View>

        {provider === 'gemini' ? (
          <View style={styles.modelPresetsRow}>
            <TouchableOpacity
              style={[
                styles.presetChip,
                modelName === 'gemini-2.5-flash' && styles.selectedPresetChip
              ]}
              onPress={() => setModelName('gemini-2.5-flash')}
            >
              <Text
                style={[
                  styles.presetText,
                  modelName === 'gemini-2.5-flash' && styles.selectedPresetText
                ]}
              >
                ⚡ 2.5 Flash (Ultra Fast)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetChip,
                modelName === 'gemini-2.0-flash' && styles.selectedPresetChip
              ]}
              onPress={() => setModelName('gemini-2.0-flash')}
            >
              <Text
                style={[
                  styles.presetText,
                  modelName === 'gemini-2.0-flash' && styles.selectedPresetText
                ]}
              >
                2.0 Flash
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetChip,
                modelName === 'gemini-3.7-flash' && styles.selectedPresetChip
              ]}
              onPress={() => setModelName('gemini-3.7-flash')}
            >
              <Text
                style={[
                  styles.presetText,
                  modelName === 'gemini-3.7-flash' && styles.selectedPresetText
                ]}
              >
                3.7 Flash
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetChip,
                modelName === 'gemini-1.5-flash-latest' && styles.selectedPresetChip
              ]}
              onPress={() => setModelName('gemini-1.5-flash-latest')}
            >
              <Text
                style={[
                  styles.presetText,
                  modelName === 'gemini-1.5-flash-latest' && styles.selectedPresetText
                ]}
              >
                1.5 Flash Latest
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {provider === 'deepseek' ? (
          <View style={styles.modelPresetsRow}>
            <TouchableOpacity
              style={[
                styles.presetChip,
                modelName === 'deepseek-chat' && styles.selectedPresetChip
              ]}
              onPress={() => setModelName('deepseek-chat')}
            >
              <Text
                style={[
                  styles.presetText,
                  modelName === 'deepseek-chat' && styles.selectedPresetText
                ]}
              >
                ⚡ DeepSeek-V3 (Chat)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetChip,
                modelName === 'deepseek-reasoner' && styles.selectedPresetChip
              ]}
              onPress={() => setModelName('deepseek-reasoner')}
            >
              <Text
                style={[
                  styles.presetText,
                  modelName === 'deepseek-reasoner' && styles.selectedPresetText
                ]}
              >
                🧠 DeepSeek-R1 (Reasoner)
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Student Personalization */}
        <Text style={styles.sectionHeader}>STUDENT PROFILE & INTERESTS</Text>
        <View style={styles.fieldBox}>
          <Text style={styles.fieldLabel}>Son's Name</Text>
          <TextInput
            style={styles.input}
            value={studentName}
            onChangeText={setStudentName}
            placeholder="Alex"
          />
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 12, marginBottom: 6 }]}>
          Favorite Themes for Real-World Analogies:
        </Text>
        <View style={styles.interestsGrid}>
          {interestOptions.map((opt) => {
            const checked = selectedInterests.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.interestChip, checked && styles.selectedInterestChip]}
                onPress={() => toggleInterest(opt)}
              >
                <Text style={[styles.interestText, checked && styles.selectedInterestText]}>
                  {checked ? '✓ ' : ''}
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Coach Voice & Audio */}
        <Text style={styles.sectionHeader}>COACH VOICE & CONVERSATIONAL AUDIO</Text>
        <View style={styles.voiceSectionBox}>
          <View style={styles.voiceRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.voiceTitle}>Read Coach Responses Aloud</Text>
              <Text style={styles.voiceSub}>
                Conversational tone powered by Gemini 2.0 Flash Audio
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleBtn, voiceEnabled && styles.toggleBtnActive]}
              onPress={() => setVoiceEnabled(!voiceEnabled)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleBtnText, voiceEnabled && styles.toggleBtnTextActive]}>
                {voiceEnabled ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 8, marginBottom: 8 }]}>
            Coach Spark Persona & Tone:
          </Text>
          <View style={styles.voiceGrid}>
            {[
              { id: 'Puck', icon: '⚡', label: 'Puck (Recommended)', desc: 'Energetic, upbeat & playful coach (Sports / Gaming vibe)' },
              { id: 'Aoede', icon: '🌟', label: 'Aoede', desc: 'Warm, encouraging & empathetic mentor' },
              { id: 'Fenrir', icon: '🔥', label: 'Fenrir', desc: 'Confident, enthusiastic & bold coach' },
              { id: 'Kore', icon: '🌱', label: 'Kore', desc: 'Calm, patient & supportive guide' },
              { id: 'device', icon: '📱', label: 'Device TTS (Offline)', desc: 'Local iOS screen-reader voice' }
            ].map((item) => {
              const isSelected = coachVoice === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.voiceCard, isSelected && styles.selectedVoiceCard]}
                  onPress={async () => {
                    await stopSpeech();
                    setIsPlayingSample(false);
                    setIsLoadingSample(false);
                    setCoachVoice(item.id);
                    await saveStoredCoachVoice(item.id);
                    const updatedName = await getActiveCoachVoiceName();
                    setActiveVoiceName(updatedName);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.voiceCardHeader}>
                    <Text style={[styles.voiceCardTitle, isSelected && styles.selectedVoiceCardTitle]}>
                      {item.icon} {item.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.activePill}>
                        <Text style={styles.activePillText}>Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.voiceCardDesc, isSelected && styles.selectedVoiceCardDesc]}>
                    {item.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeVoiceName ? (
            <View style={styles.voiceDetectedBadge}>
              <Text style={styles.voiceDetectedIcon}>🎙️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.voiceDetectedLabel}>Detected Voice Engine</Text>
                <Text style={styles.voiceDetectedName}>{activeVoiceName}</Text>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.testVoiceBtn,
              isPlayingSample && styles.testVoiceBtnPlaying,
              isLoadingSample && styles.testVoiceBtnLoading
            ]}
            onPress={handleTestVoice}
            activeOpacity={0.7}
          >
            {isLoadingSample ? (
              <View style={styles.loadingSampleRow}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={styles.testVoiceText}>Preparing Coach Voice...</Text>
              </View>
            ) : (
              <Text style={[styles.testVoiceText, isPlayingSample && styles.testVoiceTextPlaying]}>
                {isPlayingSample ? '⏹️ Stop Voice Sample' : '🔊 Hear Coach Spark Talk'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Parent PIN */}
        <Text style={styles.sectionHeader}>PARENT DASHBOARD PIN</Text>
        <View style={styles.fieldBox}>
          <Text style={styles.fieldLabel}>4-Digit Passcode</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
      </ScrollView>

      {/* Floating Bottom Save Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
        <TouchableOpacity
          style={styles.largeSaveBtn}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.largeSaveBtnText}>
            {saving ? 'Saving Preferences...' : '💾 Save Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  backText: { color: '#64748B', fontSize: 15 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  saveBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  content: { padding: 16 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  providerRow: { gap: 8, marginBottom: 12 },
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  selectedProviderCard: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  providerTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  selectedProviderTitle: { color: '#4F46E5' },
  providerSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  testBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  testBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 13 },
  helperNote: { fontSize: 11, color: '#64748B', marginTop: 6, fontStyle: 'italic' },
  backupSubtext: { fontSize: 12, color: '#64748B', lineHeight: 17, marginBottom: 8 },
  fieldBox: { marginTop: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  selectedInterestChip: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  interestText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  selectedInterestText: { color: '#FFFFFF' },
  modelPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedPresetChip: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  selectedPresetText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  largeSaveBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeSaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  voiceSectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  voiceSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  toggleBtnActive: {
    backgroundColor: '#10B981',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  testVoiceBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  testVoiceBtnPlaying: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  testVoiceBtnLoading: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  loadingSampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testVoiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  testVoiceTextPlaying: {
    color: '#DC2626',
  },
  voiceGrid: {
    gap: 8,
  },
  voiceCard: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  selectedVoiceCard: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  voiceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  voiceCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  selectedVoiceCardTitle: {
    color: '#4F46E5',
  },
  voiceCardDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  selectedVoiceCardDesc: {
    color: '#4338CA',
  },
  activePill: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  voiceDetectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  voiceDetectedIcon: {
    fontSize: 16,
  },
  voiceDetectedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  voiceDetectedName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
});
