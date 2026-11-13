# MASTERHRMS — PHASE 3.2
# Document Compliance Rules & Calculation Engine

**Milestone:** Phase 3.2 — Document Expiry & Compliance Automation  
**Authoritative Reference:** Formulas, Obligation Derivation, Status Transitions, and Classification Algorithms  

---

## 1. Compliance Metric Definition

Document compliance in MASTERHRMS measures the extent to which an organization's active workforce satisfies mandatory statutory, legal, and operational document requirements.

### 1.1 The Mathematical Model

$$\text{Workforce Obligations} = N_{\text{employees}} \times M_{\text{mandatory\_types}}$$

Where:
- $N_{\text{employees}}$: Total count of active employees in the tenant context (`status NOT IN ('terminated', 'inactive')`).
- $M_{\text{mandatory\_types}}$: Total count of active required document types (`isRequired = true` and `isActive = true`).

$$\text{Compliance Rate (\%)} = \begin{cases} 
100.0 & \text{if } \text{Workforce Obligations} = 0 \\
\left(\dfrac{\text{Compliant Obligations}}{\text{Workforce Obligations}}\right) \times 100 & \text{otherwise}
\end{cases}$$

### 1.2 Definition of a Compliant Obligation
For a given employee $E$ and mandatory document type $T$, the obligation is **Compliant** if and only if there exists a `CompanyDocument` $D$ satisfying all of the following conditions:
1. $D$ belongs to employee $E$ (`D.employeeId = E.id`).
2. $D$ is assigned to type $T$ (`D.documentTypeId = T.id`).
3. $D$ is verified or approved (`D.status IN ('verified', 'approved')`).
4. $D$ is currently valid (`D.expiryDate IS NULL` OR `D.expiryDate >= today`).

If multiple non-superseded documents exist for the same employee and type, the most recently uploaded active record is authoritative.

---

## 2. Document Expiry Classification Taxonomy

The `DocumentExpiryService.classifyDocument` algorithm classifies any document into one of 9 discrete states based on a calendar-day boundary evaluation against UTC midnight:

```
                          ┌──────────────────────────┐
                          │   Document Evaluation    │
                          └────────────┬─────────────┘
                                       │
                  ┌────────────────────┴────────────────────┐
                  │ Priority Lifecycle Status Checks        │
                  ▼                                         ▼
            status='superseded'                       status='rejected'
            [SUPERSEDED]                              [REJECTED]
                  │                                         │
                  ▼                                         ▼
            status='pending_verification'             expiryDate IS NULL
            [PENDING_VERIFICATION]                   [NO_EXPIRY]
                                       │
                                       ▼
                   Calculate Days Remaining (diffDays)
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          ▼                            ▼                            ▼
     diffDays < 0              0 <= diffDays <= 7           7 < diffDays <= 15
      [EXPIRED]                 [EXPIRING_7_DAYS]           [EXPIRING_15_DAYS]
                                       │
                                       ▼
                              15 < diffDays <= 30
                              [EXPIRING_30_DAYS]
                                       │
                                       ▼
                                 diffDays > 30
                                    [VALID]
```

### Classification Reference Table

| Classification Code | Condition | Expiry Stage | Compliant? | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| `VALID` | `diffDays > 30` | `valid` | Yes | None |
| `EXPIRING_30_DAYS` | `15 < diffDays <= 30` | `30_days` | Yes (Warning) | Initiate renewal preparations |
| `EXPIRING_15_DAYS` | `7 < diffDays <= 15` | `15_days` | Yes (Urgent) | Submit renewal documentation |
| `EXPIRING_7_DAYS` | `0 <= diffDays <= 7` | `7_days` | Yes (Critical) | Urgent upload; HR alerted |
| `EXPIRED` | `diffDays < 0` | `expired` | No | Immediate replacement mandatory |
| `NO_EXPIRY` | `expiryDate IS NULL` | `none` | Yes (if verified) | None (Permanent document) |
| `PENDING_VERIFICATION` | `status = 'pending_verification'` | `none` | Pending | HR must review and certify |
| `REJECTED` | `status = 'rejected'` | `none` | No | Re-upload required with corrections |
| `SUPERSEDED` | `status = 'superseded'` | `none` | Historical | Predecessor; successor applies |

---

## 3. Document Renewal Lifecycle State Machine

When a document expires or approaches expiration, it enters the **Renewal Workflow**:

```
[Predecessor Document] (status = 'verified' | 'expired')
        │
        │ Employee or HR submits renewal
        │ POST /api/documents/:id/renew
        ▼
   [Atomic Prisma Transaction]
   ├── 1. Predecessor status -> 'superseded'
   │      Predecessor notes += '[Superseded by DOC-RNW-XXXX on ISO_TIMESTAMP]'
   │
   └── 2. Successor record created:
          - documentCode: 'DOC-RNW-XXXX'
          - status: 'pending_verification'
          - documentTypeId: Predecessor's documentTypeId (Preserves obligation link)
          - employeeId: Predecessor's employeeId
          - fileUrl / fileName: New uploaded credentials
          - expiryDate: New future expiry date
        │
        ├── Record Audit Mutation: DOCUMENT_RENEWAL_SUBMITTED
        ├── Record Outbox Event: DOCUMENT_RENEWAL_SUBMITTED
        └── Dispatch Notification to HR Administrators
        │
        ▼
[HR Review at /hr/documents/compliance]
        │
        ├── Action: Verify (POST /api/documents/:id/verify)
        │     └── Successor status -> 'verified' (Obligation now Compliant)
        │
        └── Action: Reject (POST /api/documents/:id/reject)
              └── Successor status -> 'rejected' (Notes updated with mandatory reason)
```

