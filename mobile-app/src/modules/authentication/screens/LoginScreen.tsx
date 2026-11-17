import React, { useState } from 'react';
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
import { NavigationProp } from '../../../types/navigation.types';
import { useNavigation } from '@react-navigation/native';

const logoSource = require('../../../assets/images/logo.webp');
const emailIcon = require('../../../assets/images/email.png');
const lockIcon = require('../../../assets/images/lock.png');
const eyeIcon = require('../../../assets/images/eye.png');
const eyeOffIcon = require('../../../assets/images/eye-off.png');
const arrowLeftIcon = require('../../../assets/images/arrow-left.png');
const googleIcon = require('../../../assets/images/google.png');
const facebookIcon = require('../../../assets/images/facebook.png');
const linkedinIcon = require('../../../assets/images/linkedin.png');
const appleIcon = require('../../../assets/images/apple.png');

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'Login'>>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('Work email and password are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await AuthService.login({
        email: cleanEmail,
        password,
      });

      if ('requires2FA' in result && result.requires2FA) {
        navigation.navigate('TwoFactorVerify', {
          mfaToken: result.mfaToken,
          email: result.email,
          maskedEmail: result.maskedEmail,
          isSetup: result.isSetup,
        });
      }
      // Direct login triggers RootNavigator session switch
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
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
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
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
          <Image
            source={logoSource}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Header Typography */}
        <View style={styles.headingSection}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in with your work email to access your workspace, attendance, and payroll records.
          </Text>
        </View>

        {/* Error Notification */}
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={15} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputPill}>
            <View style={styles.iconContainer}>
              <Image source={emailIcon} style={styles.inputIcon} resizeMode="contain" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputPill}>
            <View style={styles.iconContainer}>
              <Image source={lockIcon} style={styles.inputIcon} resizeMode="contain" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
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

          {/* Forgot Password Link */}
          <View style={styles.forgotPasswordRow}>
            <TouchableOpacity
              style={styles.forgotPasswordTouch}
              onPress={() => navigation.navigate('ForgotPassword', { email })}
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Log In Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Log In"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          {/* Organization Contact Guidance Notice */}
          <View style={styles.orgGuidanceContainer}>
            <Text style={styles.orgGuidanceText}>
              Please contact your Organization Administrator to obtain your login credentials.
            </Text>
          </View>

          {/* Quick Demo Fill (Dev) */}
          {__DEV__ && (
            <View style={styles.quickFillContainer}>
              <Text style={styles.quickFillLabel}>Quick Fill (Dev):</Text>
              <View style={styles.quickFillRow}>
                <TouchableOpacity
                  style={styles.quickFillChip}
                  onPress={() => {
                    setEmail('hr@masterhrms.com');
                    setPassword('admin123');
                    if (error) setError(null);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.quickFillChipText}>HR Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickFillChip}
                  onPress={() => {
                    setEmail('employee@masterhrms.com');
                    setPassword('admin123');
                    if (error) setError(null);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.quickFillChipText}>Employee</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* New Workspace Registration */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => (navigation as any).navigate('Register')}
          >
            <Text style={styles.registerLinkText}>
              Create New Workspace / Account →
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social / SSO Auth Badges */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.75}>
              <Image source={googleIcon} style={styles.socialImage} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.75}>
              <Image source={appleIcon} style={styles.socialImageApple} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.75}>
              <Image source={facebookIcon} style={styles.socialImage} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.75}>
              <Image source={linkedinIcon} style={styles.socialImage} resizeMode="contain" />
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
  forgotPasswordRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 18,
    paddingRight: 2,
  },
  forgotPasswordTouch: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  forgotPasswordText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0D9488',
    lineHeight: 18,
  },
  loginButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orgGuidanceContainer: {
    marginTop: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  orgGuidanceText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 10,
  },
  registerLinkText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12.5,
    color: '#94A3B8',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  socialImage: {
    width: 24,
    height: 24,
  },
  socialImageApple: {
    width: 20,
    height: 20,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
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
  quickFillContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  quickFillLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 6,
    fontWeight: '500',
  },
  quickFillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickFillChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickFillChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
});
