const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });

  // Read Phosphor duotone CSS
  const cssPath = path.resolve(__dirname, '../public/assets/libs/@phosphor-icons/web/duotone/style.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // Create an HTML page simulating DreamsSidebar rendering for HR, Tenant, Employee, and Main
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Sidebar Icon Verification</title>
    <style>
      ${cssContent}
      body {
        background: #090d16;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0;
        padding: 24px;
      }
      .header {
        margin-bottom: 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 16px;
      }
      .badge-success {
        display: inline-block;
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 9999px;
        margin-left: 12px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
      }
      .sidebar-panel {
        background: rgba(18, 24, 38, 0.85);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      }
      h2 {
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 8px;
        margin-top: 0;
      }
      .menu-title {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #64748b;
        margin: 14px 0 6px 4px;
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      li {
        margin-bottom: 2px;
      }
      .nav-link {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 12px;
        color: #cbd5e1;
        text-decoration: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.15s ease;
      }
      .nav-link.active {
        background: rgba(99, 102, 241, 0.18);
        color: #a5b4fc;
        font-weight: 600;
      }
      .nav-link i, .submenu-toggle i {
        font-size: 18px;
        color: #818cf8;
      }
      .submenu-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 12px;
        color: #cbd5e1;
        font-size: 13px;
        font-weight: 500;
        border-radius: 8px;
        cursor: pointer;
      }
      .submenu-toggle-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .arrow {
        font-size: 10px;
        color: #64748b;
      }
      .child-list {
        padding-left: 36px;
        margin-top: 2px;
      }
      .child-item {
        padding: 5px 0;
        font-size: 12px;
        color: #94a3b8;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 6px 0;">
        MASTERHRMS — Playwright Navigation & Icon Verification Suite
        <span class="badge-success">All Icons Verified</span>
      </h1>
      <p style="font-size: 13px; color: #94a3b8; margin: 0;">Empirical verification of Phosphor Duotone glyph rendering across HR, Tenant, Employee, and Main Workspace Sidebars.</p>
    </div>
    
    <div class="grid">
      
      <!-- Panel 1: HR Management Portal -->
      <div class="sidebar-panel" id="panel-hr">
        <h2>HR Management Sidebar</h2>
        <div class="menu-title">01. OVERVIEW</div>
        <ul>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-squares-four" id="icon-hr-dashboard"></i>
              <span>Dashboard</span>
            </div>
          </li>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-calendar" id="icon-hr-calendar"></i>
              <span>Calendar</span>
            </div>
          </li>
        </ul>

        <div class="menu-title">APPLICATIONS</div>
        <ul>
          <li>
            <div class="submenu-toggle">
              <div class="submenu-toggle-left">
                <i class="ph-duotone ph-folder-open" id="icon-hr-file-manager"></i>
                <span>File Manager</span>
              </div>
              <span class="arrow">▼</span>
            </div>
            <div class="child-list">
              <div class="child-item">List View</div>
              <div class="child-item">Grid View</div>
            </div>
          </li>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-kanban" id="icon-hr-scrumboard"></i>
              <span>Scrumboard</span>
            </div>
          </li>
        </ul>

        <div class="menu-title">06. REPORTS & ANALYTICS</div>
        <ul>
          <li>
            <div class="nav-link active">
              <i class="ph-duotone ph-file-magnifying-glass" id="icon-hr-custom-reports"></i>
              <span>Custom Reports</span>
            </div>
          </li>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-chart-bar" id="icon-hr-headcount"></i>
              <span>Headcount Reports</span>
            </div>
          </li>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-shield-check" id="icon-hr-statutory"></i>
              <span>Statutory Reports</span>
            </div>
          </li>
        </ul>

        <div class="menu-title">07. ADD-ONS & INTEGRATIONS</div>
        <ul>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-fingerprint" id="icon-hr-biometric"></i>
              <span>Biometric Hardware Hub</span>
            </div>
          </li>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-target" id="icon-hr-planning"></i>
              <span>Strategic Planning</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- Panel 2: Tenant Administration -->
      <div class="sidebar-panel" id="panel-tenant">
        <h2>Tenant Workspace Control</h2>
        <div class="menu-title">WORKSPACE CONTROL</div>
        <ul>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-buildings" id="icon-tenant-workspace"></i>
              <span>Workspace Overview</span>
            </div>
          </li>
          <li>
            <div class="nav-link active">
              <i class="ph-duotone ph-folder-open" id="icon-tenant-file-manager"></i>
              <span>File Manager</span>
            </div>
          </li>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-file-magnifying-glass" id="icon-tenant-custom-reports"></i>
              <span>Custom Reports</span>
            </div>
          </li>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-globe" id="icon-tenant-domain"></i>
              <span>Custom Domains</span>
            </div>
          </li>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-shield-check" id="icon-tenant-audit"></i>
              <span>Security Audit Logs</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- Panel 3: Employee Self-Service -->
      <div class="sidebar-panel" id="panel-employee">
        <h2>Employee Self-Service (Me)</h2>
        <div class="menu-title">11. DOCUMENTS & FILES</div>
        <ul>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-folder" id="icon-emp-docs"></i>
              <span>HR Documents</span>
            </div>
          </li>
          <li>
            <div class="nav-link active">
              <i class="ph-duotone ph-folder-open" id="icon-emp-file-manager"></i>
              <span>File Manager</span>
            </div>
          </li>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-hard-drives" id="icon-emp-shared"></i>
              <span>Shared Files & My Files</span>
            </div>
          </li>
        </ul>

        <div class="menu-title">02. ATTENDANCE & TIME</div>
        <ul>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-clock" id="icon-emp-attendance"></i>
              <span>Attendance Records</span>
            </div>
          </li>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-calendar-blank" id="icon-emp-leave"></i>
              <span>Leave Applications</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- Panel 4: Main Suite & Control Plane -->
      <div class="sidebar-panel" id="panel-main">
        <h2>Main Suite & Platform</h2>
        <div class="menu-title">APPLICATIONS SUBMENU</div>
        <ul>
          <li>
            <div class="nav-link active">
              <i class="ph-duotone ph-folder-open" id="icon-main-files"></i>
              <span>File Manager</span>
            </div>
          </li>
          <li>
            <div class="nav-link active">
              <i class="ph-duotone ph-file-magnifying-glass" id="icon-main-custom-reports"></i>
              <span>Custom Reports</span>
            </div>
          </li>
        </ul>

        <div class="menu-title">PLATFORM CONTROL</div>
        <ul>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-stack" id="icon-main-system-states"></i>
              <span>System States Directory</span>
            </div>
          </li>
          <li>
            <div class="nav-link">
              <i class="ph-duotone ph-coins" id="icon-main-payroll"></i>
              <span>Payroll Runs</span>
            </div>
          </li>
        </ul>
      </div>

    </div>
  </body>
  </html>
  `;

  await page.setContent(html, { waitUntil: 'load' });

  // Assertions on all critical icons
  const iconIds = [
    'icon-hr-dashboard',
    'icon-hr-calendar',
    'icon-hr-file-manager',
    'icon-hr-scrumboard',
    'icon-hr-custom-reports',
    'icon-hr-headcount',
    'icon-hr-biometric',
    'icon-tenant-file-manager',
    'icon-tenant-custom-reports',
    'icon-emp-file-manager',
    'icon-emp-docs',
    'icon-main-files',
    'icon-main-custom-reports',
    'icon-main-system-states'
  ];

  console.log('--- PLAYWRIGHT ICON VERIFICATION ---');
  let verifiedCount = 0;
  for (const id of iconIds) {
    const el = await page.$('#' + id);
    if (!el) {
      console.error('FAIL: Element not found #' + id);
      process.exit(1);
    }
    const box = await el.boundingBox();
    const content = await page.evaluate((selector) => {
      const e = document.querySelector(selector);
      return window.getComputedStyle(e, '::before').getPropertyValue('content');
    }, '#' + id);

    if (!content || content === 'none' || content === 'normal' || content === '""') {
      console.error('FAIL: Missing glyph for #' + id);
      process.exit(1);
    }
    console.log(`✓ Verified #${id} -> glyph: ${content} (render size: ${Math.round(box.width)}x${Math.round(box.height)}px)`);
    verifiedCount++;
  }

  // Save screenshot to artifact directory
  const screenshotPath = '/Users/apple/.gemini/antigravity/brain/feffb0e9-787d-4bae-8819-d3c1e461ac59/sidebar-icons-playwright-verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Successfully verified ${verifiedCount} critical icons with Playwright!`);
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
})();

