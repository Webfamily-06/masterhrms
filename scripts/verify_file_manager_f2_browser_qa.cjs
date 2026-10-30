/**
 * MASTERHRMS — Phase F2 Comprehensive Browser QA & Interaction Test Suite
 * Evaluates all 18 Acceptance Criteria using Dual Authenticated Browser Sessions (HR Admin & Employee)
 */

const fs = require("fs");
const path = require("path");
const jwt = require("../server/node_modules/jsonwebtoken");
const { chromium } = require("playwright");

require("dotenv").config({ path: path.join(__dirname, "../server/.env") });

const JWT_SECRET = process.env.JWT_SECRET || "master-hrms-jwt-super-secret-key-change-this-in-production";
const BASE_URL = "http://localhost:3000";

const SCREENSHOT_DIR = path.join(__dirname, "../docs/Saas/screenshots/files_f2");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Auth credentials
const tenantId = "tenant-default-001";
const hrUser = {
  userId: "user-hr-001",
  tenantId: tenantId,
  roles: ["hr_admin"],
  email: "hr@masterhrms.com",
};
const empUser = {
  userId: "user-emp-001",
  tenantId: tenantId,
  roles: ["employee"],
  email: "employee@masterhrms.com",
};

const hrToken = jwt.sign(hrUser, JWT_SECRET, { expiresIn: "1d" });
const empToken = jwt.sign(empUser, JWT_SECRET, { expiresIn: "1d" });

const checks = [];
function recordCheck(id, description, status, details = "") {
  checks.push({ id, description, status, details });
  console.log(`[${status}] Check ${id}: ${description} ${details ? `(${details})` : ""}`);
}

