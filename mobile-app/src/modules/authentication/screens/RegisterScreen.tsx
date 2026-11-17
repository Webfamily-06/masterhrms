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
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { User, Building2 } from 'lucide-react-native';
import { AuthService } from '../../../core/auth/authService';
import { NavigationProp } from '../../../types/navigation.types';
import { useNavigation } from '@react-navigation/native';

const arrowLeftIcon = require('../../../assets/images/arrow-left.png');
const emailIcon = require('../../../assets/images/email.png');
const lockIcon = require('../../../assets/images/lock.png');
const eyeIcon = require('../../../assets/images/eye.png');
const eyeOffIcon = require('../../../assets/images/eye-off.png');
const googleIcon = require('../../../assets/images/google.png');
const facebookIcon = require('../../../assets/images/facebook.png');
const linkedinIcon = require('../../../assets/images/linkedin.png');
const appleIcon = require('../../../assets/images/apple.png');

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'Register'>>();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanCompany = companyName.trim();

    if (!cleanName || !cleanEmail || !password) {
      setError('Please fill in your name, email, and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await AuthService.register({
        fullName: cleanName,
        email: cleanEmail,
        password,
        companyName: cleanCompany || undefined,
      });

      Alert.alert(
        'Account Created',
        'Your registration was successful. Please log in with your credentials.',
        [{ text: 'Log In', onPress: () => navigation.navigate('Login', {}) }]
      );
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check details or contact HR.');
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
            accessibilityLabel="Back to Login"
          >
            <Image source={arrowLeftIcon} style={styles.backIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>Create Account</Text>
          <Text style={styles.subtitleText}>
            Sign up with your work email to access your workspace, attendance, and payroll records.
          </Text>
        </View>

        {/* Form Container */}
        <View style={styles.formCard}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Full Name */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <User size={18} color="#64748B" strokeWidth={2} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                if (error) setError(null);
              }}
              autoCapitalize="words"
            />
          </View>

          {/* Email Address */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Image source={emailIcon} style={styles.inputIcon} resizeMode="contain" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Company Name */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Building2 size={18} color="#64748B" strokeWidth={2} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Company / Workspace (Optional)"
              placeholderTextColor="#94A3B8"
              value={companyName}
              onChangeText={setCompanyName}
              autoCapitalize="words"
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Image source={lockIcon} style={styles.inputIcon} resizeMode="contain" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError(null);
              }}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Image
                source={showPassword ? eyeIcon : eyeOffIcon}
                style={styles.eyeIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create Account"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.createButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Already have account */}
          <TouchableOpacity
            style={styles.signInLink}
            onPress={() => navigation.navigate('Login', {})}
          >
            <Text style={styles.signInPrompt}>
              Already have an account? <Text style={styles.signInHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social SSO Badges */}
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

        {/* Footer Legal */}
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
    top: -60,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#D1FAE5',
    opacity: 0.6,
  },
  yellowGlow: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#FEF3C7',
    opacity: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: 'transparent',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    paddingHorizontal: 16,
    height: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 22,
  },
  inputIcon: {
    width: 18,
    height: 18,
    tintColor: '#94A3B8',
  },
  inputEmojiIcon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    height: '100%',
  },
  eyeButton: {
    padding: 8,
  },
  eyeIcon: {
    width: 20,
    height: 20,
    tintColor: '#64748B',
  },
  createButton: {
    backgroundColor: '#22C55E',
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signInLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  signInPrompt: {
    fontSize: 13,
    color: '#64748B',
  },
  signInHighlight: {
    color: '#1E293B',
    fontWeight: '700',
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
    fontSize: 12,
    color: '#94A3B8',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  socialImage: {
    width: 22,
    height: 22,
  },
  socialImageApple: {
    width: 20,
    height: 20,
    tintColor: '#000000',
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
    color: '#475569',
    fontWeight: '600',
  },
});
