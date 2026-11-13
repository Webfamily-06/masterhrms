# MASTERHRMS — Phase 3.4: Manager History & Transition Reference

## 1. Objective & Model Mapping
Employee career progression requires an immutable historical audit trail of every supervisor an employee has reported to over time.

Instead of introducing redundant new database tables, Phase 3.4 standardizes on the existing `EmployeeTransfer` model, leveraging its optional fields to represent pure manager transitions cleanly without side effects on organizational units or compensation.

---

## 2. Model Reuse: `EmployeeTransfer`

### 2.1 Field Mapping for Reporting Manager Changes
When a manager change request is created and fulfilled, the `EmployeeTransfer` record is populated as follows:

| Field | Pure Manager Change Value | Explanation |
| :--- | :--- | :--- |
| `id` | UUID | Primary key |
| `tenantId` | string | Enforces strict multi-tenant isolation |
| `employeeId` | string | Target employee whose manager is changing |
| `fromBranchId` | `null` | **Untouched** — branch is unmodified |
| `toBranchId` | `null` | **Untouched** — branch is unmodified |
| `fromDeptId` | `null` | **Untouched** — department is unmodified |
| `toDeptId` | `null` | **Untouched** — department is unmodified |
| `oldManagerId` | string \| null | Authoritative previous manager at time of request |
| `newManagerId` | string \| null | Proposed / new manager |
| `effectiveDate` | DateTime | Timestamp when change takes effect |
| `status` | string | `PENDING`, `APPROVED`, `COMPLETED`, `REJECTED`, `CORRECTION_REQUESTED` |
| `reason` | string | Prefixed with `[MANAGER_CHANGE] ...` to clearly distinguish in reports |
| `createdAt` | DateTime | Submission timestamp |
| `updatedAt` | DateTime | Last mutation timestamp |

### 2.2 Preserving Salary, Designation & Department
Standard transfers frequently modify `branchId`, `departmentId`, or compensation. For pure manager changes:
- `applyManagerChange` executes an atomic Prisma `$transaction` that **only** touches:
  1. `db.employee.update({ where: { id: employeeId }, data: { managerId: newManagerId } })`
  2. `db.employeeTransfer.update({ where: { id: transferId }, data: { status: 'COMPLETED' } })`
- Under no circumstances are `salary`, `designationId`, `branchId`, or `departmentId` overwritten or wiped.

---

## 3. History Retrieval & API

### Endpoint:
`GET /api/v1/organization/tree/employee/:id/manager-history`

### Access Control:
- HR Admins: Can view history for any employee in their tenant.
- Managers: Can view history for direct/indirect subordinates in their line.
- Employees: Can view their own reporting manager history.

### Response Structure:
```json
{
  "success": true,
  "employee": {
    "id": "emp-uuid-1",
    "name": "David Developer",
    "employeeCode": "DEV001",
    "currentManager": {
      "id": "emp-uuid-2",
      "name": "Hannah Recruiter",
      "employeeCode": "HR001"
    }
  },
  "history": [
    {
      "id": "trf-uuid-101",
      "oldManager": {
        "id": "emp-uuid-3",
        "name": "Leonard Leader",
        "employeeCode": "LEAD001"
      },
      "newManager": {
        "id": "emp-uuid-2",
        "name": "Hannah Recruiter",
        "employeeCode": "HR001"
      },
      "effectiveDate": "2026-11-13T00:00:00.000Z",
      "appliedAt": "2026-11-13T08:15:00.000Z",
      "reason": "Team realignment under engineering operations."
    }
  ]
}
```

---

## 4. Frontend Interactive Org Tree Drawer Integration
Both frontends (`src/components/organization/interactive-org-tree.tsx` and `CMS/src/components/organization/interactive-org-tree.tsx`) include a "Reporting Manager History" timeline inside the employee profile slideover drawer:
- Shows transition chronological badges.
- Displays previous manager $\rightarrow$ new manager names and codes.
- Displays effective dates and reasons for transfer.
- Provides immediate transparency for talent planning and audit inquiries.

