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
import { ArrowLeft, Search, Moon, Sun } from 'lucide-react-native';
import { AppBottomNav, UserAvatar } from '../../../components/common';
import { HrService, EmployeeSummary, Department } from '../../../core/services/hrService';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useNavigation } from '@react-navigation/native';

export const EmployeeDirectoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, toggleTheme } = useTheme();

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
    void loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const getDeptName = (dept: any) => {
    if (!dept) return 'General';
    if (typeof dept === 'string') return dept;
    return dept.name || 'General';
  };

  const getDesigName = (desig: any, fallbackPos?: any) => {
    if (desig) {
      if (typeof desig === 'string') return desig;
      if (desig.name) return desig.name;
    }
    if (fallbackPos && typeof fallbackPos === 'string') return fallbackPos;
    return 'Employee';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backButton,
            { backgroundColor: theme.colors.surfaceSecondary },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Employee Directory
        </Text>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[
            styles.backButton,
            { backgroundColor: theme.colors.surfaceSecondary },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Toggle dark mode"
        >
          {theme.isDark ? (
            <Sun size={18} color="#FBBF24" />
          ) : (
            <Moon size={18} color={theme.colors.text} />
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View
          style={[
            styles.searchBoxInner,
            {
              backgroundColor: theme.colors.surfaceSecondary,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Search size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search by name, email or employee code..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadData}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Department Filter Chips */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: theme.colors.surfaceSecondary },
              selectedDept === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedDept('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: theme.colors.textSecondary },
                selectedDept === 'all' && styles.filterChipTextActive,
              ]}
            >
              All Departments
            </Text>
          </TouchableOpacity>
          {departments.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={[
                styles.filterChip,
                { backgroundColor: theme.colors.surfaceSecondary },
                selectedDept === d.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedDept(d.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: theme.colors.textSecondary },
                  selectedDept === d.id && styles.filterChipTextActive,
                ]}
              >
                {d.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
            Total: {employees.length} Employee(s)
          </Text>

          {employees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                No employees matched your query.
              </Text>
            </View>
          ) : (
            employees.map((emp) => {
              const statusUpper = String(emp.status || 'ACTIVE').toUpperCase();
              const isActive = statusUpper === 'ACTIVE';
              return (
                <View
                  key={emp.id}
                  style={[
                    styles.empCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.empRow}>
                    <UserAvatar
                      entity={emp}
                      name={`${emp.firstName || ''} ${emp.lastName || ''}`.trim()}
                      email={emp.email}
                      size={48}
                      borderWidth={1.5}
                      borderColor={theme.colors.border}
                      style={{ marginRight: 12 }}
                    />
                    <View style={styles.empInfo}>
                      <Text style={[styles.empName, { color: theme.colors.text }]}>
                        {emp.firstName} {emp.lastName}
                      </Text>
                      <Text style={[styles.empRole, { color: theme.colors.textSecondary }]}>
                        {getDesigName(emp.designation, (emp as any).position)} •{' '}
                        {getDeptName(emp.department)}
                      </Text>
                      <Text style={[styles.empCode, { color: theme.colors.textMuted }]}>
                        {emp.employeeCode} • {emp.email}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        isActive ? styles.statusActive : styles.statusInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isActive ? '#15803D' : '#DC2626' },
                        ]}
                      >
                        {statusUpper}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
      <AppBottomNav activeRoute="EmployeeDirectory" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBoxInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: 44,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipActive: {
    backgroundColor: '#DCFCE7',
  },
  filterChipText: {
    fontSize: 12.5,
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
    paddingBottom: 32,
  },
  countText: {
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  empCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  empRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empInfo: {
    flex: 1,
    paddingRight: 8,
  },
  empName: {
    fontSize: 15,
    fontWeight: '700',
  },
  empRole: {
    fontSize: 12,
    marginTop: 2,
  },
  empCode: {
    fontSize: 11,
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
  },
});
