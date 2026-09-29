import { describe, test, expect, jest } from '@jest/globals';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('expo-audio', () => ({
  requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, status: 'granted' })),
  getRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, status: 'granted' })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    playing: false
  })),
  RecordingPresets: { HIGH_QUALITY: {} },
  AudioModule: {
    AudioRecorder: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn(() => Promise.resolve()),
      record: jest.fn(),
      stop: jest.fn(() => Promise.resolve()),
      uri: 'file:///test-audio.m4a',
    })),
  }
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'mock-cache-directory' },
  File: jest.fn().mockImplementation(() => ({
    exists: true,
    uri: 'file:///mock-cache-directory/coach_speech.wav',
    create: jest.fn(),
    write: jest.fn(),
    base64: jest.fn(() => Promise.resolve('mockBase64AudioData')),
  })),
}));

jest.mock('../src/services/storage/storageService', () => ({
  getStoredProviderConfig: jest.fn(() =>
    Promise.resolve({
      provider: 'gemini',
      apiKey: 'mock-key',
      modelName: 'gemini-3.7-flash'
    })
  ),
  getStoredVoiceEnabled: jest.fn(() => Promise.resolve(true)),
  saveStoredVoiceEnabled: jest.fn(() => Promise.resolve(undefined)),
  getStoredCoachVoice: jest.fn(() => Promise.resolve('Puck')),
  saveStoredCoachVoice: jest.fn(() => Promise.resolve(undefined)),
}));

import {
  cleanTextForSpeech,
  addWavHeaderToPcmBase64,
  getActiveCoachVoiceName,
  PERSONA_CONFIGS
} from '../src/services/audio/audioService';

describe('Audio Service - Text to Speech Sanitizer', () => {
  test('strips dynamic visual tags completely so speech is not cluttered', () => {
    const raw = '<visual type="tape-diagram" data="{\'ratioA\': 3}" /> Great job seeing the ratio!';
    const cleaned = cleanTextForSpeech(raw);
    expect(cleaned).toBe('Great job seeing the ratio!');
    expect(cleaned).not.toContain('visual');
  });

  test('converts fractions into natural spoken words', () => {
    const raw = 'We can simplify the ratio to $\\frac{3}{4}$.';
    const cleaned = cleanTextForSpeech(raw);
    expect(cleaned).toBe('We can simplify the ratio to 3 over 4.');
  });

  test('converts math operators (times, divided by, approximately)', () => {
    const raw = 'Notice that $12 \\div 4 = 3$ and $4 \\times 4 = 16$. Also $\\approx 3.14$.';
    const cleaned = cleanTextForSpeech(raw);
    expect(cleaned).toContain('12 divided by 4 = 3');
    expect(cleaned).toContain('4 times 4 = 16');
    expect(cleaned).toContain('approximately 3.14');
  });

  test('converts colon ratios into natural comparison words', () => {
    const raw = 'The ratio of boys to girls is 12:16.';
    const cleaned = cleanTextForSpeech(raw);
    expect(cleaned).toBe('The ratio of boys to girls is 12 to 16.');
  });

  test('strips markdown bold, italics, and headers', () => {
    const raw = '### **Step 1:** Look at the *first* number!';
    const cleaned = cleanTextForSpeech(raw);
    expect(cleaned).toBe('Step 1: Look at the first number!');
  });

  test('strips emojis and pictographs so screen reader does not read emoji names aloud', () => {
    const raw = "Let's do this! 🎯 Time to bring your A-game! ⚡ What's our play? 🏀";
    const cleaned = cleanTextForSpeech(raw);
    expect(cleaned).toBe("Let's do this! Time to bring your A-game! What's our play?");
    expect(cleaned).not.toContain('🎯');
    expect(cleaned).not.toContain('⚡');
    expect(cleaned).not.toContain('🏀');
  });

  test('handles empty and whitespace-only text gracefully', () => {
    expect(cleanTextForSpeech('')).toBe('');
    expect(cleanTextForSpeech('   ')).toBe('');
  });
});

describe('Conversational Voice & WAV Processing', () => {
  test('addWavHeaderToPcmBase64 generates standard 44-byte RIFF/WAVE header', () => {
    // Generate dummy PCM base64 (e.g. 100 bytes of silence)
    const rawPcm = Buffer.alloc(100, 0x00).toString('base64');
    const wavBase64 = addWavHeaderToPcmBase64(rawPcm, 24000, 1, 16);

    const wavBuffer = Buffer.from(wavBase64, 'base64');
    // RIFF chunk ID
    expect(wavBuffer.subarray(0, 4).toString('ascii')).toBe('RIFF');
    // WAVE format
    expect(wavBuffer.subarray(8, 12).toString('ascii')).toBe('WAVE');
    // 'fmt ' chunk
    expect(wavBuffer.subarray(12, 16).toString('ascii')).toBe('fmt ');
    // Total size = 44 bytes header + 100 bytes data
    expect(wavBuffer.length).toBe(144);
  });

  test('getActiveCoachVoiceName returns conversational persona name', async () => {
    const name = await getActiveCoachVoiceName();
    expect(name).toContain('Puck');
  });

  test('all coach personas have distinct pitch and rate configurations', () => {
    const puck = PERSONA_CONFIGS.Puck;
    const aoede = PERSONA_CONFIGS.Aoede;
    const fenrir = PERSONA_CONFIGS.Fenrir;
    const kore = PERSONA_CONFIGS.Kore;

    // Verify distinct pitches
    expect(puck.pitch).not.toBe(aoede.pitch);
    expect(puck.pitch).not.toBe(fenrir.pitch);
    expect(fenrir.pitch).toBeLessThan(1.0); // Deep voice
    expect(puck.pitch).toBeGreaterThan(1.0); // Lively, natural youthful voice

    // Verify distinct speech rates
    expect(puck.rate).toBeGreaterThan(aoede.rate);
    expect(kore.rate).toBeLessThan(1.0); // Gentle, calm pacing
  });
});


