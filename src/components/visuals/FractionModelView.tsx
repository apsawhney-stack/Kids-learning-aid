import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Rect, Path, G, Text as SvgText } from 'react-native-svg';
import { FractionModelData } from '../../types/visuals';

interface FractionModelViewProps {
  data: FractionModelData;
}

export const FractionModelView: React.FC<FractionModelViewProps> = ({ data }) => {
  const total = Math.max(data?.totalParts || 4, 1);
  const initialShaded = Math.min(data?.shadedParts || 1, total);
  const [shadedCount, setShadedCount] = useState<number>(initialShaded);
  const [shape, setShape] = useState<'bar' | 'circle'>(data?.shape || 'bar');

  const title = data?.title || 'Fraction Visual Model';
  const percentage = Math.round((shadedCount / total) * 100);

  const togglePart = (index: number) => {
    // If tapping an active slice, decrease shaded; otherwise set up to tapped index + 1
    if (index < shadedCount) {
      setShadedCount(index);
    } else {
      setShadedCount(index + 1);
    }
  };

  // Helper to draw SVG pie slices
  const renderCircleSlices = () => {
    const cx = 160;
    const cy = 80;
    const r = 60;
    const angleStep = (2 * Math.PI) / total;

    return Array.from({ length: total }).map((_, i) => {
      const startAngle = i * angleStep - Math.PI / 2;
      const endAngle = (i + 1) * angleStep - Math.PI / 2;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);

      const largeArc = angleStep > Math.PI ? 1 : 0;
      const pathData = total === 1
        ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      const isShaded = i < shadedCount;

      return (
        <Path
          key={`slice-${i}`}
          d={pathData}
          fill={isShaded ? '#3B82F6' : '#F1F5F9'}
          stroke="#1E293B"
          strokeWidth="1.5"
          onPress={() => togglePart(i)}
        />
      );
    });
  };

  // Helper to draw SVG fraction bars
  const renderBarParts = () => {
    const barWidth = 280;
    const barHeight = 44;
    const startX = 20;
    const startY = 55;
    const partWidth = barWidth / total;

    return (
      <G>
        {/* Background container */}
        <Rect
          x={startX}
          y={startY}
          width={barWidth}
          height={barHeight}
          rx={8}
          fill="#F8FAFC"
          stroke="#0F172A"
          strokeWidth="2"
        />

        {/* Individual parts */}
        {Array.from({ length: total }).map((_, i) => {
          const x = startX + i * partWidth;
          const isShaded = i < shadedCount;

          return (
            <G key={`bar-part-${i}`}>
              <Rect
                x={x}
                y={startY}
                width={partWidth}
                height={barHeight}
                fill={isShaded ? '#3B82F6' : '#FFFFFF'}
                stroke="#0F172A"
                strokeWidth="1"
                fillOpacity={isShaded ? 0.9 : 0.4}
                onPress={() => togglePart(i)}
              />
              <SvgText
                x={x + partWidth / 2}
                y={startY + barHeight / 2 + 4}
                fontSize="11"
                fontWeight="bold"
                fill={isShaded ? '#FFFFFF' : '#64748B'}
                textAnchor="middle"
              >
                1/{total}
              </SvgText>
            </G>
          );
        })}
      </G>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>🍕</Text>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Shape Switcher */}
        <View style={styles.switchRow}>
          <TouchableOpacity
            style={[styles.switchBtn, shape === 'bar' && styles.switchBtnActive]}
            onPress={() => setShape('bar')}
            activeOpacity={0.7}
          >
            <Text style={[styles.switchText, shape === 'bar' && styles.switchTextActive]}>
              Bar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchBtn, shape === 'circle' && styles.switchBtnActive]}
            onPress={() => setShape('circle')}
            activeOpacity={0.7}
          >
            <Text style={[styles.switchText, shape === 'circle' && styles.switchTextActive]}>
              Circle
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SVG Canvas */}
      <View style={styles.svgWrapper}>
        <Svg width="100%" height={155} viewBox="0 0 320 155">
          {shape === 'bar' ? renderBarParts() : renderCircleSlices()}
        </Svg>
      </View>

      {/* Interactive Value Badge */}
      <View style={styles.valueRow}>
        <View style={styles.fractionPill}>
          <Text style={styles.fractionPillText}>
            Shaded: {shadedCount} / {total} ({percentage}%)
          </Text>
        </View>
        <Text style={styles.hintText}>👆 Tap parts to shade or unshade</Text>
      </View>

      {/* Optional Equivalent Fraction Comparison */}
      {data?.compareWith && (
        <View style={styles.comparisonBox}>
          <Text style={styles.comparisonTitle}>
            🔄 Equivalent Check: {data.compareWith.label || `${data.compareWith.shadedParts}/${data.compareWith.totalParts}`}
          </Text>
          <Text style={styles.comparisonDesc}>
            {`${shadedCount}/${total} is equivalent to ${(shadedCount / total).toFixed(2)} in decimal form!`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    padding: 12,
    marginVertical: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  icon: {
    fontSize: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  switchRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  switchBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  switchBtnActive: {
    backgroundColor: '#3B82F6',
  },
  switchText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  switchTextActive: {
    color: '#FFFFFF',
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  fractionPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  fractionPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  hintText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  comparisonBox: {
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 8,
  },
  comparisonTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  comparisonDesc: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
});
