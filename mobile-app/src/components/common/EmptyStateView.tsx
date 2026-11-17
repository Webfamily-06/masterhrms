import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { FolderOpen } from 'lucide-react-native';
import { Text } from './Text';

export interface EmptyStateViewProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionTitle?: string;
  onActionPress?: () => void;
  secondaryActionTitle?: string;
  onSecondaryActionPress?: () => void;
  fullScreen?: boolean;
}

export const EmptyStateView: React.FC<EmptyStateViewProps> = ({
  title = 'No Records Found',
  description = 'There is currently no data or activity to display in this view.',
  icon,
  actionTitle,
  onActionPress,
  secondaryActionTitle,
  onSecondaryActionPress,
  fullScreen = true,
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      {/* Ambient background glows matching Login theme */}
      <View style={styles.mintGlow} pointerEvents="none" />
      <View style={styles.yellowGlow} pointerEvents="none" />

      <View style={styles.content}>
        {/* Icon Card Badge */}
        <View style={styles.iconCircle}>
          {icon || <FolderOpen size={36} color="#059669" strokeWidth={1.8} />}
        </View>

        {/* Title & Description */}
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.descriptionText}>{description}</Text>

        {/* Action Button */}
        {actionTitle && onActionPress ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onActionPress}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>{actionTitle}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Secondary Action Link */}
        {secondaryActionTitle && onSecondaryActionPress ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onSecondaryActionPress}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>{secondaryActionTitle}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAF8',
    position: 'relative',
    overflow: 'hidden',
    padding: 28,
  },
  fullScreen: {
    flex: 1,
    minHeight: 400,
  },
  mintGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(187, 247, 208, 0.40)',
  },
  yellowGlow: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(254, 240, 138, 0.30)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 320,
    width: '100%',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
  },
});
