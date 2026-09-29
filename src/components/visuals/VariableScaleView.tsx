import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Circle } from 'react-native-svg';
import { VariableScaleData } from '../../types/visuals';

interface VariableScaleViewProps {
  data: VariableScaleData;
}

export const VariableScaleView: React.FC<VariableScaleViewProps> = ({ data }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>🔬 Variable Balance Scale</Text>

      <View style={styles.scaleContainer}>
        {/* Seesaw Svg */}
        <Svg width="260" height="40" viewBox="0 0 260 40">
          {/* Fulcrum (Triangle in center) */}
          <Polygon points="130,16 118,36 142,36" fill="#64748B" />
          {/* Beam */}
          <Line x1="20" y1="16" x2="240" y2="16" stroke="#1E293B" strokeWidth="4" />
          <Circle cx="130" cy="16" r="4" fill="#3B82F6" />
        </Svg>

        {/* Two Pans: Left = Independent, Right = Dependent */}
        <View style={styles.pansRow}>
          {/* Left Pan */}
          <View style={[styles.panCard, styles.indepCard]}>
            <Text style={styles.panBadge}>INDEPENDENT</Text>
            <Text style={styles.panSubtext}>(The 1 thing YOU change)</Text>
            <Text style={styles.panValue}>{data.independentVar}</Text>
          </View>

          {/* Right Pan */}
          <View style={[styles.panCard, styles.depCard]}>
            <Text style={styles.panBadge}>DEPENDENT</Text>
            <Text style={styles.panSubtext}>(The result that is MEASURED)</Text>
            <Text style={styles.panValue}>{data.dependentVar}</Text>
          </View>
        </View>
      </View>

      {data.constants && data.constants.length > 0 ? (
        <View style={styles.constantsBox}>
          <Text style={styles.constantsLabel}>🔒 Kept Constant (Fair Test):</Text>
          <Text style={styles.constantsText}>{data.constants.join(', ')}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  scaleContainer: {
    alignItems: 'center',
    marginVertical: 6,
  },
  pansRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
    gap: 8,
  },
  panCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  indepCard: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  depCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  panBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  panSubtext: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 6,
  },
  panValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  constantsBox: {
    marginTop: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 8,
  },
  constantsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  constantsText: {
    fontSize: 11,
    color: '#334155',
    marginTop: 2,
  },
});
