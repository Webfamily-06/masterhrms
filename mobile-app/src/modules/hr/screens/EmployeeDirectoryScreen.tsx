import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { HrService, EmployeeSummary, Department } from '../../../core/services/hrService';
import { useNavigation } from '@react-navigation/native';

export const EmployeeDirectoryScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      const [empData, deptData] = await Promise.all([
        HrService.getEmployees({
          search: search.trim() || undefined,
          departmentId: selectedDept !== 'all' ? selectedDept : undefined,
        }),
        HrService.getDepartments(),
      ]);
      setEmployees(empData);
      setDepartments(deptData);
    } catch {
      // Handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedDept]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getDeptName = (dept: any) => {
    if (!dept) return 'General';
    if (typeof dept === 'string') return dept;
    return dept.name || 'General';
  };

  const getDesigName = (desig: any) => {
    if (!desig) return 'Employee';
    if (typeof desig === 'string') return desig;
    return desig.name || 'Employee';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Directory</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or employee code..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadData}
          returnKeyType="search"
        />
      </View>

      {/* Department Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        <TouchableOpacity
          style={[styles.filterChip, selectedDept === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedDept('all')}
        >
          <Text
            style={[styles.filterChipText, selectedDept === 'all' && styles.filterChipTextActive]}
          >
            All Departments
          </Text>
        </TouchableOpacity>
        {departments.map((d) => (
          <TouchableOpacity
            key={d.id}
            style={[styles.filterChip, selectedDept === d.id && styles.filterChipActive]}
            onPress={() => setSelectedDept(d.id)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedDept === d.id && styles.filterChipTextActive,
              ]}
            >
              {d.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.countText}>Total: {employees.length} Employee(s)</Text>

          {employees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No employees matched your query.</Text>
            </View>
          ) : (
            employees.map((emp) => (
              <View key={emp.id} style={styles.empCard}>
                <View style={styles.empRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(emp.firstName?.[0] || 'E') + (emp.lastName?.[0] || '')}
                    </Text>
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName}>
                      {emp.firstName} {emp.lastName}
                    </Text>
                    <Text style={styles.empRole}>
                      {getDesigName(emp.designation)} • {getDeptName(emp.department)}
                    </Text>
                    <Text style={styles.empCode}>
                      {emp.employeeCode} • {emp.email}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      emp.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive,
                    ]}
                  >
                    <Text style={styles.statusPillText}>{emp.status || 'ACTIVE'}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
  searchBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#0F172A',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#DCFCE7',
  },
  filterChipText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#15803D',
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  countText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  empCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  empRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4338CA',
  },
  empInfo: {
    flex: 1,
  },
  empName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  empRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  empCode: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F172A',
  },
});
