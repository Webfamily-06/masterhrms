import React, { useState, useEffect, useMemo } from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Config } from '../../config/environment';

/**
 * Normalizes any raw avatar string or employee/user avatar field into a valid renderable image URI.
 * - Filters out non-avatar web icons (/favicon.webp, /favicon.ico, logo.webp, /ui-assets/)
 * - Preserves base64 data:image/* URIs
 * - Converts DiceBear /svg? endpoints to /png? for React Native <Image> compatibility
 * - Prefixes server upload paths with active API_BASE_URL
 * - Generates a deterministic DiceBear PNG avatar when fallbackSeed is provided
 */
export function resolveAvatarUrl(
  rawUrl?: string | null,
  fallbackSeed?: string | null
): string | null {
  if (rawUrl && typeof rawUrl === 'string') {
    let cleaned = rawUrl.trim();
    const lower = cleaned.toLowerCase();

    const isPlaceholderAsset =
      lower.includes('favicon.') ||
      lower.includes('logo.webp') ||
      lower.includes('apple-touch-icon') ||
      lower.startsWith('/ui-assets/');

    if (cleaned && !isPlaceholderAsset) {
      if (cleaned.startsWith('data:image/')) {
        return cleaned;
      }
      if (cleaned.includes('api.dicebear.com') && cleaned.includes('/svg')) {
        cleaned = cleaned.replace('/svg', '/png');
      }
      if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
        return cleaned;
      }
      if (cleaned.startsWith('/uploads/') || cleaned.startsWith('/api/')) {
        return `${Config.API_BASE_URL}${cleaned}`;
      }
      if (cleaned.startsWith('uploads/')) {
        return `${Config.API_BASE_URL}/${cleaned}`;
      }
    }
  }

  if (fallbackSeed && fallbackSeed.trim().length > 0) {
    const seed = encodeURIComponent(fallbackSeed.trim());
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  }

  return null;
}

/**
 * Extracts raw avatar URL from any user or employee object shape.
 */
export function extractRawAvatar(entity?: any): string | null {
  if (!entity) return null;
  return (
    entity.avatarUrl ||
    entity.profilePhotoUrl ||
    entity.photoUrl ||
    entity.avatar ||
    entity.profile?.avatarUrl ||
    entity.profile?.avatar ||
    entity.user?.profile?.avatarUrl ||
    entity.user?.avatarUrl ||
    null
  );
}

const AVATAR_PALETTE = [
  { bg: '#EEF2FF', text: '#4338CA' },
  { bg: '#ECFDF5', text: '#047857' },
  { bg: '#EFF6FF', text: '#1D4ED8' },
  { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#FCE7F3', text: '#BE185D' },
  { bg: '#F3E8FF', text: '#6D28D9' },
];

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || '').trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return source.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return 'U';
}

function getColorForSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export interface UserAvatarProps {
  uri?: string | null;
  entity?: any;
  name?: string | null;
  email?: string | null;
  size?: number;
  borderWidth?: number;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  uri,
  entity,
  name,
  email,
  size = 44,
  borderWidth = 0,
  borderColor = '#FFFFFF',
  style,
}) => {
  const effectiveName =
    name ||
    entity?.fullName ||
    entity?.profile?.fullName ||
    (entity?.firstName || entity?.lastName
      ? `${entity?.firstName || ''} ${entity?.lastName || ''}`.trim()
      : null);
  const effectiveEmail = email || entity?.email || entity?.profile?.email || null;
  const rawUri = uri !== undefined ? uri : extractRawAvatar(entity);
  const seed = effectiveName || effectiveEmail || 'MasterHRMS';

  const primaryUri = useMemo(() => resolveAvatarUrl(rawUri, seed), [rawUri, seed]);
  const generatedFallbackUri = useMemo(() => resolveAvatarUrl(null, seed), [seed]);

  const [stage, setStage] = useState<'primary' | 'generated' | 'initials'>('primary');

  useEffect(() => {
    setStage('primary');
  }, [primaryUri]);

  const initials = useMemo(
    () => getInitials(effectiveName, effectiveEmail),
    [effectiveName, effectiveEmail]
  );
  const palette = useMemo(() => getColorForSeed(seed), [seed]);

  const activeUri =
    stage === 'primary'
      ? primaryUri
      : stage === 'generated'
      ? generatedFallbackUri
      : null;

  const radius = size / 2;

  return (
    <View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: palette.bg,
          borderWidth,
          borderColor,
        },
        style,
      ]}
    >
      {activeUri ? (
        <Image
          source={{ uri: activeUri }}
          style={{ width: '100%', height: '100%', borderRadius: radius }}
          resizeMode="cover"
          onError={() => {
            if (stage === 'primary' && generatedFallbackUri && primaryUri !== generatedFallbackUri) {
              setStage('generated');
            } else {
              setStage('initials');
            }
          }}
        />
      ) : (
        <Text
          style={{
            fontSize: Math.max(11, Math.round(size * 0.36)),
            fontWeight: '800',
            color: palette.text,
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
