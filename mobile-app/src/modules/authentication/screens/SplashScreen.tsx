import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Image,
  StatusBar,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';
import { useAuthStore } from '../../../store/authStore';
import { localStorage } from '../../../core/storage/localStorage';
import { STORAGE_KEYS } from '../../../config/constants';

const logoSource = require('../../../assets/images/logo.webp');

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'Splash'>>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(async () => {
      if (!isAuthenticated) {
        const hasSeenOnboarding = await localStorage.getItemAsync(
          STORAGE_KEYS.HAS_SEEN_ONBOARDING
        );
        if (!hasSeenOnboarding) {
          (navigation as any).navigate('Onboarding');
        } else {
          navigation.navigate('Login', {});
        }
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, glowAnim, isAuthenticated, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Decorative Glow Elements */}
      <Animated.View
        style={[
          styles.glowCircleTop,
          {
            opacity: glowAnim,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.glowCircleBottom,
          {
            opacity: glowAnim,
          },
        ]}
      />

      {/* Center Branding */}
      <Animated.View
        style={[
          styles.brandContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoBadge}>
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.appTitle}>MasterHRMS</Text>
        <Text style={styles.tagline}>Smart People & Workforce Platform</Text>

        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </Animated.View>

      {/* Footer Version */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Secure Enterprise Edition • v2.4.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowCircleTop: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
  },
  glowCircleBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  brandContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoBadge: {
    width: 110,
    height: 110,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 24,
  },
  logo: {
    width: 72,
    height: 72,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#34D399',
  },
  footer: {
    position: 'absolute',
    bottom: 36,
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
  },
});
