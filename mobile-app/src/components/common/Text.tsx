import React from 'react';
import { Text as RNText, TextProps as RNTextProps, Platform } from 'react-native';
import { useTheme } from '../../app/providers/ThemeProvider';

export interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'bodyLarge' | 'body' | 'bodySmall' | 'caption' | 'button' | 'mono';
  color?: string;
  weight?: 'normal' | 'bold' | '500' | '600' | '700';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const Text: React.FC<TextProps> = ({
  children,
  style,
  variant = 'body',
  color,
  weight,
  align,
  ...props
}) => {
  const { theme } = useTheme();

  const variantStyle = theme.typography[variant] || theme.typography.body;
  const textColor = color || theme.colors.text;

  return (
    <RNText
      style={[
        Platform.OS === 'android' ? { includeFontPadding: false } : null,
        variantStyle,
        { color: textColor },
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};
