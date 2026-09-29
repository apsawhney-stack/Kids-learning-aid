import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY_GEMINI_KEY = 'mindstep_api_gemini';
const KEY_DEEPSEEK_KEY = 'mindstep_api_deepseek';
const KEY_OPENAI_KEY = 'mindstep_api_openai';
const KEY_CLAUDE_KEY = 'mindstep_api_claude';
const KEY_PARENT_PIN = 'mindstep_parent_pin';

export async function saveSecureItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (err) {
    console.error('Error saving secure item:', err);
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.error('Error reading secure item:', err);
    return null;
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (err) {
    console.error('Error deleting secure item:', err);
  }
}

export { KEY_GEMINI_KEY, KEY_DEEPSEEK_KEY, KEY_OPENAI_KEY, KEY_CLAUDE_KEY, KEY_PARENT_PIN };
