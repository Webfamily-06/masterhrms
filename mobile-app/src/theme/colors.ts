export const BrandColors = {
  primary: '#FF6B00', // MasterHRMS Signature Orange
  primaryDark: '#D95A00',
  primaryLight: '#FFF2EB',
  secondary: '#0F172A', // Slate 900
  secondaryLight: '#1E293B',
  accent: '#3B82F6', // Blue 500
};

export const SemanticColors = {
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  info: '#3B82F6',
  infoLight: '#EFF6FF',
};

export const LightPalette = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  icon: '#475569',
  card: '#FFFFFF',
  ...BrandColors,
  ...SemanticColors,
};

export const DarkPalette = {
  background: '#0B0F19',
  surface: '#111827',
  surfaceSecondary: '#1F2937',
  border: '#374151',
  borderLight: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  icon: '#9CA3AF',
  card: '#111827',
  ...BrandColors,
  primaryLight: '#2C1D14',
  ...SemanticColors,
  successLight: '#064E3B',
  warningLight: '#78350F',
  dangerLight: '#7F1D1D',
  infoLight: '#1E3A8A',
};
