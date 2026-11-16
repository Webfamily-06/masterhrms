import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../app/providers/ThemeProvider';
import { Text } from './Text';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const getContainerStyle = (): ViewStyle => {
    const sizeStyle =
      size === 'sm'
        ? { paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.md }
        : size === 'lg'
        ? { paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.xxl }
        : { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg };

    const variantStyle: ViewStyle =
      variant === 'primary'
        ? { backgroundColor: theme.colors.primary }
        : variant === 'secondary'
        ? { backgroundColor: theme.colors.surfaceSecondary }
        : variant === 'outline'
        ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.border }
        : { backgroundColor: theme.colors.danger };

    return {
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      ...sizeStyle,
      ...variantStyle,
      opacity: disabled || loading ? 0.6 : 1,
    };
  };

  const getTextColor = (): string => {
    if (variant === 'primary' || variant === 'danger') {
      return '#FFFFFF';
    }
    if (variant === 'secondary') {
      return theme.colors.text;
    }
    return theme.colors.text;
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style as ViewStyle]}
      disabled={disabled || loading}
      activeOpacity={0.75}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <Text
          variant="button"
          style={{ color: getTextColor() }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};
