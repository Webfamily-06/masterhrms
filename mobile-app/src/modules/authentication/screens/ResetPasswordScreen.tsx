import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { AlertCircle, Check, Circle } from 'lucide-react-native';
import { AuthService } from '../../../core/auth/authService';
import { NavigationProp, RouteProps } from '../../../types/navigation.types';
import { useNavigation, useRoute } from '@react-navigation/native';

const logoSource = require('../../../assets/images/logo.webp');
const lockIcon = require('../../../assets/images/lock.png');
const eyeIcon = require('../../../assets/images/eye.png');
const eyeOffIcon = require('../../../assets/images/eye-off.png');
const arrowLeftIcon = require('../../../assets/images/arrow-left.png');

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'ResetPassword'>>();
  const route = useRoute<RouteProps<'ResetPassword'>>();

  const email = route.params?.email || '';
  const initialToken = route.params?.token;
  const initialCode = route.params?.code;

  // If valid reset token was supplied from email link, start at new_password step
  const [step, setStep] = useState<'otp' | 'new_password'>(
    initialToken && initialToken.length > 10 ? 'new_password' : 'otp'
  );

  const [otpCode, setOtpCode] = useState(initialCode || '');
  const [verifiedToken, setVerifiedToken] = useState(initialToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);

  const otpInputRef = useRef<any>(null);

  // 30-second resend countdown timer
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

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);

    try {
      const res = await AuthService.forgotPassword(email);
      setCooldown(30);
      if (res.previewCode) {
        setOtpCode(res.previewCode);
      }
      Alert.alert('Code Dispatched', 'A fresh 6-digit verification code has been dispatched to your email.');
    } catch (err: any) {
      const msg = err?.message || 'Failed to resend code. Please try again.';
      setError(msg);
      Alert.alert('Resend Failed', msg);
    } finally {
      setResending(false);
    }
  };

  // Step 1: Validate OTP code
  const handleVerifyOtp = async () => {
    const cleanCode = otpCode.trim();
    if (cleanCode.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      Alert.alert('Incomplete Code', 'Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await AuthService.verifyResetOtp({
        email,
        code: cleanCode,
      });

      if (result.resetToken) {
        setVerifiedToken(result.resetToken);
      }

      Alert.alert(
        'Code Verified',
        'Verification code confirmed successfully. Please set your new password.',
        [
          {
            text: 'Continue',
            onPress: () => {
              setError(null);
              setStep('new_password');
            },
          },
        ]
      );
      setStep('new_password');
    } catch (err: any) {
      const errorMsg =
        err?.message || 'Invalid or expired verification code. Please check and try again.';
      setError(errorMsg);
      Alert.alert('Invalid Verification Code', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Set New Password
  const handleUpdatePassword = async () => {
    if (!newPassword) {
      setError('Please enter a new password.');
      Alert.alert('Required Field', 'Please enter a new password.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      Alert.alert('Password Too Short', 'Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New Password and Confirm Password do not match.');
      Alert.alert(
        'Password Mismatch',
        'New Password and Confirm Password do not match. Please ensure both passwords match.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await AuthService.resetPassword({
        email,
        token: verifiedToken || undefined,
        code: !verifiedToken ? otpCode : undefined,
        newPassword,
      });

      Alert.alert(
        'Password Reset Successful',
        'Your password has been successfully updated in your account. You can now sign in with your new credentials.',
        [
          {
            text: 'Sign In Now',
            onPress: () => navigation.navigate('Login', {}),
          },
        ]
      );
    } catch (err: any) {
      const errorMsg =
        err?.message || 'Password update failed. The reset session may have expired.';
      setError(errorMsg);
      Alert.alert('Update Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const digits = otpCode.padEnd(6, ' ').split('').slice(0, 6);

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
              if (step === 'new_password' && !initialToken) {
                setStep('otp');
              } else if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Login', {});
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Back"
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
            {step === 'otp' ? 'Enter Verification Code' : 'Set New Password'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'otp'
              ? 'Enter the 6-digit verification code dispatched to your registered email'
              : 'Choose a strong, secure password to protect your account'}
          </Text>
          {email ? (
            <View style={styles.emailBadge}>
              <Text style={styles.emailBadgeText}>{email}</Text>
            </View>
          ) : null}
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={15} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── STEP 1: OTP VERIFICATION UI ──────────────────────── */}
        {step === 'otp' ? (
          <View style={styles.formContainer}>
            {/* 6-Digit OTP Box Grid */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => otpInputRef.current?.focus()}
              style={styles.otpBoxesRow}
            >
              {digits.map((digit, index) => {
                const isFilled = digit.trim().length > 0;
                const isCurrent = index === otpCode.length;
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

            {/* Hidden Input for Keyboard */}
            <TextInput
              ref={otpInputRef}
              style={styles.hiddenInput}
              value={otpCode}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                setOtpCode(cleaned);
                if (error) setError(null);
              }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleVerifyOtp}
            />

            {/* Resend Cooldown Section */}
            <View style={styles.resendContainer}>
              {cooldown > 0 ? (
                <Text style={styles.resendCooldownText}>
                  Resend code in <Text style={styles.cooldownNumber}>{cooldown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResendOtp}
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

            {/* Verify Code Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                (loading || otpCode.length < 6) && styles.actionButtonDisabled,
              ]}
              onPress={handleVerifyOtp}
              disabled={loading || otpCode.length < 6}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Verify Code"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Verify Code & Continue →</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* ── STEP 2: NEW PASSWORD SETUP UI ───────────────────── */
          <View style={styles.formContainer}>
            {/* New Password Input */}
            <View style={styles.inputPill}>
              <View style={styles.iconContainer}>
                <Image source={lockIcon} style={styles.inputIcon} resizeMode="contain" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="New Password (min 8 chars)"
                placeholderTextColor="#9CA3AF"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (error) setError(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.visibilityToggle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Image
                  source={showPassword ? eyeOffIcon : eyeIcon}
                  style={styles.visibilityIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputPill}>
              <View style={styles.iconContainer}>
                <Image source={lockIcon} style={styles.inputIcon} resizeMode="contain" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (error) setError(null);
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleUpdatePassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                style={styles.visibilityToggle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <Image
                  source={showConfirmPassword ? eyeOffIcon : eyeIcon}
                  style={styles.visibilityIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Password Validation Indicators */}
            {newPassword.length > 0 ? (
              <View style={styles.criteriaContainer}>
                <View style={styles.criteriaRow}>
                  {newPassword.length >= 8 ? (
                    <Check size={14} color="#059669" strokeWidth={2.4} style={{ marginRight: 6 }} />
                  ) : (
                    <Circle size={14} color="#94A3B8" strokeWidth={1.8} style={{ marginRight: 6 }} />
                  )}
                  <Text style={[styles.criteriaText, newPassword.length >= 8 && styles.criteriaTextValid]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.criteriaRow}>
                  {/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? (
                    <Check size={14} color="#059669" strokeWidth={2.4} style={{ marginRight: 6 }} />
                  ) : (
                    <Circle size={14} color="#94A3B8" strokeWidth={1.8} style={{ marginRight: 6 }} />
                  )}
                  <Text
                    style={[
                      styles.criteriaText,
                      /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && styles.criteriaTextValid,
                    ]}
                  >
                    Uppercase & lowercase letters
                  </Text>
                </View>
                {confirmPassword.length > 0 ? (
                  <View style={styles.criteriaRow}>
                    {newPassword === confirmPassword ? (
                      <Check size={14} color="#059669" strokeWidth={2.4} style={{ marginRight: 6 }} />
                    ) : (
                      <Circle size={14} color="#94A3B8" strokeWidth={1.8} style={{ marginRight: 6 }} />
                    )}
                    <Text
                      style={[
                        styles.criteriaText,
                        newPassword === confirmPassword && styles.criteriaTextValid,
                      ]}
                    >
                      {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                (loading || newPassword.length < 8 || newPassword !== confirmPassword) &&
                  styles.actionButtonDisabled,
              ]}
              onPress={handleUpdatePassword}
              disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Update Password & Sign In"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Save New Password & Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Organization Guidance Notice */}
        <View style={styles.orgGuidanceContainer}>
          <Text style={styles.orgGuidanceText}>
            If you need assistance resetting your password, please contact your Organization Administrator.
          </Text>
        </View>

        {/* Back to sign in link */}
        <View style={styles.backToLoginRow}>
          <TouchableOpacity
            style={styles.backToLoginTouch}
            onPress={() => navigation.navigate('Login', {})}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.backToLoginText}>← Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
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
    shadowOpacity: 0.08,
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
    marginTop: 6,
    marginBottom: 14,
  },
  logoImage: {
    width: 170,
    height: 48,
  },
  headingSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
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
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    marginVertical: 14,
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
    marginVertical: 10,
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
  inputPill: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputIcon: {
    width: 20,
    height: 20,
    tintColor: '#64748B',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#0F172A',
  },
  visibilityToggle: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibilityIcon: {
    width: 20,
    height: 20,
    tintColor: '#64748B',
  },
  criteriaContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 6,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  criteriaIcon: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
  },
  criteriaIconValid: {
    color: '#16A34A',
  },
  criteriaText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  criteriaTextValid: {
    color: '#16A34A',
    fontWeight: '600',
  },
  actionButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
    alignItems: 'center',
    marginTop: 20,
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
    marginTop: 24,
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
