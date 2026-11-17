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
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { AuthService } from '../../../core/auth/authService';
import { NavigationProp, RouteProps } from '../../../types/navigation.types';
import { useNavigation, useRoute } from '@react-navigation/native';

const logoSource = require('../../../assets/images/logo.webp');
const emailIcon = require('../../../assets/images/email.png');
const arrowLeftIcon = require('../../../assets/images/arrow-left.png');

export const ForgotPasswordScreen: React.FC = () => {
  useTheme();
  const navigation = useNavigation<NavigationProp<'ForgotPassword'>>();
  const route = useRoute<RouteProps<'ForgotPassword'>>();

  const [email, setEmail] = useState(route.params?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your work email address.');
      Alert.alert('Required Field', 'Please enter your work email address to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await AuthService.forgotPassword(cleanEmail);
      let tokenFromUrl: string | undefined;
      if (response && (response as any).resetUrl) {
        const match = (response as any).resetUrl.match(/token=([a-f0-9]+)/i);
        if (match && match[1]) {
          tokenFromUrl = match[1];
        }
      }

      Alert.alert(
        'Verification Code Sent',
        `A 6-digit verification code has been dispatched to ${cleanEmail}. Please enter the code to reset your password.`,
        [
          {
            text: 'Continue',
            onPress: () => {
              navigation.navigate('ResetPassword', {
                email: cleanEmail,
                token: tokenFromUrl,
                code: (response as any).previewCode,
              });
            },
          },
        ]
      );
    } catch (err: any) {
      const errorMsg =
        err?.message ||
        'No account found with this email address. Please enter a valid registered work email or contact your administrator.';
      setError(errorMsg);
      Alert.alert('Account Not Found', errorMsg);
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
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Enter your work email address to receive password reset instructions.
          </Text>
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
              returnKeyType="done"
              onSubmitEditing={handleSendCode}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.actionButton, loading && styles.actionButtonDisabled]}
            onPress={handleSendCode}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Send Reset Instructions"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.actionButtonText}>Send Reset Instructions</Text>
            )}
          </TouchableOpacity>

          {/* Organization Guidance Notice */}
          <View style={styles.orgGuidanceContainer}>
            <Text style={styles.orgGuidanceText}>
              If you cannot access your work email, please contact your Organization Administrator to obtain your login credentials.
            </Text>
          </View>

          {/* Back to sign in link */}
          <View style={styles.backToLoginRow}>
            <TouchableOpacity
              style={styles.backToLoginTouch}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Login', {});
                }
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.backToLoginText}>← Remember password? Sign In</Text>
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
    marginBottom: 20,
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
  actionButton: {
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
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
