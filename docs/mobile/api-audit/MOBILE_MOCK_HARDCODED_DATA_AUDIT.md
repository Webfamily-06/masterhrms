# MasterHRMS Mobile — Mock & Hardcoded Data Audit

## 1. Audit Scope & Methodology

This audit searches every source file in the MasterHRMS mobile application to distinguish between:
1. **Acceptable UI-Only Constants**: Safe design system values (color palettes, icons, tab definitions, static labels, typography constants).
2. **Derived UI Calculations**: Pure mathematical computations derived from verified backend values (e.g. days between two dates, percentage progress).
3. **Test Fixtures & Mocks**: Test-only mocks located exclusively within `__tests__/` or `jest.setup.js`.
4. **Genuine Mock Business Data**: Hardcoded business records (static employee lists, dummy expense claims, simulated salary slips, fake project cards) presented to users in production views.
5. **Simulated / Stub Actions**: Interactive buttons that trigger local `Alert.alert(...)`, close modals, or append in-memory state without server communication.

---

## 2. Summary of Mock & Hardcoded Findings

| Category | Count | Status / Risk | Action Required |
|---|---|---|---|
| **Genuine Mock Business Records** | 5 Screens | High — Users view false business records | Replace with backend queries |
| **Simulated Stub Actions (Alert-Only)** | 6 Screens | Medium — Operations appear complete but never reach server | Wire to actual backend mutations |
| **Simulated Mathematical Business Data** | 1 Screen | Medium — Payslip breakdown uses arbitrary multipliers | Connect to backend payslip breakdown API |
| **Safe Design / UI Constants** | 42 Screens | Zero Risk — Standard UI styling and structural metadata | Preserve as valid design tokens |
| **Test Fixtures** | 8 Test Files | Zero Risk — Isolated to Jest testing harness | Preserve |

---

## 3. Itemized Mock Business Data & Stub Actions

