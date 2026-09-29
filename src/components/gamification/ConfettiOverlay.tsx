import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiOverlayProps {
  active: boolean;
  onComplete?: () => void;
}

const COLORS = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
const PARTICLE_COUNT = 36;

export const ConfettiOverlay: React.FC<ConfettiOverlayProps> = ({ active, onComplete }) => {
  const animations = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      animY: new Animated.Value(-20),
      animX: new Animated.Value(0),
      animRotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
      startX: Math.random() * SCREEN_WIDTH,
      driftX: (Math.random() - 0.5) * 160,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.floor(Math.random() * 8) + 8,
      isCircle: Math.random() > 0.5
    }))
  ).current;

  useEffect(() => {
    if (active) {
      const animGroup = animations.map((p) => {
        p.animY.setValue(-20);
        p.animX.setValue(0);
        p.animRotate.setValue(0);
        p.opacity.setValue(1);

        const duration = 1800 + Math.random() * 800;

        return Animated.parallel([
          Animated.timing(p.animY, {
            toValue: SCREEN_HEIGHT * 0.85,
            duration,
            useNativeDriver: true
          }),
          Animated.timing(p.animX, {
            toValue: p.driftX,
            duration,
            useNativeDriver: true
          }),
          Animated.timing(p.animRotate, {
            toValue: 360 * (Math.random() > 0.5 ? 2 : -2),
            duration,
            useNativeDriver: true
          }),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration,
            delay: duration * 0.6,
            useNativeDriver: true
          })
        ]);
      });

      Animated.parallel(animGroup).start(() => {
        if (onComplete) onComplete();
      });
    }
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {animations.map((p, idx) => {
        const spin = p.animRotate.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg']
        });

        return (
          <Animated.View
            key={`confetti-${idx}`}
            style={{
              position: 'absolute',
              left: p.startX,
              top: 0,
              width: p.size,
              height: p.isCircle ? p.size : p.size * 1.5,
              borderRadius: p.isCircle ? p.size / 2 : 2,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [
                { translateY: p.animY },
                { translateX: p.animX },
                { rotate: spin }
              ]
            }}
          />
        );
      })}
    </View>
  );
};
