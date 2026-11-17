import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { Text } from './Text';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Basic network ping check or NetInfo listener
    const checkConnection = async () => {
      try {
        // Simple heartbeat check
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        await fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors',
        });
        clearTimeout(timeoutId);
        setIsOffline(false);
      } catch {
        // If fetch fails in dev environment without internet, remain quiet unless deliberate
      }
    };

    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <WifiOff size={14} color="#92400E" strokeWidth={2.2} style={styles.icon} />
      <Text style={styles.text}>Offline Mode — Showing cached records</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
  },
});
