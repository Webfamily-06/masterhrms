const fs = require('fs');

// 1. Update src/components/navigation/portal-sidebar.tsx
const portalSidebarPath = 'src/components/navigation/portal-sidebar.tsx';
let portalSidebar = fs.readFileSync(portalSidebarPath, 'utf8');

const targetProps = `interface PortalSidebarProps {
  portal: PortalId;
}`;

const replacementProps = `export interface PortalSidebarProps {
  portal?: PortalId;
  profile?: any;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  fullView?: boolean;
  onToggleFullView?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}`;

portalSidebar = portalSidebar.replace(targetProps, replacementProps);
portalSidebar = portalSidebar.replace(
  'export function PortalSidebar({ portal }: PortalSidebarProps) {',
  `export function PortalSidebar({
  portal,
  profile,
  collapsed = false,
  onToggleCollapse,
  fullView = false,
  onToggleFullView,
  mobileOpen = false,
  onCloseMobile,
}: PortalSidebarProps) {`
);

const targetNavItems = `  // Navigation items for this portal
  const navItems = getNavigationForPortal(portal, {`;

const replacementNavItems = `  if (fullView) {
    return null;
  }

  // Auto-detect portal if not explicitly provided
  let activePortal = portal;
  if (!activePortal) {
    if (currentPath.startsWith("/hr")) activePortal = "hr";
    else if (currentPath.startsWith("/super")) activePortal = "sa";
    else if (currentPath.startsWith("/tenant")) activePortal = "tenant";
    else if (currentPath.startsWith("/me")) activePortal = "me";
    else if (auth.isTenantAdmin || auth.roles.some((r) => r.includes("admin") || r.includes("hr"))) activePortal = "hr";
    else activePortal = "me";
  }

  // Navigation items for this portal
  const navItems = getNavigationForPortal(activePortal, {`;

portalSidebar = portalSidebar.replace(targetNavItems, replacementNavItems);

// Support mobile drawer overlay and close on navigation
const targetSidebarTag = '<Sidebar className="border-r border-border/80 bg-card">';
const replacementSidebarTag = `{mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <Sidebar
        className={cn(
          "border-r border-border/80 bg-card transition-all duration-200 z-50",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-16" : "w-64"
        )}
      >`;

portalSidebar = portalSidebar.replace(targetSidebarTag, replacementSidebarTag);
fs.writeFileSync(portalSidebarPath, portalSidebar, 'utf8');
console.log('Successfully updated PortalSidebar');

// 2. Update src/routes/_authenticated/_app/route.tsx
const appRoutePath = 'src/routes/_authenticated/_app/route.tsx';
let appRoute = fs.readFileSync(appRoutePath, 'utf8');

appRoute = appRoute.replace(
  'import { DreamsSidebar } from "@/components/dreams-sidebar";',
  'import { PortalSidebar } from "@/components/navigation/portal-sidebar";'
);
appRoute = appRoute.replace(
  '<DreamsSidebar\r\n        profile={profile}',
  '<PortalSidebar\r\n        profile={profile}'
);
appRoute = appRoute.replace(
  '<DreamsSidebar\n        profile={profile}',
  '<PortalSidebar\n        profile={profile}'
);
fs.writeFileSync(appRoutePath, appRoute, 'utf8');
console.log('Successfully updated AppShell route with PortalSidebar');

// 3. Archive dreams-sidebar.tsx
const dreamsPath = 'src/components/dreams-sidebar.tsx';
const archivedDreams = `/**
 * @deprecated Archived under TASK-P1-17 (GAP-UI-010).
 * Replaced by typed PortalSidebar in '@/components/navigation/portal-sidebar'.
 */
import { PortalSidebar } from "@/components/navigation/portal-sidebar";

export const DreamsSidebar = PortalSidebar;
export default PortalSidebar;
`;
fs.writeFileSync(dreamsPath, archivedDreams, 'utf8');
console.log('Successfully archived dreams-sidebar.tsx');

