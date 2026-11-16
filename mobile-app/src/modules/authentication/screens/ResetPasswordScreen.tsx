import React, { useState } from 'react';
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
import { useTheme } from '../../../app/providers/ThemeProvider';
import { AuthService } from '../../../core/auth/authService';
import { NavigationProp, RouteProps } from '../../../types/navigation.types';
import { useNavigation, useRoute } from '@react-navigation/native';

const logoSource = require('../../../assets/images/logo.webp');
const lockIcon = require('../../../assets/images/lock.png');
const eyeIcon = require('../../../assets/images/eye.png');
const eyeOffIcon = require('../../../assets/images/eye-off.png');
const arrowLeftIcon = require('../../../assets/images/arrow-left.png');
const emailIcon = require('../../../assets/images/email.png');

export const ResetPasswordScreen: React.FC = () => {
  useTheme();
  const navigation = useNavigation<NavigationProp<'ResetPassword'>>();
  const route = useRoute<RouteProps<'ResetPassword'>>();

  const [email] = useState(route.params?.email || '');
  const [tokenOrCode, setTokenOrCode] = useState(
    route.params?.token || route.params?.code || ''
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (text: string) => {
    if (text.includes('token=')) {
      const match = text.match(/token=([a-f0-9]+)/i);
      if (match && match[1]) {
        setTokenOrCode(match[1]);
        if (error) setError(null);
        return;
      }
    }
    setTokenOrCode(text);
    if (error) setError(null);
  };

  const handleResetPassword = async () => {
    const cleanInput = tokenOrCode.trim();
    if (!cleanInput) {
      setError('Please enter the reset token or verification code.');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    const isToken = cleanInput.length > 10;

    try {
      await AuthService.resetPassword({
        email,
        token: isToken ? cleanInput : undefined,
        code: !isToken ? cleanInput : undefined,
        newPassword,
      });

      Alert.alert(
        'Password Reset Successful',
        'Your password has been updated. Please sign in with your new credentials.',
        [
          {
            text: 'Sign In',
            onPress: () => navigation.navigate('Login', {}),
          },
        ]
      );
    } catch (err: any) {
      setError(err?.message || 'Password reset failed. The link or code may be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

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
            onPress={() => navigation.navigate('Login', {})}
            accessibilityRole="button"
            accessibilityLabel="Back to Sign In"
          >
            <Image source={arrowLeftIcon} style={styles.backIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {/* Brand Section: Company Logo */}
        <View style={styles.brandContainer}>
          <Image
            source={logoSource}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Header Section */}
        <View style={styles.headingSection}>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Enter the verification code or reset token sent to your email to create your new password.
          </Text>
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Token / Code Input */}
          <View style={styles.inputPill}>
            <View style={styles.iconContainer}>
              <Image source={emailIcon} style={styles.inputIcon} resizeMode="contain" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Reset Token or Code"
              placeholderTextColor="#9CA3AF"
              value={tokenOrCode}
              onChangeText={handleInputChange}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

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
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleResetPassword}
            />
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.actionButton, loading && styles.actionButtonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Reset Password"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.actionButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          {/* Organization Guidance Notice */}
          <View style={styles.orgGuidanceContainer}>
            <Text style={styles.orgGuidanceText}>
              Please contact your Organization Administrator if you need your password reset directly.
            </Text>
          </View>

          {/* Back to sign in link */}
          <View style={styles.backToLoginRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login', {})}
              accessibilityRole="button"
            >
              <Text style={styles.backToLoginText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
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
    width: 20,
    height: 20,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  logoImage: {
    width: 200,
    height: 48,
  },
  headingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 310,
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
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orgGuidanceContainer: {
    marginTop: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  orgGuidanceText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  backToLoginRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  backToLoginText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
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
