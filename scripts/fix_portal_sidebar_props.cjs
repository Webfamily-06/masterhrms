const fs = require('fs');
const file = 'src/components/navigation/portal-sidebar.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `interface PortalSidebarProps {
  portal: PortalId;
}

export function PortalSidebar({
  portal,
  profile,
  collapsed = false,
  onToggleCollapse,
  fullView = false,
  onToggleFullView,
  mobileOpen = false,
  onCloseMobile,
}: PortalSidebarProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const navigate = useNavigate();
  const auth = getClientAuthState();
  const { branding } = useTenantBranding();

  // Navigation items for this portal
  const navItems = getNavigationForPortal(portal, {`;

const replacement = `export interface PortalSidebarProps {
  portal?: PortalId;
  profile?: any;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  fullView?: boolean;
  onToggleFullView?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function PortalSidebar({
  portal,
  profile,
  collapsed = false,
  onToggleCollapse,
  fullView = false,
  onToggleFullView,
  mobileOpen = false,
  onCloseMobile,
}: PortalSidebarProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const navigate = useNavigate();
  const auth = getClientAuthState();
  const { branding } = useTenantBranding();

  if (fullView) {
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

const targetCRLF = target.replace(/\n/g, '\r\n');
const replacementCRLF = replacement.replace(/\n/g, '\r\n');

if (code.includes(targetCRLF)) {
  code = code.replace(targetCRLF, replacementCRLF);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Successfully updated PortalSidebarProps (CRLF)');
} else if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Successfully updated PortalSidebarProps (LF)');
} else {
  console.error('Target block not found in portal-sidebar.tsx');
  process.exit(1);
}

