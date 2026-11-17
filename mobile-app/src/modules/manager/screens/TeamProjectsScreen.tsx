import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../../../components/common/Text';
import { ArrowLeft } from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common';
import { useNavigation } from '@react-navigation/native';

export const TeamProjectsScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Projects & Tasks</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.projectCard}>
          <Text style={styles.projectName}>HRMS Unified Mobile App</Text>
          <Text style={styles.projectMeta}>Client: Webfamily Global • Priority: High</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, styles.progress85]} />
            </View>
            <Text style={styles.progressText}>85% Complete</Text>
          </View>
        </View>

        <View style={styles.projectCard}>
          <Text style={styles.projectName}>Enterprise Multi-Tenant Security Engine</Text>
          <Text style={styles.projectMeta}>Client: Core Platform • Priority: Critical</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, styles.progress100]} />
            </View>
            <Text style={styles.progressText}>100% Completed</Text>
          </View>
        </View>
      </ScrollView>
      <AppBottomNav activeRoute="ManagerHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  placeholder: {
    width: 36,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  projectMeta: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  progress85: {
    width: '85%',
  },
  progress100: {
    width: '100%',
    backgroundColor: '#16A34A',
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'right',
  },
});
