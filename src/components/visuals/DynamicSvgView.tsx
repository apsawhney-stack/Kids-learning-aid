import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, Dimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { DynamicSvgData } from '../../types/visuals';

interface DynamicSvgViewProps {
  data: DynamicSvgData | { svg: string; title?: string };
}

export const DynamicSvgView: React.FC<DynamicSvgViewProps> = ({ data }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);

  const rawSvg = typeof data === 'string' ? data : data?.svg || '';
  const title = (typeof data === 'object' && data?.title) || 'Visual Model';

  if (!rawSvg || hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>📐</Text>
        <Text style={styles.errorTitle}>{title}</Text>
        <Text style={styles.errorSubtitle}>Diagram loaded in coach notes</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>🔬</Text>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setIsFullscreen(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.expandText}>🔍 Zoom</Text>
        </TouchableOpacity>
      </View>

      {/* SVG Canvas */}
      <View style={styles.svgWrapper}>
        <SvgXml
          xml={rawSvg}
          width="100%"
          height={210}
          onError={() => setHasError(true)}
        />
      </View>

      {/* Fullscreen Modal */}
      <Modal
        visible={isFullscreen}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setIsFullscreen(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.closeText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalSvgWrapper}>
            <SvgXml
              xml={rawSvg}
              width="100%"
              height={Dimensions.get('window').height * 0.75}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    padding: 12,
    marginVertical: 8,
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  icon: {
    fontSize: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    flexShrink: 1,
    lineHeight: 16,
  },
  expandBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  expandText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    backgroundColor: '#FAFAFE',
    borderRadius: 8,
    padding: 6,
  },
  errorContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  errorSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalSvgWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
