# MASTERHRMS — ORGANIZATION MASTER DATA UI FUNCTIONALITY MATRIX
**Pages Covered:**
1. Departments: `/hr/organization/departments`
2. Designations: `/hr/organization/designations`
3. Branches: `/hr/organization/branches`
**Date: 2026-11-05**

---

## 1. Executive Summary

This matrix catalogs every interactive UI control across the three organization master data pages. It records expected behavior, current implementation status, underlying API endpoints, database persistence characteristics, and verification status.

---

## 2. Departments UI Functionality Matrix (`/hr/organization/departments`)

| Control Name | Type | Expected Behavior | API Endpoint | DB Persistence | Auth Required | Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **Add Department** | Button | Opens modal dialog with empty fields | None (client) | N/A | Yes | **PASS** |
| **Department Name** | Input | Required text input (max 255 chars) | None | N/A | Yes | **PASS** |
| **Facility / Branch Selector** | Select | Dropdown of tenant-scoped branches | `/api/hr/organization/branches` | `branch_id` | Yes | **PASS** |
| **Description** | Input | Optional text description | None | `description` | Yes | **PASS** |
| **Status Selector** | Select | Set status to Active or Inactive | None | `status` | Yes | **REPAIRED** |
| **Cancel Modal** | Button | Closes modal without saving | None (client) | No change | Yes | **PASS** |
| **Save / Create Department** | Button | Submits POST or PUT, validates, closes dialog | `POST/PUT /api/hr/organization/departments` | `public.departments` | Yes | **PASS** |
| **Edit Department** | Icon/Btn | Opens modal prefilled with current department | None | N/A | Yes | **PASS** |
| **Archive / Deactivate** | Button | Toggles status to inactive with confirmation | `PUT /api/hr/organization/departments/:id` | `public.departments` | Yes | **REPAIRED** |
| **Delete Department** | Button | Deletes unreferenced department; guards referenced | `DELETE /api/hr/organization/departments/:id` | `public.departments` | Yes | **REPAIRED** |
| **Search Input** | Input | Filters departments by name or description | `GET /api/hr/organization/departments?search=` | Read-only | Yes | **PASS** |
| **Status Filter** | Select | Filters table by Active, Inactive, or All | `GET /api/hr/organization/departments?status=` | Read-only | Yes | **REPAIRED** |
| **Page Size Selector** | Select | Adjusts records per page (10, 25, 50, 100) | `GET /api/hr/organization/departments?limit=` | Read-only | Yes | **REPAIRED** |
| **Pagination Prev / Next** | Buttons | Navigates between result pages | `GET /api/hr/organization/departments?page=` | Read-only | Yes | **PASS** |
| **Individual Checkbox** | Checkbox | Selects / deselects specific row | None (client) | Local state | Yes | **REPAIRED** |
| **Select All (Page)** | Checkbox | Toggles selection of all current page rows | None (client) | Local state | Yes | **REPAIRED** |
| **Bulk Archive** | Button | Archives all selected departments | `POST /api/hr/organization/departments/bulk-archive` | `public.departments` | Yes | **REPAIRED** |
| **Column Sort (Name/Status)**| Header | Sorts list ascending / descending | `GET /api/hr/organization/departments?sortBy=` | Read-only | Yes | **REPAIRED** |
| **Summary Cards** | Cards | Displays Total, Active, Inactive counts | `GET /api/hr/organization/departments` | Read-only | Yes | **REPAIRED** |

---

## 3. Designations UI Functionality Matrix (`/hr/organization/designations`)

