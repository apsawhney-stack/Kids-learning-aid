import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Subject } from '../../types/chat';
import { CURRICULUM_DATA } from '../../config/curriculumTopics';

interface HomeworkIntakeModalProps {
  visible: boolean;
  initialSubject?: Subject;
  onClose: () => void;
  onSubmit: (data: {
    subject: Subject;
    problemTitle: string;
    description: string;
    imageUri?: string;
    imageBase64?: string;
  }) => void;
}

export const HomeworkIntakeModal: React.FC<HomeworkIntakeModalProps> = ({
  visible,
  initialSubject = 'math',
  onClose,
  onSubmit
}) => {
  const [subject, setSubject] = useState<Subject>(initialSubject);
  const [problemTitle, setProblemTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [imageBase64, setImageBase64] = useState<string | undefined>();
  const [loadingImage, setLoadingImage] = useState(false);

  const subjects: Subject[] = ['math', 'english', 'science', 'history'];

  const pickImage = async (useCamera: boolean) => {
    try {
      setLoadingImage(true);
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to snap homework photos.');
          setLoadingImage(false);
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library permission is required to choose photos.');
          setLoadingImage(false);
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 || undefined);
        if (!problemTitle) {
          setProblemTitle(`${CURRICULUM_DATA[subject].title} Problem`);
        }
      }
    } catch (err: any) {
      Alert.alert('Image error', err.message || 'Could not load image');
    } finally {
      setLoadingImage(false);
    }
  };

  const handleStart = () => {
    if (!description.trim() && !imageUri) {
      Alert.alert('Missing homework details', 'Please snap a photo of the worksheet or type in the question.');
      return;
    }

    onSubmit({
      subject,
      problemTitle: problemTitle.trim() || `${CURRICULUM_DATA[subject].title} Problem`,
      description: description.trim(),
      imageUri,
      imageBase64
    });

    // Reset fields
    setProblemTitle('');
    setDescription('');
    setImageUri(undefined);
    setImageBase64(undefined);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Homework Quest</Text>
          <TouchableOpacity onPress={handleStart} style={styles.startBtn}>
            <Text style={styles.startText}>Start</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Subject Pills */}
          <Text style={styles.sectionLabel}>1. SELECT SUBJECT</Text>
          <View style={styles.subjectRow}>
            {subjects.map((s) => {
              const info = CURRICULUM_DATA[s];
              const isSelected = subject === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSubject(s)}
                  style={[
                    styles.subjectPill,
                    isSelected && { backgroundColor: info.color, borderColor: info.color }
                  ]}
                >
                  <Text style={styles.subjectIcon}>{info.icon}</Text>
                  <Text style={[styles.subjectName, isSelected && styles.selectedSubjectName]}>
                    {info.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Photo Intake Area */}
          <Text style={styles.sectionLabel}>2. SNAP OR UPLOAD WORKSHEET</Text>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(undefined)}>
                <Text style={styles.removeImageText}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.photoActionCard}
                onPress={() => pickImage(true)}
                disabled={loadingImage}
              >
                <Text style={styles.photoActionEmoji}>📸</Text>
                <Text style={styles.photoActionTitle}>Take Photo</Text>
                <Text style={styles.photoActionSub}>Snap worksheet or book</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoActionCard}
                onPress={() => pickImage(false)}
                disabled={loadingImage}
              >
                <Text style={styles.photoActionEmoji}>🖼️</Text>
                <Text style={styles.photoActionTitle}>Choose Photo</Text>
                <Text style={styles.photoActionSub}>Upload from library</Text>
              </TouchableOpacity>
            </View>
          )}

          {loadingImage ? (
            <ActivityIndicator size="small" color="#4F46E5" style={{ marginVertical: 12 }} />
          ) : null}

          {/* Problem Details */}
          <Text style={styles.sectionLabel}>3. HOMEWORK QUESTION & NOTES</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Problem name (e.g. Question #4, Page 82)"
            placeholderTextColor="#94A3B8"
            value={problemTitle}
            onChangeText={setProblemTitle}
          />

          <TextInput
            style={styles.descriptionInput}
            placeholder="What is the problem or what part is confusing you? (e.g. 'I don't get how to set up the ratio')"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
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
  cancelBtn: { padding: 4 },
  cancelText: { color: '#64748B', fontSize: 16 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  startBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  startText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  content: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  subjectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  subjectIcon: { fontSize: 14, marginRight: 6 },
  subjectName: { fontSize: 13, fontWeight: '600', color: '#334155' },
  selectedSubjectName: { color: '#FFFFFF', fontWeight: '700' },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  photoActionEmoji: { fontSize: 28, marginBottom: 6 },
  photoActionTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  photoActionSub: { fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' },
  imagePreviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  removeImageBtn: {
    marginTop: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeImageText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 12,
  },
  titleInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  descriptionInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
