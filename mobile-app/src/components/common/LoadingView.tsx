import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Image, Animated } from 'react-native';
import { Text } from './Text';

const logoSource = require('../../assets/images/logo.webp');

export interface LoadingViewProps {
  message?: string;
  subtitle?: string;
  fullScreen?: boolean;
}

export const LoadingView: React.FC<LoadingViewProps> = ({
  message = 'Loading...',
  subtitle = 'MasterHRMS Cloud Sync',
  fullScreen = true,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.98,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      {/* Ambient background glows matching Login theme */}
      <View style={styles.mintGlow} pointerEvents="none" />
      <View style={styles.yellowGlow} pointerEvents="none" />

      <View style={styles.content}>
        {/* Animated Brand Logo */}
        <Animated.View style={[styles.logoWrapper, { transform: [{ scale: pulseAnim }] }]}>
          <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
        </Animated.View>

        {/* Custom Themed Activity Spinner */}
        <View style={styles.spinnerWrapper}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>

        {/* Status Message */}
        {message ? <Text style={styles.messageText}>{message}</Text> : null}
        {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAF8',
    position: 'relative',
    overflow: 'hidden',
    padding: 24,
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  mintGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(187, 247, 208, 0.45)',
  },
  yellowGlow: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(254, 240, 138, 0.35)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
  },
  logoWrapper: {
    marginBottom: 28,
    alignItems: 'center',
  },
  logoImage: {
    width: 170,
    height: 48,
  },
  spinnerWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
});
