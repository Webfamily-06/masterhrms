# MASTERHRMS — HISTORICAL TEST & AUDIT EVIDENCE ARCHIVE

This directory preserves historical test acceptance snapshots, architecture audits, route parity census records, and performance benchmark evidence that were originally stored as loose JSON files in the `scripts/` directory.

All original records are 100% preserved here in structured, categorized, and space-efficient archival formats.

---

## Evidence Index

| Archive File | Original Sources | Category / Purpose | Format |
| :--- | :--- | :--- | :--- |
| **`chat-calling-webrtc-acceptance.json`** | `chat_call_flow_results.json`, `chat_final_acceptance_results.json`, `chat_final_staging_evidence.json`, `chat_functional_audit_results.json`, `chat_realtime_performance_results.json`, `chat_ui_group_activity_acceptance_results.json`, `chat_webrtc_deep_audit_results.json`, `webrtc_calling_and_group_members_results.json` | Chat, multi-party WebRTC calling, Pusher realtime sync, and group activity acceptance test snapshots. | Structured JSON |
| **`email-acceptance.json`** | `email_acceptance_results.json` | SMTP connectivity, status endpoint, payload validation, and delivery outcome acceptance results. | Structured JSON |
| **`system-audit-and-migration.json`** | `migration_audit_results.json`, `independent_acceptance_results.json`, `consolidated_audit_results.json`, `media_baseline.json` | Phase 4B database migration verification, independent UI parity checks, and consolidated system health. | Structured JSON |
| **`extracted-payroll-metadata.json.gz`** | `extracted_payroll_metadata.json` | Oct 2026 statutory payroll metadata, Form U, Form V, Form W registers and reconciliation tables. | Gzip-compressed JSON |
| **`route-census-and-parity-inventory.json.gz`** | `census_diff.json`, `classified_routes_full.json`, `full_discovered_route_inventory.json`, `navigation_reconciliation.json`, `route_deep_audit.json`, `incomplete_routes_deep_audit.json`, `incomplete_routes_inventory.json`, `detailed_66_analysis.json`, `reexports_analysis.json` | Comprehensive 508-route census, TanStack Router vs CMS URL parity analysis, and navigation deep audits. | Gzip-compressed JSON |

---

## Traceability & Reproducibility
- All tests producing these results remain available as automated test suites in `server/src/tests/` and `scripts/`.
- To decompress any `.gz` archive for manual inspection:
  ```bash
  gzip -dk <filename>.json.gz
  ```
  or in Node.js:
  ```javascript
  const zlib = require('zlib');
  const fs = require('fs');
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync('route-census-and-parity-inventory.json.gz')));
  ```

