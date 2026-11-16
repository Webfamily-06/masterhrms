import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Text } from '../../components/common/Text';
import { useAuthStore } from '../../store/authStore';
import {
  CanonicalRole,
  CANONICAL_ROLE_DESCRIPTORS,
} from '../../types/roles.types';

export const PersonaSwitcher: React.FC = () => {
  const activeRole = useAuthStore((state) => state.activeRole);
  const canonicalRoles = useAuthStore((state) => state.canonicalRoles);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);

  const [modalVisible, setModalVisible] = useState(false);

  // If user only has 1 or 0 roles, do not display the switcher
  if (!activeRole || canonicalRoles.length <= 1) {
    return null;
  }

  const activeDescriptor = CANONICAL_ROLE_DESCRIPTORS[activeRole];

  const handleSelectRole = (role: CanonicalRole) => {
    setActiveRole(role);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.pillContainer}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Active role: ${activeDescriptor?.title}. Tap to switch persona.`}
      >
        <View style={styles.indicatorDot} />
        <Text style={styles.pillText}>{activeDescriptor?.badgeLabel || activeRole}</Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Switch Workspace Persona</Text>
            <Text style={styles.modalSubtitle}>
              You have multiple assigned roles in this organization. Select a persona to switch your active view:
            </Text>

            <FlatList
              data={canonicalRoles}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const descriptor = CANONICAL_ROLE_DESCRIPTORS[item];
                const isSelected = item === activeRole;
                return (
                  <TouchableOpacity
                    style={[styles.roleItem, isSelected && styles.roleItemSelected]}
                    onPress={() => handleSelectRole(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.roleItemContent}>
                      <View style={styles.roleHeaderRow}>
                        <Text style={[styles.roleItemTitle, isSelected && styles.roleItemTitleSelected]}>
                          {descriptor?.title || item}
                        </Text>
                        {isSelected ? (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>ACTIVE</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.roleItemDescription}>{descriptor?.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  chevron: {
    fontSize: 12,
    color: '#065F46',
    marginLeft: 4,
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  roleItem: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  roleItemSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  roleItemContent: {
    flex: 1,
  },
  roleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  roleItemTitleSelected: {
    color: '#047857',
  },
  activeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  roleItemDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  closeButton: {
    marginTop: 10,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
});