| Control Name | Type | Expected Behavior | API Endpoint | DB Persistence | Auth Required | Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **Add Designation** | Button | Opens modal dialog with empty fields | None (client) | N/A | Yes | **PASS** |
| **Designation Name** | Input | Required text input (max 255 chars) | None | N/A | Yes | **PASS** |
| **Department Selector** | Select | Dropdown of tenant-scoped departments | `/api/hr/organization/departments` | `department_id` | Yes | **PASS** |
| **Description** | Input | Optional text description | None | `description` | Yes | **PASS** |
| **Status Selector** | Select | Set status to Active or Inactive | None | `status` | Yes | **REPAIRED** |
| **Cancel Modal** | Button | Closes modal without saving | None (client) | No change | Yes | **PASS** |
| **Save / Create Designation**| Button | Submits POST or PUT, validates, closes dialog | `POST/PUT /api/hr/organization/designations` | `public.designations` | Yes | **PASS** |
| **Edit Designation** | Icon/Btn | Opens modal prefilled with current designation | None | N/A | Yes | **PASS** |
| **Archive / Deactivate** | Button | Toggles status to inactive with confirmation | `PUT /api/hr/organization/designations/:id` | `public.designations` | Yes | **REPAIRED** |
| **Delete Designation** | Button | Deletes unreferenced designation; guards referenced | `DELETE /api/hr/organization/designations/:id` | `public.designations` | Yes | **REPAIRED** |
| **Search Input** | Input | Filters designations by name or description | `GET /api/hr/organization/designations?search=` | Read-only | Yes | **PASS** |
| **Status Filter** | Select | Filters table by Active, Inactive, or All | `GET /api/hr/organization/designations?status=` | Read-only | Yes | **REPAIRED** |
| **Page Size Selector** | Select | Adjusts records per page (10, 25, 50, 100) | `GET /api/hr/organization/designations?limit=` | Read-only | Yes | **REPAIRED** |
| **Pagination Prev / Next** | Buttons | Navigates between result pages | `GET /api/hr/organization/designations?page=` | Read-only | Yes | **PASS** |
| **Individual Checkbox** | Checkbox | Selects / deselects specific row | None (client) | Local state | Yes | **REPAIRED** |
| **Select All (Page)** | Checkbox | Toggles selection of all current page rows | None (client) | Local state | Yes | **REPAIRED** |
| **Bulk Archive** | Button | Archives all selected designations | `POST /api/hr/organization/designations/bulk-archive` | `public.designations` | Yes | **REPAIRED** |
| **Column Sort (Name/Status)**| Header | Sorts list ascending / descending | `GET /api/hr/organization/designations?sortBy=` | Read-only | Yes | **REPAIRED** |
| **Summary Cards** | Cards | Displays Total, Active, Inactive counts | `GET /api/hr/organization/designations` | Read-only | Yes | **REPAIRED** |

---

## 4. Branches UI Functionality Matrix (`/hr/organization/branches`)

| Control Name | Type | Expected Behavior | API Endpoint | DB Persistence | Auth Required | Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **Add Branch** | Button | Opens modal dialog with empty fields | None (client) | N/A | Yes | **PASS** |
| **Branch Name** | Input | Required text input (max 255 chars) | None | `name` | Yes | **PASS** |
| **Branch Code** | Input | Unique identifier (e.g. `CHN`, `HQ`) | None | `code` | Yes | **PASS** |
| **Address** | Input | Physical facility address | None | `address` | Yes | **PASS** |
| **Phone** | Input | Branch contact phone number | None | `phone` | Yes | **PASS** |
| **Email** | Input | Branch operational email address | None | `email` | Yes | **PASS** |
| **Status Selector** | Select | Set status to Active or Inactive | None | `status` | Yes | **REPAIRED** |
| **Cancel Modal** | Button | Closes modal without saving | None (client) | No change | Yes | **PASS** |
| **Save / Create Branch** | Button | Submits POST or PUT, validates, closes dialog | `POST/PUT /api/hr/organization/branches` | `public.branches` | Yes | **PASS** |
| **Edit Branch** | Icon/Btn | Opens modal prefilled with current branch | None | N/A | Yes | **PASS** |
| **Archive / Deactivate** | Button | Toggles status to inactive with confirmation | `PUT /api/hr/organization/branches/:id` | `public.branches` | Yes | **REPAIRED** |
| **Delete Branch** | Button | Deletes unreferenced branch; guards referenced | `DELETE /api/hr/organization/branches/:id` | `public.branches` | Yes | **REPAIRED** |
| **Search Input** | Input | Filters branches by name, code, email, phone | `GET /api/hr/organization/branches?search=` | Read-only | Yes | **PASS** |
| **Status Filter** | Select | Filters table by Active, Inactive, or All | `GET /api/hr/organization/branches?status=` | Read-only | Yes | **REPAIRED** |
| **Page Size Selector** | Select | Adjusts records per page (10, 25, 50, 100) | `GET /api/hr/organization/branches?limit=` | Read-only | Yes | **REPAIRED** |
| **Pagination Prev / Next** | Buttons | Navigates between result pages | `GET /api/hr/organization/branches?page=` | Read-only | Yes | **PASS** |
| **Individual Checkbox** | Checkbox | Selects / deselects specific row | None (client) | Local state | Yes | **REPAIRED** |
| **Select All (Page)** | Checkbox | Toggles selection of all current page rows | None (client) | Local state | Yes | **REPAIRED** |
| **Bulk Archive** | Button | Archives all selected branches | `POST /api/hr/organization/branches/bulk-archive` | `public.branches` | Yes | **REPAIRED** |
| **Column Sort (Name/Code)** | Header | Sorts list ascending / descending | `GET /api/hr/organization/branches?sortBy=` | Read-only | Yes | **REPAIRED** |
| **Summary Cards** | Cards | Displays Total, Active, Inactive counts | `GET /api/hr/organization/branches` | Read-only | Yes | **REPAIRED** |

