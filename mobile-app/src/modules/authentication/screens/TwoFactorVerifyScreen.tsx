import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { AlertCircle } from 'lucide-react-native';
import { AuthService } from '../../../core/auth/authService';
import { NavigationProp, RouteProps } from '../../../types/navigation.types';
import { useNavigation, useRoute } from '@react-navigation/native';

const logoSource = require('../../../assets/images/logo.webp');
const arrowLeftIcon = require('../../../assets/images/arrow-left.png');

export const TwoFactorVerifyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'TwoFactorVerify'>>();
  const route = useRoute<RouteProps<'TwoFactorVerify'>>();

  const { mfaToken, maskedEmail, isSetup } = route.params;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);

  const inputRef = useRef<any>(null);

  // 30-second resend countdown timer (matches backend checkResendEligibility)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleVerify = async () => {
    const cleanCode = code.trim();
    if (cleanCode.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await AuthService.verify2Fa(mfaToken, cleanCode);
      // On success, session is stored in authStore, triggering RootNavigator transition to App
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError(null);

    try {
      const res = await AuthService.resend2Fa(mfaToken);
      setCooldown(res.cooldownSeconds || 30);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const digits = code.padEnd(6, ' ').split('').slice(0, 6);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Ambient background glows */}
      <View style={styles.mintGlow} pointerEvents="none" />
      <View style={styles.yellowGlow} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar with back button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Login', {});
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Back to Sign In"
          >
            <Image source={arrowLeftIcon} style={styles.backIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {/* Brand Section: Company Logo */}
        <View style={styles.brandContainer}>
          <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
        </View>

        {/* Header Section */}
        <View style={styles.headingSection}>
          <Text style={styles.title}>
            {isSetup ? 'Setup Two-Factor Auth' : 'Security Verification'}
          </Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit authentication code sent to
          </Text>
          <View style={styles.emailBadge}>
            <Text style={styles.emailBadgeText}>{maskedEmail || 'your registered work email'}</Text>
          </View>
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={15} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* OTP Cells Container */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={styles.otpBoxesRow}
          >
            {digits.map((digit, index) => {
              const isFilled = digit.trim().length > 0;
              const isCurrent = index === code.length;
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    isFilled && styles.otpBoxFilled,
                    isCurrent && styles.otpBoxActive,
                    error ? styles.otpBoxError : null,
                  ]}
                >
                  <Text style={styles.otpDigit}>{isFilled ? digit : ''}</Text>
                </View>
              );
            })}
          </TouchableOpacity>

          {/* Hidden Actual Input */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
              setCode(cleaned);
              if (error) setError(null);
            }}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleVerify}
          />

          {/* Resend Row */}
          <View style={styles.resendContainer}>
            {cooldown > 0 ? (
              <Text style={styles.resendCooldownText}>
                Resend code in <Text style={styles.cooldownNumber}>{cooldown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={resending}
                style={styles.resendTouch}
                activeOpacity={0.7}
              >
                <Text style={styles.resendActionText}>
                  {resending ? 'Sending Code...' : 'Resend Verification Code'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (loading || code.length < 6) && styles.verifyButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={loading || code.length < 6}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Verify Code"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify & Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Organization Contact Guidance Notice */}
          <View style={styles.orgGuidanceContainer}>
            <Text style={styles.orgGuidanceText}>
              Having trouble receiving your code? Contact your Organization Administrator for assistance.
            </Text>
          </View>

          {/* Back to Login Link */}
          <View style={styles.backToLoginRow}>
            <TouchableOpacity
              style={styles.backToLoginTouch}
              onPress={() => navigation.navigate('Login', {})}
              activeOpacity={0.7}
            >
              <Text style={styles.backToLoginText}>← Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Legal Terms */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing to use MasterHRMS, you agree to our{'\n'}
            <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  mintGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(187, 247, 208, 0.45)',
  },
  yellowGlow: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(254, 240, 138, 0.35)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  backIcon: {
    width: 18,
    height: 18,
    tintColor: '#0F172A',
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  logoImage: {
    width: 180,
    height: 52,
  },
  headingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  emailBadge: {
    marginTop: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  emailBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    marginVertical: 16,
  },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  otpBoxFilled: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  otpBoxActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 1.04 }],
  },
  otpBoxError: {
    borderColor: '#EF4444',
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  resendContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },
  resendCooldownText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  cooldownNumber: {
    fontWeight: '700',
    color: '#64748B',
  },
  resendTouch: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendActionText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0D9488',
  },
  verifyButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  verifyButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  orgGuidanceContainer: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  orgGuidanceText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
  },
  backToLoginRow: {
    marginTop: 18,
    alignItems: 'center',
  },
  backToLoginTouch: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backToLoginText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    color: '#64748B',
    fontWeight: '500',
  },
});
