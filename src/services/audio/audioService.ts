import * as Speech from 'expo-speech';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  createAudioPlayer
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import {
  getStoredProviderConfig,
  getStoredVoiceEnabled,
  saveStoredVoiceEnabled,
  getStoredCoachVoice,
  saveStoredCoachVoice
} from '../storage/storageService';

let activeRecorder: any = null;
let activePlayer: any = null;
let activePlayerSubscription: any = null;
let currentSpeechSessionId = 0;

export interface SpeakCallbacks {
  onStart?: () => void;
  onDone?: () => void;
  onError?: (err: any) => void;
}

export {
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets
};

/**
 * Strips markdown symbols, visual tags, URLs, and converts LaTeX math for natural speech
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  return text
    // Remove visual component tags like <visual type="..." data="{...}" /> or <visual-svg>...</visual-svg>
    .replace(/<visual-svg[^>]*>.*?<\/visual-svg>/gis, '')
    .replace(/<visual[^>]*\/>/gi, '')
    .replace(/<visual[^>]*>.*?<\/visual>/gis, '')
    .replace(/<svg[^>]*>.*?<\/svg>/gis, '')
    .replace(/```(?:svg|xml)[\s\S]*?```/gi, '')
    // Math conversions for natural speech
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    .replace(/\\times/g, ' times ')
    .replace(/\\div/g, ' divided by ')
    .replace(/\\cdot/g, ' times ')
    .replace(/\\pm/g, ' plus or minus ')
    .replace(/\\approx/g, ' approximately ')
    .replace(/\\le(q)?/g, ' less than or equal to ')
    .replace(/\\ge(q)?/g, ' greater than or equal to ')
    .replace(/\\neq/g, ' is not equal to ')
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
    .replace(/([0-9]+)\s*[:/]\s*([0-9]+)/g, '$1 to $2') // e.g. 3:4 in ratio context
    // Markdown formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1')     // Italics
    .replace(/__([^_]+)__/g, '$1')     // Underline
    .replace(/`([^`]+)`/g, '$1')       // Inline code
    .replace(/#+\s*/g, '')             // Headers
    .replace(/^\s*[-*+]\s+/gm, '')     // List bullets
    .replace(/https?:\/\/\S+/g, '')    // URLs
    .replace(/[$~`]/g, '')             // Math symbols & backticks stripped cleanly
    .replace(/[\[\]\(\){}]/g, ' ')     // Brackets turned to spaces
    // Strip emojis so screen reader does not read emoji names aloud (e.g. 'rocket', 'glowing star')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')              // Collapse whitespace
    .replace(/\s+([.,!?:;])/g, '$1')   // Remove space before punctuation
    .trim();
}

let cachedVoiceId: string | null = null;
let cachedVoiceName: string | null = null;

/**
 * Discovers the most natural human voice available on the device (prefers Premium/Enhanced Apple voices like Ava, Zoe, Alex)
 */
export async function getBestCoachVoice(forceRefresh = false): Promise<{ identifier: string; name: string } | null> {
  if (!forceRefresh && cachedVoiceId && cachedVoiceName && cachedVoiceName.includes('(Premium)')) {
    return { identifier: cachedVoiceId, name: cachedVoiceName };
  }

  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices || voices.length === 0) return null;

    const enVoices = voices.filter(
      (v) => v.language && (v.language.startsWith('en') || v.language === 'en-US' || v.language === 'en_US')
    );

    if (enVoices.length === 0) return null;

    // Preference hierarchy: Premium neural voices, Alex (Apple human-breath voice), Enhanced voices, Siri
    const preferredNames = [
      'Ava (Premium)',
      'Zoe (Premium)',
      'Samantha (Premium)',
      'Evan (Premium)',
      'Nathan (Premium)',
      'Alex',
      'Ava (Enhanced)',
      'Zoe (Enhanced)',
      'Samantha (Enhanced)',
      'Evan (Enhanced)',
      'Nathan (Enhanced)',
      'Siri',
      'Ava',
      'Zoe'
    ];

    for (const name of preferredNames) {
      const match = enVoices.find(
        (v) =>
          v.name.toLowerCase().includes(name.toLowerCase()) ||
          v.identifier.toLowerCase().includes(name.toLowerCase())
      );
      if (match) {
        cachedVoiceId = match.identifier;
        cachedVoiceName = match.name;
        return { identifier: match.identifier, name: match.name };
      }
    }

    // Look for any voice with (Premium) in its name
    const premiumMatch = enVoices.find((v) => v.name.toLowerCase().includes('(premium)'));
    if (premiumMatch) {
      cachedVoiceId = premiumMatch.identifier;
      cachedVoiceName = premiumMatch.name;
      return { identifier: premiumMatch.identifier, name: premiumMatch.name };
    }

    // Look for any Enhanced quality voice
    const enhanced = enVoices.find(
      (v) =>
        v.name.toLowerCase().includes('(enhanced)') ||
        v.quality === Speech.VoiceQuality.Enhanced ||
        (v.quality as any) === 'Enhanced'
    );
    if (enhanced) {
      cachedVoiceId = enhanced.identifier;
      cachedVoiceName = enhanced.name;
      return { identifier: enhanced.identifier, name: enhanced.name };
    }

    cachedVoiceId = enVoices[0].identifier;
    cachedVoiceName = enVoices[0].name;
    return { identifier: enVoices[0].identifier, name: enVoices[0].name };
  } catch (err) {
    console.warn('Error fetching available voices:', err);
    return null;
  }
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}

function base64ToUint8Array(b64: string): Uint8Array {
  const len = b64.length;
  let bufferLength = b64.length * 0.75;
  if (b64[len - 1] === '=') {
    bufferLength--;
    if (b64[len - 2] === '=') bufferLength--;
  }
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = B64_LOOKUP[b64.charCodeAt(i)];
    const encoded2 = B64_LOOKUP[b64.charCodeAt(i + 1)];
    const encoded3 = B64_LOOKUP[b64.charCodeAt(i + 2)];
    const encoded4 = B64_LOOKUP[b64.charCodeAt(i + 3)];
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== undefined && b64[i + 2] !== '=') bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (encoded4 !== undefined && b64[i + 3] !== '=') bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;
    result += B64_CHARS[b1 >> 2];
    result += B64_CHARS[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < len ? B64_CHARS[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < len ? B64_CHARS[b3 & 63] : '=';
  }
  return result;
}

/**
 * Prepends a standard 44-byte RIFF WAV header to raw 24kHz 16-bit mono PCM base64 audio
 */
export function addWavHeaderToPcmBase64(
  pcmBase64: string,
  sampleRate: number = 24000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): string {
  const pcmBytes = base64ToUint8Array(pcmBase64);
  const pcmLength = pcmBytes.length;
  const wavBytes = new Uint8Array(44 + pcmLength);
  const view = new DataView(wavBytes.buffer);

  // 'RIFF'
  view.setUint32(0, 0x52494646, false);
  // Total file size minus 8
  view.setUint32(4, 36 + pcmLength, true);
  // 'WAVE'
  view.setUint32(8, 0x57415645, false);
  // 'fmt '
  view.setUint32(12, 0x666d7420, false);
  // Subchunk1Size (16 for PCM)
  view.setUint32(16, 16, true);
  // AudioFormat (1 for PCM)
  view.setUint16(20, 1, true);
  // NumChannels
  view.setUint16(22, numChannels, true);
  // SampleRate
  view.setUint32(24, sampleRate, true);
  // ByteRate = SampleRate * NumChannels * BitsPerSample / 8
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  // BlockAlign = NumChannels * BitsPerSample / 8
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  // BitsPerSample
  view.setUint16(34, bitsPerSample, true);
  // 'data'
  view.setUint32(36, 0x64617461, false);
  // Subchunk2Size (data length in bytes)
  view.setUint32(40, pcmLength, true);

  wavBytes.set(pcmBytes, 44);
  return uint8ArrayToBase64(wavBytes);
}

export interface PersonaSpeechConfig {
  preferredVoices: string[];
  pitch: number;
  rate: number;
  sampleLine: string;
}

export const PERSONA_CONFIGS: Record<string, PersonaSpeechConfig> = {
  Puck: {
    preferredVoices: ['Evan (Premium)', 'Evan (Enhanced)', 'Alex', 'Aaron', 'Evan', 'Samantha'],
    pitch: 1.04, // Lively, youthful & natural human pitch
    rate: 0.98,  // Engaging coach cadence
    sampleLine: "Hey Alex! Coach Spark here. Time to bring your A-game! What's our first play?"
  },
  Aoede: {
    preferredVoices: ['Ava (Premium)', 'Zoe (Premium)', 'Samantha (Premium)', 'Ava (Enhanced)', 'Zoe (Enhanced)', 'Samantha (Enhanced)', 'Susan'],
    pitch: 1.00, // Natural warm female pitch
    rate: 0.92,  // Patient, empathetic mentor cadence
    sampleLine: "Hello Alex, I'm Coach Spark. Take a deep breath, you've got this, and I'm right here with you."
  },
  Fenrir: {
    preferredVoices: ['Daniel (Premium)', 'Arthur (Premium)', 'Daniel (Enhanced)', 'Arthur (Enhanced)', 'Daniel', 'Oliver', 'Arthur', 'Alex'],
    pitch: 0.96, // Confident, grounded natural tone
    rate: 0.96,  // Solid, encouraging pace
    sampleLine: "All right Alex, Coach Spark in the building! Let's conquer this challenge with zero fear!"
  },
  Kore: {
    preferredVoices: ['Karen (Premium)', 'Moira (Premium)', 'Karen (Enhanced)', 'Moira (Enhanced)', 'Victoria', 'Tessa', 'Samantha'],
    pitch: 1.02, // Bright, clear & friendly
    rate: 0.90,  // Calm, measured, step-by-step breakdown
    sampleLine: "Hi Alex, Coach Spark here. Let's take this problem one calm, easy step at a time."
  },
  device: {
    preferredVoices: ['Ava (Premium)', 'Alex', 'Samantha (Premium)', 'Samantha', 'Ava'],
    pitch: 1.0,
    rate: 0.96,
    sampleLine: "Coach Spark is ready to assist you with your homework."
  }
};

const NOVELTY_VOICE_NAMES = [
  'fred',
  'junior',
  'kathy',
  'ralph',
  'albert',
  'bad news',
  'bahh',
  'bells',
  'boing',
  'cellos',
  'deranged',
  'good news',
  'hysterical',
  'organ',
  'trinoids',
  'whisper',
  'zarvox'
];

/**
 * Finds the most natural, human-like voice and pitch/rate settings for a given coach persona
 */
export async function getVoiceConfigForPersona(persona: string): Promise<{
  identifier?: string;
  name?: string;
  pitch: number;
  rate: number;
}> {
  const personaStyle = PERSONA_CONFIGS[persona] || PERSONA_CONFIGS.Puck;

  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const enVoices = (voices || [])
      .filter(
        (v) => v.language && (v.language.startsWith('en') || v.language === 'en-US' || v.language === 'en_US')
      )
      // Exclude vintage novelty robotic voices (like Fred, Zarvox, etc.)
      .filter((v) => {
        const lower = (v.name || '').toLowerCase();
        return !NOVELTY_VOICE_NAMES.some((novelty) => lower.includes(novelty));
      });

    if (enVoices.length > 0) {
      // 1. Try to find one of the preferred natural voices for this persona
      for (const pref of personaStyle.preferredVoices) {
        const match = enVoices.find(
          (v) =>
            v.name.toLowerCase().includes(pref.toLowerCase()) ||
            v.identifier.toLowerCase().includes(pref.toLowerCase())
        );
        if (match) {
          return {
            identifier: match.identifier,
            name: match.name,
            pitch: personaStyle.pitch,
            rate: personaStyle.rate
          };
        }
      }

      // 1b. If persona's specific voice isn't downloaded, look for ANY downloaded Premium voice!
      const anyPremium = enVoices.find((v) => v.name.toLowerCase().includes('(premium)'));
      if (anyPremium) {
        return {
          identifier: anyPremium.identifier,
          name: anyPremium.name,
          pitch: personaStyle.pitch,
          rate: personaStyle.rate
        };
      }

      // 1c. Look for any Enhanced voice or Alex
      const anyEnhanced = enVoices.find(
        (v) =>
          v.name.toLowerCase().includes('(enhanced)') ||
          v.name.toLowerCase() === 'alex' ||
          v.quality === Speech.VoiceQuality.Enhanced ||
          (v.quality as any) === 'Enhanced'
      );
      if (anyEnhanced) {
        return {
          identifier: anyEnhanced.identifier,
          name: anyEnhanced.name,
          pitch: personaStyle.pitch,
          rate: personaStyle.rate
        };
      }

      // 2. Try accent preference (en-GB for Fenrir, en-AU/en-IE for Kore, en-US for Puck/Aoede)
      const accentPrefix =
        persona === 'Fenrir' ? 'en-gb' : persona === 'Kore' ? 'en-au' : 'en-us';
      const accentMatch = enVoices.find((v) =>
        (v.language || '').toLowerCase().startsWith(accentPrefix)
      );
      if (accentMatch) {
        return {
          identifier: accentMatch.identifier,
          name: accentMatch.name,
          pitch: personaStyle.pitch,
          rate: personaStyle.rate
        };
      }

      // 3. Fallback: distribute distinct natural voices across personas so they never sound identical
      const uniqueVoices = enVoices.filter(
        (v, idx, arr) => arr.findIndex((item) => item.identifier === v.identifier || item.name === v.name) === idx
      );
      const personaIndex =
        persona === 'Puck' ? 0 : persona === 'Aoede' ? 1 : persona === 'Fenrir' ? 2 : 3;
      const assignedVoice = uniqueVoices[personaIndex % uniqueVoices.length];
      return {
        identifier: assignedVoice.identifier,
        name: assignedVoice.name,
        pitch: personaStyle.pitch,
        rate: personaStyle.rate
      };
    }
  } catch (err) {
    console.warn('Error discovering persona voice:', err);
  }

  return {
    pitch: personaStyle.pitch,
    rate: personaStyle.rate
  };
}

let cachedTTSModel: string | null = null;
let geminiQuotaExhaustedUntil: number = 0;
const speechAudioCache = new Map<string, string>();

/**
 * Computes a fast string hash for unique cached audio filenames
 */
function getSpeechCacheKey(voice: string, text: string): string {
  let hash = 0;
  const str = `${voice}:${text}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `coach_speech_${Math.abs(hash).toString(36)}.wav`;
}

/**
 * Asynchronously pre-warms speech audio in the background so it plays with 0ms delay when user taps Listen
 */
export function prewarmCoachAudio(text: string, voiceName?: string): void {
  const clean = cleanTextForSpeech(text);
  if (!clean) return;

  (async () => {
    try {
      const voice = voiceName || (await getStoredCoachVoice());
      if (voice === 'device') return;
      await generateGeminiCoachSpeech(clean, voice);
    } catch {}
  })();
}

/**
 * Synthesizes expressive conversational speech using Gemini API.
 * Automatically checks local audio cache and honors rate-limit cooldowns.
 */
export async function generateGeminiCoachSpeech(
  cleanText: string,
  voiceName: string = 'Puck'
): Promise<string | null> {
  const config = await getStoredProviderConfig();
  if (!config.apiKey) return null;

  // If currently rate-limited (HTTP 429), skip cloud requests immediately to prevent lag
  if (Date.now() < geminiQuotaExhaustedUntil) {
    return null;
  }

  const cacheFilename = getSpeechCacheKey(voiceName, cleanText);

  // Check in-memory cache first
  if (speechAudioCache.has(cacheFilename)) {
    const cachedUri = speechAudioCache.get(cacheFilename)!;
    try {
      const existingFile = new File(cachedUri);
      if (existingFile.exists) {
        return cachedUri;
      }
    } catch {}
  }

  // Check local filesystem cache
  try {
    const cachedFile = new File(Paths.cache, cacheFilename);
    if (cachedFile.exists) {
      speechAudioCache.set(cacheFilename, cachedFile.uri);
      return cachedFile.uri;
    }
  } catch {}

  // Candidate TTS models in priority order (only models that support audio output modalities)
  const candidateModels = cachedTTSModel
    ? [cachedTTSModel]
    : [
        'gemini-2.5-flash-preview-tts',
        'gemini-2.0-flash-exp'
      ];

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Speak the following message to a 6th grade student in a friendly, encouraging, conversational tone as Coach Spark. Speak only these exact words with no added greeting, commentary, or conversational fluff:\n\n${cleanText}`
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName || 'Puck'
                }
              }
            }
          }
        })
      });

      if (!res.ok) {
        if (res.status === 429) {
          // Free tier quota limit (10 requests) reached on Gemini TTS
          geminiQuotaExhaustedUntil = Date.now() + 24 * 60 * 60 * 1000; // 24-hour quota cooldown for daily free-tier limit
          console.warn('Gemini audio daily quota reached (429). Switching to high-quality zero-latency on-device voice.');
          return null;
        }
        const errText = await res.text().catch(() => '');
        console.warn(`Gemini audio model ${model} HTTP ${res.status}: ${errText}`);
        continue; // Try next candidate model
      }

      const data = await res.json();
      const candidatePart = data?.candidates?.[0]?.content?.parts?.[0];
      const inlineData = candidatePart?.inlineData;

      if (!inlineData?.data) {
        console.warn(`Gemini audio model ${model} returned empty audio parts`);
        continue;
      }

      cachedTTSModel = model; // Lock into the working model

      let wavBase64 = inlineData.data;
      const mimeType = inlineData.mimeType || '';

      // If response is raw PCM or missing RIFF header, prepend standard 44-byte RIFF WAV header
      if (mimeType.includes('pcm') || !wavBase64.startsWith('UklGR')) {
        wavBase64 = addWavHeaderToPcmBase64(wavBase64, 24000);
      }

      // Save audio into cache file with unique filename per message
      const audioFile = new File(Paths.cache, cacheFilename);
      if (!audioFile.exists) {
        audioFile.create({ overwrite: true });
      }
      audioFile.write(wavBase64, { encoding: 'base64' });

      speechAudioCache.set(cacheFilename, audioFile.uri);
      return audioFile.uri;
    } catch (err) {
      console.warn(`Gemini coach speech generation error with ${model}:`, err);
    }
  }

  return null;
}

export async function getActiveCoachVoiceName(): Promise<string> {
  const voice = await getStoredCoachVoice();
  const config = await getVoiceConfigForPersona(voice);
  const detectedVoice = config.name || 'System Default';
  if (voice === 'Puck') return `Puck (${detectedVoice})`;
  if (voice === 'Aoede') return `Aoede (${detectedVoice})`;
  if (voice === 'Fenrir') return `Fenrir (${detectedVoice})`;
  if (voice === 'Kore') return `Kore (${detectedVoice})`;
  return `${detectedVoice} (On-Device)`;
}

/**
 * Fallback device speech synthesizer (AVSpeechSynthesizer)
 * Applies distinct voices, pitches, and rates tailored to each persona
 */
export async function speakWithDeviceVoice(
  cleanText: string,
  personaName: string = 'Puck',
  callbacksOrOnStart?: SpeakCallbacks | (() => void),
  onDone?: () => void,
  onError?: (err: any) => void
): Promise<void> {
  let onStartCb: (() => void) | undefined;
  let onDoneCb: (() => void) | undefined;
  let onErrCb: ((err: any) => void) | undefined;

  if (callbacksOrOnStart && typeof callbacksOrOnStart === 'object') {
    onStartCb = callbacksOrOnStart.onStart;
    onDoneCb = callbacksOrOnStart.onDone;
    onErrCb = callbacksOrOnStart.onError;
  } else if (typeof onError === 'function') {
    onStartCb = callbacksOrOnStart as (() => void) | undefined;
    onDoneCb = onDone;
    onErrCb = onError;
  } else {
    onDoneCb = callbacksOrOnStart as (() => void) | undefined;
    onErrCb = onDone;
  }

  try {
    const config = await getVoiceConfigForPersona(personaName);

    const options: Speech.SpeechOptions = {
      language: 'en-US',
      pitch: config.pitch,
      rate: config.rate,
      onDone: () => onDoneCb?.(),
      onStopped: () => onDoneCb?.(),
      onError: (err) => {
        console.warn('Device speech error:', err);
        onErrCb?.(err);
      }
    };

    if (config.identifier) {
      options.voice = config.identifier;
    }

    Speech.speak(cleanText, options);
    onStartCb?.();
  } catch (err) {
    console.warn('Device speech error:', err);
    onErrCb?.(err);
  }
}

/**
 * Text-to-Speech: Coach Spark speaks out loud.
 * Uses Gemini Audio for lively conversational coach speech.
 * Falls back to distinct persona-tuned device speech if offline or API is unavailable.
 */
export async function speakCoachMessage(
  text: string,
  callbacksOrOnStart?: SpeakCallbacks | (() => void),
  onDoneOrError?: () => void,
  onError?: (err: any) => void
): Promise<void> {
  let onStart: (() => void) | undefined;
  let onDone: (() => void) | undefined;
  let onErr: ((err: any) => void) | undefined;

  if (callbacksOrOnStart && typeof callbacksOrOnStart === 'object') {
    onStart = callbacksOrOnStart.onStart;
    onDone = callbacksOrOnStart.onDone;
    onErr = callbacksOrOnStart.onError;
  } else if (typeof onError === 'function') {
    onStart = callbacksOrOnStart as (() => void) | undefined;
    onDone = onDoneOrError;
    onErr = onError;
  } else {
    onDone = callbacksOrOnStart as (() => void) | undefined;
    onErr = onDoneOrError;
  }

  const clean = cleanTextForSpeech(text);
  if (!clean) {
    onDone?.();
    return;
  }

  const voiceEnabled = await getVoiceOutputEnabled();
  if (!voiceEnabled) {
    onDone?.();
    return;
  }

  await stopSpeech();
  const sessionId = currentSpeechSessionId;

  // Check coach voice preference (e.g. 'Puck', 'Aoede', 'Fenrir', 'Kore', or 'device')
  const voiceName = await getStoredCoachVoice();

  if (voiceName !== 'device') {
    try {
      const audioUri = await generateGeminiCoachSpeech(clean, voiceName);

      // If user stopped speech while audio was being generated, abort playback
      if (currentSpeechSessionId !== sessionId) {
        return;
      }

      if (audioUri) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false
        });

        const player = createAudioPlayer(audioUri);
        activePlayer = player;

        let hasFinished = false;
        activePlayerSubscription = player.addListener('playbackStatusUpdate', (status: any) => {
          if (status.didJustFinish && !hasFinished) {
            hasFinished = true;
            if (activePlayerSubscription) {
              activePlayerSubscription.remove();
              activePlayerSubscription = null;
            }
            if (activePlayer) {
              try { activePlayer.remove(); } catch {}
              activePlayer = null;
            }
            onDone?.();
          } else if (status.error && !hasFinished) {
            hasFinished = true;
            if (activePlayerSubscription) {
              activePlayerSubscription.remove();
              activePlayerSubscription = null;
            }
            if (activePlayer) {
              try { activePlayer.remove(); } catch {}
              activePlayer = null;
            }
            // Fallback to distinct device voice
            if (currentSpeechSessionId === sessionId) {
              speakWithDeviceVoice(clean, voiceName, { onStart, onDone, onError: onErr });
            }
          }
        });

        player.play();
        onStart?.();
        return;
      }
    } catch (geminiAudioErr) {
      console.warn('Gemini audio playback error, falling back to device speech:', geminiAudioErr);
    }
  }

  // Fallback to distinct device voice tailored to the persona
  if (currentSpeechSessionId === sessionId) {
    speakWithDeviceVoice(clean, voiceName, { onStart, onDone, onError: onErr });
  }
}

export async function stopSpeech(): Promise<void> {
  currentSpeechSessionId++; // Invalidate any in-flight async TTS generation
  try {
    if (activePlayerSubscription) {
      activePlayerSubscription.remove();
      activePlayerSubscription = null;
    }
    if (activePlayer) {
      try {
        activePlayer.pause();
        activePlayer.remove();
      } catch {}
      activePlayer = null;
    }
    await Speech.stop();
  } catch (err) {
    console.warn('Stop speech error:', err);
  }
}

export async function isSpeaking(): Promise<boolean> {
  try {
    const isPlayerPlaying = activePlayer ? activePlayer.playing : false;
    const isDeviceSpeaking = await Speech.isSpeakingAsync();
    return isPlayerPlaying || isDeviceSpeaking;
  } catch {
    return false;
  }
}

export async function setVoiceOutputEnabled(enabled: boolean): Promise<void> {
  await saveStoredVoiceEnabled(enabled);
  if (!enabled) {
    await stopSpeech();
  }
}

export async function getVoiceOutputEnabled(): Promise<boolean> {
  return await getStoredVoiceEnabled();
}

/**
 * Audio Recording for Student Voice Input via expo-audio
 */
export async function startAudioRecording(): Promise<boolean> {
  try {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      return false;
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true
    });

    if (activeRecorder) {
      try {
        await activeRecorder.stop();
      } catch {}
      activeRecorder = null;
    }

    const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    await recorder.prepareToRecordAsync();
    recorder.record();
    activeRecorder = recorder;
    return true;
  } catch (err) {
    console.warn('Failed to start recording:', err);
    activeRecorder = null;
    return false;
  }
}

export function isRecordingActive(): boolean {
  return activeRecorder !== null;
}

export async function stopAudioRecording(): Promise<string | null> {
  if (!activeRecorder) return null;

  try {
    await activeRecorder.stop();
    const uri = activeRecorder.uri;
    activeRecorder = null;
    return uri;
  } catch (err) {
    console.warn('Failed to stop recording:', err);
    activeRecorder = null;
    return null;
  }
}

/**
 * Transcribes student audio using Gemini Multimodal Audio
 */
export async function transcribeAudioWithGemini(audioUri: string): Promise<string> {
  const config = await getStoredProviderConfig();
  if (!config.apiKey) {
    // If running in offline demo mode without API key
    return "I need help with this question, can you explain the first step?";
  }

  try {
    // Read audio file directly as base64 using expo-file-system (no Blob or FileReader overhead)
    let base64Data: string | null = null;
    try {
      const file = new File(audioUri);
      base64Data = await file.base64();
    } catch {
      // Fallback in case of custom URI scheme
      try {
        const response = await fetch(audioUri);
        const blob = await response.blob();
        base64Data = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result ? (result.includes(',') ? result.split(',')[1] : result) : null);
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch {}
    }

    if (!base64Data) {
      return "Can you help me with this problem?";
    }

    // Try candidate models in order of capability & availability
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash'
    ];

    let transcript = '';
    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: 'audio/mp4',
                      data: base64Data
                    }
                  },
                  {
                    text: "Transcribe the student's spoken words in this audio exactly. Output only the student's transcription as plain text, with no markdown, conversational commentary, or answers."
                  }
                ]
              }
            ]
          })
        });

        if (res.ok) {
          const data = await res.json();
          transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          if (transcript) break;
        } else {
          console.warn(`Transcription API model ${model} returned status ${res.status}, checking next model...`);
        }
      } catch (modelErr) {
        console.warn(`Transcription error with ${model}:`, modelErr);
      }
    }

    return transcript || "I have a question about this step.";
  } catch (err) {
    console.warn('Transcription error:', err);
    return "I'm stuck, can you give me a hint?";
  }
}
