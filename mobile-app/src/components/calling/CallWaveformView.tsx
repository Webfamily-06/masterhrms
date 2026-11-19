import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface CallWaveformViewProps {
  isActive?: boolean;
  barCount?: number;
  color?: string;
  maxHeight?: number;
}

export const CallWaveformView: React.FC<CallWaveformViewProps> = ({
  isActive = true,
  barCount = 18,
  color = '#6366F1',
  maxHeight = 36,
}) => {
  const animations = useRef<Animated.Value[]>(
    Array.from({ length: barCount }, () => new Animated.Value(0.2))
  ).current;

  useEffect(() => {
    if (!isActive) {
      animations.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 0.2,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    const loops = animations.map((anim, index) => {
      const randomDelay = (index % 4) * 120;
      const duration = 400 + ((index * 70) % 500);

      const animSequence = Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.3 + Math.random() * 0.7,
          duration,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0.15 + Math.random() * 0.25,
          duration: duration * 0.9,
          useNativeDriver: false,
        }),
      ]);

      const loop = Animated.loop(animSequence);
      const timer = setTimeout(() => loop.start(), randomDelay);
      return { loop, timer };
    });

    return () => {
      loops.forEach(({ loop, timer }) => {
        clearTimeout(timer);
        loop.stop();
      });
    };
  }, [isActive, animations, barCount]);

  return (
    <View style={styles.container}>
      {animations.map((anim, i) => {
        const height = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [6, maxHeight],
        });

        // Alternating purple to blue accent colors
        const barColor = i % 2 === 0 ? color : '#3B82F6';

        return (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                height,
                backgroundColor: barColor,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 4,
    paddingHorizontal: 16,
  },
  bar: {
    width: 3.5,
    borderRadius: 3,
  },
});
