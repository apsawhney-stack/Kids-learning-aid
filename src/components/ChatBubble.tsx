import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChatMessage } from '../types/chat';
import { VisualDispatcher } from './visuals/VisualDispatcher';

interface ChatBubbleProps {
  message: ChatMessage;
  isSpeaking?: boolean;
  isLoadingAudio?: boolean;
  onToggleSpeak?: (message: ChatMessage) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isSpeaking = false,
  isLoadingAudio = false,
  onToggleSpeak
}) => {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.wrapper, isUser ? styles.userWrapper : styles.assistantWrapper]}>
      {!isUser ? (
        <View style={styles.coachAvatar}>
          <Text style={styles.coachAvatarText}>⚡</Text>
        </View>
      ) : null}

      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser ? (
          <View style={styles.coachHeaderRow}>
            <Text style={styles.coachLabel}>Coach Spark</Text>
            {onToggleSpeak ? (
              <TouchableOpacity
                style={[
                  styles.speakerBtn,
                  isSpeaking && styles.speakerBtnActive,
                  isLoadingAudio && styles.speakerBtnLoading
                ]}
                onPress={() => onToggleSpeak(message)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={
                  isSpeaking
                    ? 'Stop speaking'
                    : isLoadingAudio
                    ? 'Loading coach voice'
                    : 'Read message out loud'
                }
              >
                {isLoadingAudio ? (
                  <View style={styles.loadingSpeakerRow}>
                    <ActivityIndicator size="small" color="#4F46E5" style={styles.loadingSpinner} />
                    <Text style={styles.speakerText}>Loading...</Text>
                  </View>
                ) : (
                  <Text style={[styles.speakerText, isSpeaking && styles.speakerTextActive]}>
                    {isSpeaking ? '⏹️ Stop' : '🔊 Listen'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* If user uploaded an image with their message */}
        {message.imageUrl ? (
          <Image
            source={{ uri: message.imageUrl }}
            style={styles.attachedImage}
            resizeMode="cover"
          />
        ) : null}

        <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>

        {/* Dynamic Visual Model */}
        {message.visual ? (
          <View style={styles.visualContainer}>
            <VisualDispatcher visual={message.visual} />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  assistantWrapper: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  coachAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  coachAvatarText: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  coachHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  coachLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  speakerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  speakerBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  speakerBtnLoading: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  loadingSpeakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingSpinner: {
    transform: [{ scale: 0.65 }],
  },
  speakerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  speakerTextActive: {
    color: '#DC2626',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  assistantText: {
    color: '#1E293B',
  },
  attachedImage: {
    width: 180,
    height: 120,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#E2E8F0',
  },
  visualContainer: {
    marginTop: 6,
    width: '100%',
  },
});