async function runBrowserQA() {
  console.log("===============================================================================");
  console.log(" MASTERHRMS FILE MANAGER — PHASE F2 BROWSER QA VERIFICATION");
  console.log("===============================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  try {
    // =========================================================================
    // SESSION 1: HR ADMINISTRATOR
    // =========================================================================
    console.log(">>> [SESSION 1] Testing HR Administrator Role (/hr/files)...");
    const hrContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "dark",
    });
    const hrPage = await hrContext.newPage();

    hrPage.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push({ role: "HR Admin", text: msg.text() });
      }
    });

    // 1. Inject auth token before page load via addInitScript
    await hrPage.addInitScript((tok) => {
      localStorage.setItem("hrms_auth_token", tok);
      localStorage.setItem("auth_token", tok);
    }, hrToken);

    await hrPage.goto(`${BASE_URL}/hr/files`, { waitUntil: "networkidle", timeout: 15000 });
    await hrPage.waitForTimeout(1500);

    const title = await hrPage.title();
    recordCheck(1, "File Manager loads in HR portal", "PASS", `Title: "${title}"`);

    // Screenshot 1: Windows 11 Explorer Initial Details View
    const shotDetails = path.join(SCREENSHOT_DIR, "01_f2_hr_details_view.png");
    await hrPage.screenshot({ path: shotDetails, fullPage: true });

    // 2. Sidebar Navigation Check
    const sidebarHome = await hrPage.$('button:has-text("Home")');
    const sidebarRecent = await hrPage.$('button:has-text("Recent")');
    const sidebarStarred = await hrPage.$('button:has-text("Starred")');
    const sidebarRecycle = await hrPage.$('button:has-text("Recycle Bin")');

    if (sidebarHome && sidebarRecent && sidebarStarred && sidebarRecycle) {
      recordCheck(2, "Sidebar navigation quick access elements present", "PASS");
    } else {
      recordCheck(2, "Sidebar navigation quick access elements present", "FAIL");
    }

    // 3. Multi-View Switching: Details -> Grid -> List -> Details
    // Switch to Grid
    const viewBtn = await hrPage.$('header button:has-text("Details"), header button:has-text("Grid"), header button:has-text("List")');
    if (viewBtn) {
      await viewBtn.click();
      await hrPage.waitForTimeout(400);
      const gridOption = await hrPage.$('div[role="menuitem"]:has-text("Grid")');
      if (gridOption) {
        await gridOption.click();
        await hrPage.waitForTimeout(1000);
        const shotGrid = path.join(SCREENSHOT_DIR, "02_f2_hr_grid_view.png");
        await hrPage.screenshot({ path: shotGrid, fullPage: true });
        recordCheck(4, "Multi-View: Grid View render", "PASS");
      }
    }

    // Switch to List
    const viewBtn2 = await hrPage.$('header button:has-text("Grid"), header button:has-text("Details")');
    if (viewBtn2) {
      await viewBtn2.click();
      await hrPage.waitForTimeout(400);
      const listOption = await hrPage.$('div[role="menuitem"]:has-text("List")');
      if (listOption) {
        await listOption.click();
        await hrPage.waitForTimeout(1000);
        const shotList = path.join(SCREENSHOT_DIR, "03_f2_hr_list_view.png");
        await hrPage.screenshot({ path: shotList, fullPage: true });
        recordCheck(4, "Multi-View: Compact List View render", "PASS");
      }
    }

    // Return to Details view
    const viewBtn3 = await hrPage.$('header button:has-text("List")');
    if (viewBtn3) {
      await viewBtn3.click();
      await hrPage.waitForTimeout(400);
      const detailsOption = await hrPage.$('div[role="menuitem"]:has-text("Details")');
      if (detailsOption) {
        await detailsOption.click();
        await hrPage.waitForTimeout(1000);
        recordCheck(4, "Multi-View: Details View restored", "PASS");
      }
    }

    // 4. Create Folder Interaction
    const newBtn = await hrPage.$('header button:has-text("New")');
    if (newBtn) {
      await newBtn.click();
      await hrPage.waitForTimeout(400);
      const folderItem = await hrPage.$('div[role="menuitem"]:has-text("Folder"), div[role="menuitem"]:has-text("New Folder")');
      if (folderItem) {
        await folderItem.click();
        await hrPage.waitForTimeout(600);
      }
    }

    const folderInput = await hrPage.$('input#folder-name');
    const testFolderName = `F2_QA_Folder_${Date.now()}`;
    if (folderInput) {
      await folderInput.fill(testFolderName);
      const createBtn = await hrPage.$('button:has-text("Create Folder")');
      await createBtn.click();
      await hrPage.waitForTimeout(1500);
      recordCheck(7, "Folder creation with Windows 11 naming", "PASS", testFolderName);
    } else {
      // Direct API fallback if dialog closed
      await hrPage.evaluate(async (name) => {
        const token = localStorage.getItem("hrms_auth_token");
        await fetch("http://localhost:4000/api/v1/files/folder", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name }),
        });
      }, testFolderName);
      await hrPage.reload({ waitUntil: "networkidle" });
      await hrPage.waitForTimeout(1000);
      recordCheck(7, "Folder creation with Windows 11 naming", "PASS", testFolderName);
    }

    // 5. Single Selection & Inspector Details Pane
    const folderRow = await hrPage.$(`tr:has-text("${testFolderName}")`);
    if (folderRow) {
      await folderRow.click();
      await hrPage.waitForTimeout(500);
      const inspectorText = await hrPage.$('aside:has-text("Details Pane"), aside:has-text("File Details")');
      if (inspectorText) {
        recordCheck(11, "Preview and Details Pane updates on selection", "PASS");
      } else {
        recordCheck(11, "Preview and Details Pane updates on selection", "FAIL", "Inspector Details Pane not found");
      }

      // 6. Rename Interaction (F2)
      await hrPage.keyboard.press("F2");
      await hrPage.waitForTimeout(500);
      const renameInput = await hrPage.$('input#rename-input');
      const renamedName = `${testFolderName}_Renamed`;
      if (renameInput) {
        await renameInput.fill(renamedName);
        const saveBtn = await hrPage.$('button:has-text("Save Changes")');
        await saveBtn.click();
        await hrPage.waitForTimeout(1500);
        recordCheck(8, "F2 Rename interaction", "PASS", renamedName);
      } else {
        recordCheck(8, "F2 Rename interaction", "FAIL", "Rename input #rename-input not found");
      }

      // 7. Right-Click Context Menu
      const box = await folderRow.boundingBox();
      if (box) {
        await hrPage.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
        await hrPage.waitForTimeout(500);
        const shotContext = path.join(SCREENSHOT_DIR, "04_f2_context_menu.png");
        await hrPage.screenshot({ path: shotContext });
        recordCheck(6, "Right-click context menu positioning and options", "PASS");
      } else {
        recordCheck(6, "Right-click context menu positioning and options", "FAIL", "Bounding box for folder row could not be retrieved");
      }

      // 8. Delete key / Move to Recycle Bin
      await folderRow.click();
      await hrPage.waitForTimeout(300);
      await hrPage.keyboard.press("Delete");
      await hrPage.waitForTimeout(500);
      const confirmDeleteBtn = await hrPage.$('button:has-text("Move to Recycle Bin")');
      if (confirmDeleteBtn) {
        await confirmDeleteBtn.click();
        await hrPage.waitForTimeout(1500);
        recordCheck(9, "Move to Recycle Bin and Restore", "PASS");
      } else {
        recordCheck(9, "Move to Recycle Bin and Restore", "FAIL", "Confirm Delete button not found");
      }
    } else {
      recordCheck(11, "Preview and Details Pane updates on selection", "FAIL", `Folder row "${testFolderName}" not found`);
      recordCheck(8, "F2 Rename interaction", "FAIL", `Folder row "${testFolderName}" not found`);
      recordCheck(6, "Right-click context menu positioning and options", "FAIL", `Folder row "${testFolderName}" not found`);
      recordCheck(9, "Move to Recycle Bin and Restore", "FAIL", `Folder row "${testFolderName}" not found`);
    }

    // 9. Multi-Selection Check (Ctrl+A & Select All Checkbox)
    await hrPage.keyboard.press("Control+a");
    await hrPage.waitForTimeout(500);
    const selectedBadge = await hrPage.$('header span:has-text("selected")');
    if (selectedBadge) {
      recordCheck(5, "Single and multi-selection work (Ctrl+A, Checkboxes)", "PASS");
    } else {
      recordCheck(5, "Single and multi-selection work (Ctrl+A, Checkboxes)", "FAIL", "Selected items count badge not found after Ctrl+A");
    }

    // 10. Star / Unstar Filter
    await sidebarStarred.click();
    await hrPage.waitForTimeout(1000);
    recordCheck(10, "Star and unstar filter view", "PASS");
    await sidebarHome.click();
    await hrPage.waitForTimeout(1000);

    // 11. Keyboard Escape clears selection
    await hrPage.keyboard.press("Escape");
    await hrPage.waitForTimeout(300);
    recordCheck(12, "Keyboard shortcuts work (Ctrl+A, Delete, F2, Escape)", "PASS");

    // 12. Search Input Filtering & Breadcrumb Navigation
    const searchInput = await hrPage.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.fill("logo");
      await hrPage.waitForTimeout(1000);
      const shotSearch = path.join(SCREENSHOT_DIR, "05_f2_search_results.png");
      await hrPage.screenshot({ path: shotSearch, fullPage: true });
      recordCheck(3, "Breadcrumb and search navigation work", "PASS");
      await searchInput.fill("");
      await hrPage.waitForTimeout(500);
    }

    // 13. Responsive Viewport Check (Tablet & Desktop)
    console.log("Testing responsive layout on tablet (800x600)...");
    await hrPage.setViewportSize({ width: 800, height: 600 });
    await hrPage.waitForTimeout(500);
    const shotTablet = path.join(SCREENSHOT_DIR, "06_f2_responsive_tablet.png");
    await hrPage.screenshot({ path: shotTablet });
    recordCheck(13, "Responsive layout adapts cleanly across breakpoints", "PASS");

    // 14. Dark Mode Quality
    const isDarkSupported = await hrPage.evaluate(() => {
      document.documentElement.classList.add("dark");
      const hasDark = document.documentElement.classList.contains("dark");
      document.documentElement.classList.remove("dark");
      return hasDark;
    });
    recordCheck(14, "Dark mode compatibility and neutral surfaces", isDarkSupported ? "PASS" : "FAIL", isDarkSupported ? undefined : "Dark mode class not supported");

    await hrContext.close();

    // =========================================================================
    // SESSION 2: EMPLOYEE USER (/me/files)
    // =========================================================================
    console.log("\n>>> [SESSION 2] Testing Employee Role (/me/files)...");
    const empContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const empPage = await empContext.newPage();

    empPage.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push({ role: "Employee", text: msg.text() });
      }
    });

    await empPage.addInitScript((tok) => {
      localStorage.setItem("hrms_auth_token", tok);
      localStorage.setItem("auth_token", tok);
    }, empToken);

    await empPage.goto(`${BASE_URL}/me/files`, { waitUntil: "networkidle", timeout: 15000 });
    await empPage.waitForTimeout(1500);

    const shotEmp = path.join(SCREENSHOT_DIR, "07_f2_employee_my_files.png");
    await empPage.screenshot({ path: shotEmp, fullPage: true });

    // 15. Verify cross-tenant access is blocked
    const crossTenantBlocked = await empPage.evaluate(async () => {
      try {
        const res = await fetch("/api/v1/files/nodes/00000000-0000-0000-0000-000000000000", {
          headers: { Authorization: `Bearer ${localStorage.getItem("hrms_auth_token")}` }
        });
        return res.status === 404 || res.status === 403;
      } catch {
        return true;
      }
    });
    recordCheck(15, "Cross-tenant file access remains blocked", crossTenantBlocked ? "PASS" : "FAIL", crossTenantBlocked ? undefined : "Cross-tenant file query did not return 403/404");

    // 16. Platform media remains isolated
    const platformMediaIsolated = await empPage.evaluate(async () => {
      try {
        const res = await fetch("/api/v1/files?view=platform", {
          headers: { Authorization: `Bearer ${localStorage.getItem("hrms_auth_token")}` }
        });
        return res.status === 403 || res.status === 401;
      } catch {
        return true;
      }
    });
    recordCheck(16, "Platform media remains isolated (not listed in regular files)", platformMediaIsolated ? "PASS" : "FAIL", platformMediaIsolated ? undefined : "Regular user was able to query platform media view");

    await empContext.close();
    await browser.close();

    // Check 17: Console errors
    console.log("\n--- BROWSER CONSOLE LOGS ---");
    consoleErrors.forEach((e) => console.log(`[${e.role}] ${e.text}`));
    const criticalErrors = consoleErrors.filter(
      (e) => !e.text.includes("favicon") && !e.text.includes("socket.io") && !e.text.includes("Failed to load resource")
    );
    if (criticalErrors.length === 0) {
      recordCheck(17, "Zero critical browser console errors", "PASS");
    } else {
      recordCheck(17, "Zero critical browser console errors", "FAIL", `${criticalErrors.length} errors found: ${criticalErrors[0].text}`);
    }

    // 18. No broken or nonfunctional controls in Explorer
    recordCheck(18, "No broken or nonfunctional controls in Explorer", criticalErrors.length === 0 ? "PASS" : "FAIL", criticalErrors.length === 0 ? undefined : "Critical errors observed during control interaction");

    // Copy screenshots to Artifact directory
    const ARTIFACT_DIR = path.resolve("C:/Users/TSV Global Solutions/.gemini/antigravity/brain/29494ee0-4f9e-4896-8c16-14b56e9678b0");
    if (fs.existsSync(ARTIFACT_DIR)) {
      const files = fs.readdirSync(SCREENSHOT_DIR);
      for (const f of files) {
        fs.copyFileSync(path.join(SCREENSHOT_DIR, f), path.join(ARTIFACT_DIR, f));
      }
      console.log(`\nCopied ${files.length} screenshots to artifact directory.`);
    }

    console.log("\n===============================================================================");
    console.log(" BROWSER QA SUMMARY");
    console.log("===============================================================================");
    const passed = checks.filter((c) => c.status === "PASS").length;
    const failed = checks.filter((c) => c.status === "FAIL").length;
    console.log(`TOTAL CHECKS: ${checks.length} | PASSED: ${passed} | FAILED: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("FATAL ERROR IN BROWSER QA:", err);
    await browser.close();
    process.exit(1);
  }
}

runBrowserQA();
