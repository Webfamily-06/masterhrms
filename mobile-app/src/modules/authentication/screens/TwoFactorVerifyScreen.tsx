import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Text } from '../../../components/common/Text';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { AuthService } from '../../../core/auth/authService';
import { NavigationProp, RouteProps } from '../../../types/navigation.types';
import { useNavigation, useRoute } from '@react-navigation/native';

export const TwoFactorVerifyScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp<'TwoFactorVerify'>>();
  const route = useRoute<RouteProps<'TwoFactorVerify'>>();

  const { mfaToken, maskedEmail, isSetup } = route.params;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);

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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => navigation.navigate('Login', {})}
        >
          <Text variant="bodySmall" color={theme.colors.primary}>
            ← Back to Sign In
          </Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text variant="h2" style={styles.title}>
            {isSetup ? 'Setup Two-Factor Auth' : 'Security Verification'}
          </Text>
          <Text variant="body" color={theme.colors.textSecondary} align="center">
            Enter the 6-digit code sent to {maskedEmail || 'your registered email'}
          </Text>
        </View>

        <Card elevated style={styles.card}>
          <View style={styles.inputContainer}>
            <Text variant="caption" color={theme.colors.textSecondary} style={styles.inputLabel}>
              6-DIGIT VERIFICATION CODE
            </Text>
            <TextInput
              style={[
                styles.otpInput,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderColor: error ? theme.colors.danger : theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="123456"
              placeholderTextColor={theme.colors.textMuted}
              value={code}
              onChangeText={(text) => {
                setCode(text.replace(/[^0-9]/g, ''));
                if (error) setError(null);
              }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textAlign="center"
              onSubmitEditing={handleVerify}
            />
          </View>

          {error ? (
            <Text variant="bodySmall" color={theme.colors.danger} style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          <Button
            title="Verify Code"
            onPress={handleVerify}
            loading={loading}
            style={styles.button}
          />

          <View style={styles.resendRow}>
            {cooldown > 0 ? (
              <Text variant="bodySmall" color={theme.colors.textMuted}>
                Resend code in {cooldown}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                <Text variant="bodySmall" color={theme.colors.primary} weight="600">
                  {resending ? 'Sending...' : 'Resend Verification Code'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backRow: {
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    marginBottom: 6,
  },
  card: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
    textAlign: 'center',
  },
  otpInput: {
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: '700',
  },
  errorText: {
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 4,
  },
  resendRow: {
    marginTop: 20,
    alignItems: 'center',
  },
});
