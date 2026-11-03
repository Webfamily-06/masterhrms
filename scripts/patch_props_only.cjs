const fs = require('fs');
const file = 'src/components/navigation/portal-sidebar.tsx';
let code = fs.readFileSync(file, 'utf8');

const target1 = `interface PortalSidebarProps {
  portal: PortalId;
}`;

const target1CRLF = target1.replace(/\n/g, '\r\n');

const rep1 = `export interface PortalSidebarProps {
  portal?: PortalId;
  profile?: any;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  fullView?: boolean;
  onToggleFullView?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}`;

const rep1CRLF = rep1.replace(/\n/g, '\r\n');

if (code.includes(target1CRLF)) {
  code = code.replace(target1CRLF, rep1CRLF);
} else if (code.includes(target1)) {
  code = code.replace(target1, rep1);
} else {
  console.error('Target 1 not found');
  process.exit(1);
}

// Also update navItems portal resolution
const target2 = `  // Navigation items for this portal
  const navItems = getNavigationForPortal(portal, {`;
const target2CRLF = target2.replace(/\n/g, '\r\n');

const rep2 = `  if (fullView) {
    return null;
  }

  // Auto-detect portal if not explicitly provided
  let activePortal = portal;
  if (!activePortal) {
    if (currentPath.startsWith("/hr")) activePortal = "hr";
    else if (currentPath.startsWith("/super")) activePortal = "sa";
    else if (currentPath.startsWith("/tenant")) activePortal = "tenant";
    else if (currentPath.startsWith("/me")) activePortal = "me";
    else if (auth.isTenantAdmin || auth.roles?.some((r) => r.includes("admin") || r.includes("hr"))) activePortal = "hr";
    else activePortal = "me";
  }

  // Navigation items for this portal
  const navItems = getNavigationForPortal(activePortal, {`;
const rep2CRLF = rep2.replace(/\n/g, '\r\n');

if (code.includes(target2CRLF)) {
  code = code.replace(target2CRLF, rep2CRLF);
} else if (code.includes(target2)) {
  code = code.replace(target2, rep2);
}

fs.writeFileSync(file, code, 'utf8');
console.log('Successfully updated PortalSidebarProps definition');

