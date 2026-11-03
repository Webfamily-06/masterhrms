# MASTERHRMS — WORKSTREAM D STATUTORY OUTPUT INTEGRATION REPORT
## Seamless Post-Finalization Triggering of Dedicated Workstream C Statutory Registers

> **Workstream**: D — Stage 14 Statutory Output Integration  
> **Integrated Workstream**: Workstream C (`StatutoryFormRegistryService`, Forms U, V, W, X, S)  
> **Date**: November 3, 2026  
> **Status**: INTEGRATED & VERIFIED  

---

## 1. Architecture of Integration

Upon completion of Stage 13 ledger finalization, the orchestrator triggers Stage 14, generating statutory compliance manifests and linking them directly to the finalized payroll run:

```
Stage 13: Finalize ──> Stage 14: Compile Statutory Manifest
                                 ├── Form U: Register of Employees (27 columns)
                                 ├── Form V: Muster Roll (46 columns)
                                 ├── Form W: Register of Wages (34 columns)
                                 ├── Form X: Leave & Social Security (21 columns)
                                 └── Form S: Notice of Shifts (38 columns)
```

---

## 2. Integrated Statutory Builders

| Form Code | Register Title | Legal Mandate | Column Count | Builder Location |
|---|---|---|---|---|
| `FORM_U` | Register of Employees | Rule 16(1), TN Shops & Est. Act | 27 Columns | `server/src/services/statutory/builders/form-u-builder.service.ts` |
| `FORM_V` | Muster Roll / Attendance | Rule 16(1), TN Shops & Est. Act | 46 Columns | `server/src/services/statutory/builders/form-v-builder.service.ts` |
| `FORM_W` | Register of Wages | Rule 16(1), TN Shops & Est. Act | 34 Columns | `server/src/services/statutory/builders/form-w-builder.service.ts` |
| `FORM_X` | Leave & Social Security | Rule 16(1), TN Shops & Est. Act | 21 Columns | `server/src/services/statutory/builders/form-x-builder.service.ts` |
| `FORM_S` | Notice of Working Hours | Rule 18(1), TN Shops & Est. Act | 38 Columns | `server/src/services/statutory/builders/form-s-builder.service.ts` |

---

## 3. Manifest Persistence & Direct API Access

The generated manifest is persisted inside `PayrollRun.statutoryManifest`:
```json
{
  "cryptographicHash": "62bf143c4ebc...",
  "outputs": {
    "statutoryRegisters": {
      "formsGenerated": ["FORM_U", "FORM_V", "FORM_W", "FORM_X", "FORM_S"],
      "generatedAt": "2026-11-03T17:27:00.000Z",
      "statutoryRule": "Rule 16(1), Tamil Nadu Shops and Establishments Act, 1947"
    }
  }
}
```

The CMS Command Hub provides immediate one-click download buttons:
- Single-form Excel export: `/api/payroll/statutory-registers/FORM_W/export?month=10&year=2026&format=xlsx`
- Consolidated 5-register multi-tab workbook: `/api/payroll/statutory-registers/bundle?month=10&year=2026&format=xlsx`
- Government submission PDF: `/api/payroll/statutory-registers/FORM_W/export?month=10&year=2026&format=pdf`