### MOCK-001: Hardcoded Expense Claims Feed
- **Screen**: `ExpenseClaimsScreen`
- **File**: [ExpenseClaimsScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/ExpenseClaimsScreen.tsx#L42-L75)
- **Line References**: Lines 42–75
- **Finding Type**: **Genuine Mock Business Data**
- **Offending Code**:
  ```typescript
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    {
      id: 'exp-1',
      category: 'TRAVEL',
      title: 'Flight to Bangalore - Client Visit',
      date: 'Nov 12, 2026',
      amount: 4500,
      status: 'APPROVED',
    },
    {
      id: 'exp-2',
      category: 'MEALS',
      title: 'Client Lunch Meeting',
      date: 'Nov 10, 2026',
      amount: 1850,
      status: 'PENDING',
    },
    {
      id: 'exp-3',
      category: 'OFFICE',
      title: 'Ergonomic Mouse & Keyboard',
      date: 'Nov 04, 2026',
      amount: 3200,
      status: 'REJECTED',
    },
    {
      id: 'exp-4',
      category: 'TELECOM',
      title: 'Monthly Broadband Bill',
      date: 'Nov 01, 2026',
      amount: 999,
      status: 'APPROVED',
    },
  ]);
  ```
- **Business Impact**: Every employee who opens Expense Claims sees these identical four static claims regardless of their actual company or expense history.
- **Real Backend Replacement**: Replace initial state with `useQuery(['expenseClaims'], () => ExpenseService.getMyClaims())` targeting backend endpoint `GET /api/expenses/claims`.

---

### MOCK-002: In-Memory Expense Claim Append & Stub Alert
- **Screen**: `ExpenseClaimsScreen`
- **File**: [ExpenseClaimsScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/ExpenseClaimsScreen.tsx#L81-L99)
- **Line References**: Lines 81–99
- **Finding Type**: **Simulated / Stub Action**
- **Offending Code**:
  ```typescript
  const handleSubmitClaim = () => {
    if (!title.trim() || !amount.trim()) {
      Alert.alert('Required Fields', 'Please enter a title and claim amount.');
      return;
    }
    const newClaim: ExpenseItem = {
      id: `exp-${Date.now()}`,
      category,
      title: title.trim(),
      date: 'Nov 16, 2026',
      amount: parseFloat(amount) || 0,
      status: 'PENDING',
    };
    setExpenses([newClaim, ...expenses]);
    setTitle('');
    setAmount('');
    setModalVisible(false);
    Alert.alert('Claim Submitted', 'Your expense claim has been routed to your Manager for review.');
  };
  ```
- **Business Impact**: Users believe their expense claim has been submitted to their manager, but refreshing or closing the app permanently loses the entry. No claim is stored in the database.
- **Real Backend Replacement**: Wire to `POST /api/expenses/claims` via `ExpenseService.submitClaim(...)`.

---

### MOCK-003: Salary Advance Loan Form Stub Submission
- **Screen**: `SalaryAdvanceLoanScreen`
- **File**: [SalaryAdvanceLoanScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/SalaryAdvanceLoanScreen.tsx#L46-L56)
- **Line References**: Lines 46–56
- **Finding Type**: **Simulated / Stub Action**
- **Offending Code**:
  ```typescript
  const handleSubmit = () => {
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please enter a reason for the loan request.');
      return;
    }
    Alert.alert(
      'Request Submitted',
      'Your salary advance request has been forwarded to HR for approval.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };
  ```
- **Business Impact**: Employees in financial need submitting an advance request receive a success alert and are routed back, but HR never receives any request.
- **Real Backend Replacement**: Call `POST /api/v1/me/payroll/loans/request` to create an `EmployeeLoan` and outbox approval event.

---

### MOCK-004: Arbitrary Percentage Payslip Breakdown Multipliers
- **Screen**: `SalarySlipDetailScreen`
- **File**: [SalarySlipDetailScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/SalarySlipDetailScreen.tsx#L40-L43)
- **Line References**: Lines 40–43
- **Finding Type**: **Simulated Mathematical Business Data**
- **Offending Code**:
  ```typescript
  const basicSalary = Math.round(grossAmount * 0.7);
  const allowances = grossAmount - basicSalary;
  const taxInsurance = Math.round(deductions * 0.6);
  const otherDeductions = deductions - taxInsurance;
  ```
- **Business Impact**: Displays fabricated statutory numbers (Basic salary forced to 70%, taxes forced to 60%) that violate the employee's actual contract and legal statutory payslip components.
- **Real Backend Replacement**: Invoke `PayrollService.getPayslipDetail(id)` to retrieve verified earnings and deductions from `GET /api/v1/me/payslips/:id`.

---

### MOCK-005: Fake Document Download Alert
- **Screen**: `DocumentsVaultScreen`
- **File**: [DocumentsVaultScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/DocumentsVaultScreen.tsx#L87-L89)
- **Line References**: Lines 87–89
- **Finding Type**: **Simulated / Stub Action**
- **Offending Code**:
  ```typescript
  const handleDownload = (docName: string) => {
    Alert.alert('Document Downloaded', `${docName} has been downloaded to your secure device storage.`);
  };
  ```
- **Business Impact**: Users tapping download on critical letters or employment contracts receive a false confirmation dialog, but no file is downloaded or saved to disk.
- **Real Backend Replacement**: Use `openOrShareAttachment({ url: doc.url, fileName: doc.name, mimeType: doc.type })`.

---

### MOCK-006: Fake Attendance Report Download Alerts
- **Screen**: `AttendanceDetailScreen`
- **File**: [AttendanceDetailScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/AttendanceDetailScreen.tsx#L174)
- **Line References**: Line 174, Line 388
- **Finding Type**: **Simulated / Stub Action**
- **Offending Code**:
  ```typescript
  onPress={() => Alert.alert('Download', 'Monthly Attendance Report PDF downloaded.')}
  onPress={() => Alert.alert('Report', 'Full Attendance Report downloaded.')}
  ```
- **Business Impact**: Users requesting monthly attendance documentation receive an alert without any PDF file being generated or shared.
- **Real Backend Replacement**: Fetch PDF from `GET /api/attendance/export?format=pdf` and invoke `openOrShareAttachment`.

---

### MOCK-007: Fake Leave Permission Request Alert
- **Screen**: `LeaveDetailScreen`
- **File**: [LeaveDetailScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/LeaveDetailScreen.tsx#L476)
- **Line References**: Line 284, Line 476
- **Finding Type**: **Simulated / Stub Action**
- **Offending Code**:
  ```typescript
  onPress={() => Alert.alert('Request Permission', 'Permission request modal opened.')}
  onPress={() => Alert.alert('History', 'Full leave history.')}
  ```
- **Business Impact**: Short leave / on-duty permission button does not open any form or submit any request.
- **Real Backend Replacement**: Present permission modal and dispatch to `LeaveService.applyLeave({ ... })`.

---

### MOCK-008: Hardcoded Manager Team Projects
- **Screen**: `TeamProjectsScreen`
- **File**: [TeamProjectsScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/manager/screens/TeamProjectsScreen.tsx#L23-L55)
- **Line References**: Lines 23–55
- **Finding Type**: **Genuine Mock Business Data**
- **Offending Code**:
  ```typescript
  const [projects] = useState<ProjectItem[]>([
    {
      id: 'proj-1',
      name: 'HRMS Mobile App v2',
      description: 'Native mobile client rebuild with Expo SDK 58 and real-time collaboration.',
      status: 'IN_PROGRESS',
      progress: 75,
      dueDate: 'Dec 15, 2026',
      members: ['Alice W.', 'Bob M.', 'Charlie D.'],
    },
    ...
  ]);
  ```
- **Business Impact**: Every manager sees these hardcoded projects regardless of their actual department or team assignments.
- **Real Backend Replacement**: Query `GET /api/projects` via `ManagerService.getTeamProjects()`.

---

### MOCK-009: Hardcoded Tenant Modules Overview
- **Screen**: `ModulesOverviewScreen`
- **File**: [ModulesOverviewScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/tenant-admin/screens/ModulesOverviewScreen.tsx#L45-L88)
- **Line References**: Lines 45–88
- **Finding Type**: **Genuine Mock Business Data**
- **Offending Code**:
  ```typescript
  const modules: ModuleItem[] = [
    { id: 'mod-1', name: 'Core HR & Staff Directory', status: 'ACTIVE', tier: 'ENTERPRISE' },
    { id: 'mod-2', name: 'Time & Attendance with Geofencing', status: 'ACTIVE', tier: 'ENTERPRISE' },
    { id: 'mod-3', name: 'Statutory Payroll Engine', status: 'ACTIVE', tier: 'ENTERPRISE' },
    ...
  ];
  ```
- **Business Impact**: Tenant administrators see all modules as "Active" even if their subscription tier does not include them.
- **Real Backend Replacement**: Query `GET /api/workspace/modules` via `TenantAdminService.getTenantModules()`.

---

### MOCK-010: Hardcoded Virtual Payment Cards
- **Screen**: `PaymentCardsScreen`
- **File**: [PaymentCardsScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/PaymentCardsScreen.tsx#L38-L85)
- **Line References**: Lines 38–85
- **Finding Type**: **Genuine Mock Business Data**
- **Offending Code**: Renders static virtual card ending in `4242` and `HDFC Bank` account without querying employee profile data.
- **Business Impact**: Disconnected visual presentation.
- **Real Backend Replacement**: Bind to `EmployeeService.getMyProfile()` to render the employee's real bank account and IFSC.

---

## 4. Legitimate Acceptable UI-Only Constants

The following data structures were inspected and verified as **ACCEPTABLE UI-ONLY CONSTANTS**:
- Category filter definitions (e.g. `['ALL', 'TRAVEL', 'MEALS', 'OFFICE', 'TELECOM']`)
- Theme color palettes (`mobile-app/src/theme/colors.ts`)
- Spacing & typography constants (`mobile-app/src/theme/spacing.ts`, `typography.ts`)
- Role navigation routing tables (`AppNavigator.tsx`, `AppBottomNav.tsx`)
- Status color badge maps (`APPROVED: '#16A34A'`, `PENDING: '#F59E0B'`, `REJECTED: '#DC2626'`)
- SVG icon proxies (`jest.setup.js`)
