import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Line, Rect, Circle, Polygon, Text as SvgText, G } from 'react-native-svg';
import { BalanceScaleData } from '../../types/visuals';

interface BalanceScaleViewProps {
  data: BalanceScaleData;
}

export const BalanceScaleView: React.FC<BalanceScaleViewProps> = ({ data }) => {
  const initialLeftItems = data?.leftItems || [{ label: 'x', count: 2 }, { value: 4 }];
  const initialRightItems = data?.rightItems || [{ value: 10 }];

  // Calculate initial constant numbers for interactive subtraction
  const getNumericSum = (items: typeof initialLeftItems) =>
    items.reduce((sum, it) => sum + (it.value || 0), 0);

  const [leftConstant, setLeftConstant] = useState<number>(getNumericSum(initialLeftItems));
  const [rightConstant, setRightConstant] = useState<number>(getNumericSum(initialRightItems));
  const [subtractedCount, setSubtractedCount] = useState<number>(0);

  const leftVariableItem = initialLeftItems.find((it) => it.label);
  const varCount = leftVariableItem?.count || 2;
  const varLabel = leftVariableItem?.label || 'x';

  const title = data?.title || 'Algebra Balance Scale';
  const equation = data?.equation || `${varCount}${varLabel} + ${leftConstant} = ${rightConstant}`;

  const handleSubtractOne = () => {
    if (leftConstant > 0 && rightConstant > 0) {
      setLeftConstant((prev) => prev - 1);
      setRightConstant((prev) => prev - 1);
      setSubtractedCount((prev) => prev + 1);
    }
  };

  const handleReset = () => {
    setLeftConstant(getNumericSum(initialLeftItems));
    setRightConstant(getNumericSum(initialRightItems));
    setSubtractedCount(0);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>⚖️</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.equationBadge}>
          <Text style={styles.equationText}>
            {varCount}{varLabel} {leftConstant > 0 ? `+ ${leftConstant}` : ''} = {rightConstant}
          </Text>
        </View>
      </View>

      {/* SVG Pan Scale */}
      <View style={styles.svgWrapper}>
        <Svg width="100%" height={170} viewBox="0 0 340 170">
          {/* Fulcrum base (triangle) */}
          <Polygon points="170,100 150,150 190,150" fill="#64748B" stroke="#334155" strokeWidth="2" />
          <Rect x="135" y="148" width="70" height="8" rx="4" fill="#334155" />

          {/* Pivot circle */}
          <Circle cx="170" cy="100" r="5" fill="#0F172A" />

          {/* Balance beam */}
          <Line x1="45" y1="95" x2="295" y2="95" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />

          {/* Left Pan strings & plate */}
          <Line x1="45" y1="95" x2="25" y2="128" stroke="#94A3B8" strokeWidth="1.5" />
          <Line x1="45" y1="95" x2="95" y2="128" stroke="#94A3B8" strokeWidth="1.5" />
          <Line x1="20" y1="128" x2="100" y2="128" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />

          {/* Right Pan strings & plate */}
          <Line x1="295" y1="95" x2="245" y2="128" stroke="#94A3B8" strokeWidth="1.5" />
          <Line x1="295" y1="95" x2="315" y2="128" stroke="#94A3B8" strokeWidth="1.5" />
          <Line x1="240" y1="128" x2="320" y2="128" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />

          {/* Left Pan Items */}
          {/* Variable boxes (e.g. x) */}
          {Array.from({ length: Math.min(varCount, 3) }).map((_, idx) => (
            <G key={`var-${idx}`}>
              <Rect
                x={25 + idx * 24}
                y={104}
                width={22}
                height={22}
                rx={4}
                fill="#6366F1"
                stroke="#4338CA"
                strokeWidth="1.5"
              />
              <SvgText
                x={25 + idx * 24 + 11}
                y={119}
                fontSize="12"
                fontWeight="bold"
                fill="#FFFFFF"
                textAnchor="middle"
              >
                {varLabel}
              </SvgText>
            </G>
          ))}

          {/* Left constant chip */}
          {leftConstant > 0 && (
            <G>
              <Circle cx="85" cy="115" r="10" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
              <SvgText x="85" y="119" fontSize="11" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
                +{leftConstant}
              </SvgText>
            </G>
          )}

          {/* Right Pan Item: Constant count / weight */}
          <G>
            <Rect x="260" y="100" width="40" height="26" rx="6" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
            <SvgText x="280" y="117" fontSize="13" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
              {rightConstant}
            </SvgText>
          </G>
        </Svg>
      </View>

      {/* Interactive Controls */}
      <View style={styles.controlRow}>
        <TouchableOpacity
          style={[styles.actionBtn, leftConstant === 0 && styles.disabledBtn]}
          onPress={handleSubtractOne}
          disabled={leftConstant === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>➖ Take 1 from both sides</Text>
        </TouchableOpacity>

        {subtractedCount > 0 && (
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
            <Text style={styles.resetBtnText}>↺ Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Educational Hint Callout */}
      <Text style={styles.footerNote}>
        💡 {leftConstant > 0
          ? `Rule of Equality: Whatever you subtract from the left pan, you must also subtract from the right pan!`
          : `All constants cleared! Now divide the remaining right pan (${rightConstant}) by ${varCount} to solve for ${varLabel}!`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    padding: 12,
    marginVertical: 8,
    shadowColor: '#4F46E5',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  equationBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  equationText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4338CA',
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 4,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  resetBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  resetBtnText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 6,
    lineHeight: 15,
  },
});
