import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { getParentPin } from '../../services/storage/storageService';

interface ParentPinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ParentPinModal: React.FC<ParentPinModalProps> = ({
  visible,
  onClose,
  onSuccess
}) => {
  const [pin, setPin] = useState('');

  const handleKeyPress = async (num: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);

    if (newPin.length === 4) {
      const storedPin = await getParentPin();
      if (newPin === storedPin) {
        setPin('');
        onSuccess();
      } else {
        Alert.alert('Incorrect PIN', 'The passcode you entered was incorrect. (Default PIN: 1234)');
        setPin('');
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.title}>Parent Dashboard</Text>
          <Text style={styles.subtitle}>Enter 4-digit PIN (Default: 1234)</Text>

          {/* Dots */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < pin.length && styles.dotFilled
                ]}
              />
            ))}
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <TouchableOpacity
                key={digit}
                style={styles.keyBtn}
                onPress={() => handleKeyPress(digit)}
              >
                <Text style={styles.keyText}>{digit}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.keyBtn} onPress={onClose}>
              <Text style={styles.actionKeyText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keyBtn} onPress={() => handleKeyPress('0')}>
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keyBtn} onPress={handleDelete}>
              <Text style={styles.actionKeyText}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  lockIcon: { fontSize: 36, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 4, marginBottom: 20 },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
  },
  dotFilled: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 240,
    gap: 12,
  },
  keyBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionKeyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
