import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Path, Text as SvgText, G } from 'react-native-svg';
import { NumberLineData } from '../../types/visuals';

interface NumberLineViewProps {
  data: NumberLineData;
}

export const NumberLineView: React.FC<NumberLineViewProps> = ({ data }) => {
  const min = data.min ?? -5;
  const max = data.max ?? 5;
  const range = max - min || 10;

  const SVG_WIDTH = 320;
  const SVG_HEIGHT = 90;
  const PADDING = 24;
  const LINE_Y = 55;
  const USABLE_WIDTH = SVG_WIDTH - PADDING * 2;

  const getX = (val: number) => {
    return PADDING + ((val - min) / range) * USABLE_WIDTH;
  };

  // Generate integer ticks
  const ticks = [];
  for (let i = min; i <= max; i++) {
    ticks.push(i);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>📏 Interactive Number Line</Text>
      <View style={styles.svgWrapper}>
        <Svg width="100%" height={SVG_HEIGHT} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}>
          {/* Main Axis Line */}
          <Line
            x1={PADDING - 10}
            y1={LINE_Y}
            x2={SVG_WIDTH - PADDING + 10}
            y2={LINE_Y}
            stroke="#1E293B"
            strokeWidth="2.5"
          />

          {/* Ticks and Numbers */}
          {ticks.map((tick) => {
            const x = getX(tick);
            const isZero = tick === 0;
            return (
              <G key={`tick-${tick}`}>
                <Line
                  x1={x}
                  y1={LINE_Y - (isZero ? 8 : 5)}
                  x2={x}
                  y2={LINE_Y + (isZero ? 8 : 5)}
                  stroke={isZero ? '#DC2626' : '#64748B'}
                  strokeWidth={isZero ? '2.5' : '1.5'}
                />
                <SvgText
                  x={x}
                  y={LINE_Y + 18}
                  fontSize="10"
                  fontWeight={isZero ? 'bold' : 'normal'}
                  fill={isZero ? '#DC2626' : '#334155'}
                  textAnchor="middle"
                >
                  {tick}
                </SvgText>
              </G>
            );
          })}

          {/* Jumps (Curved Arcs) */}
          {(data.jumps || []).map((jump, idx) => {
            const x1 = getX(jump.from);
            const x2 = getX(jump.to);
            const midX = (x1 + x2) / 2;
            const arcY = LINE_Y - 24;
            const color = jump.color || '#3B82F6';

            return (
              <G key={`jump-${idx}`}>
                <Path
                  d={`M ${x1} ${LINE_Y - 4} Q ${midX} ${arcY} ${x2} ${LINE_Y - 4}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeDasharray="3,3"
                />
                <Circle cx={x2} cy={LINE_Y} r="4" fill={color} />
                <SvgText
                  x={midX}
                  y={arcY - 4}
                  fontSize="10"
                  fontWeight="bold"
                  fill={color}
                  textAnchor="middle"
                >
                  {jump.label}
                </SvgText>
              </G>
            );
          })}

          {/* Highlight Points */}
          {(data.points || []).map((pt, idx) => {
            const x = getX(pt.value);
            const color = pt.color || '#10B981';
            return (
              <G key={`pt-${idx}`}>
                <Circle cx={x} cy={LINE_Y} r="5" fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
                {pt.label ? (
                  <SvgText
                    x={x}
                    y={LINE_Y - 12}
                    fontSize="9"
                    fontWeight="bold"
                    fill={color}
                    textAnchor="middle"
                  >
                    {pt.label}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </Svg>
      </View>
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
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});
