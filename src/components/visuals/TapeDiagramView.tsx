import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { TapeDiagramData } from '../../types/visuals';

interface TapeDiagramViewProps {
  data: TapeDiagramData;
}

export const TapeDiagramView: React.FC<TapeDiagramViewProps> = ({ data }) => {
  const parts = data.parts || [];
  const BOX_WIDTH = 44;
  const BOX_HEIGHT = 32;
  const ROW_GAP = 14;
  const LABEL_WIDTH = 68;

  const maxBoxes = Math.max(...parts.map((p) => p.count || 1), 1);
  const svgWidth = LABEL_WIDTH + maxBoxes * (BOX_WIDTH + 4) + 20;
  const svgHeight = parts.length * (BOX_HEIGHT + ROW_GAP) + 10;

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>📊 {data.title || 'Tape Diagram Model'}</Text>
      <View style={styles.svgWrapper}>
        <Svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          {parts.map((part, rowIndex) => {
            const y = rowIndex * (BOX_HEIGHT + ROW_GAP) + 6;
            const fillColor = part.color || (rowIndex === 0 ? '#3B82F6' : '#EC4899');

            return (
              <G key={`row-${rowIndex}`}>
                {/* Row Label */}
                <SvgText
                  x={LABEL_WIDTH - 8}
                  y={y + BOX_HEIGHT / 2 + 5}
                  fontSize="12"
                  fontWeight="bold"
                  fill="#1E293B"
                  textAnchor="end"
                >
                  {part.label}
                </SvgText>

                {/* Boxes in Tape */}
                {Array.from({ length: part.count }).map((_, boxIndex) => {
                  const x = LABEL_WIDTH + boxIndex * (BOX_WIDTH + 4);
                  return (
                    <G key={`box-${rowIndex}-${boxIndex}`}>
                      <Rect
                        x={x}
                        y={y}
                        width={BOX_WIDTH}
                        height={BOX_HEIGHT}
                        rx="6"
                        fill={fillColor}
                        stroke="#0F172A"
                        strokeWidth="1.5"
                        fillOpacity="0.85"
                      />
                      {part.valuePerUnit ? (
                        <SvgText
                          x={x + BOX_WIDTH / 2}
                          y={y + BOX_HEIGHT / 2 + 4}
                          fontSize="11"
                          fontWeight="bold"
                          fill="#FFFFFF"
                          textAnchor="middle"
                        >
                          {String(part.valuePerUnit)}
                        </SvgText>
                      ) : null}
                    </G>
                  );
                })}
              </G>
            );
          })}
        </Svg>
      </View>
      <Text style={styles.footerNote}>
        💡 Notice: Each box represents an equal chunk. Compare the number of boxes!
      </Text>
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
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  footerNote: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
  }
});
