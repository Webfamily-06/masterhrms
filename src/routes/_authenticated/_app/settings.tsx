import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/settings")({
  beforeLoad: ({ location }) => {
    // Legacy route forward: redirect /settings directly to canonical HR Settings
    if (location.pathname === "/settings" || location.pathname === "/settings/") {
      throw redirect({ to: "/hr/settings" });
    }
  },
  component: LegacySettingsLayout,
});

function LegacySettingsLayout() {
  return <Outlet />;
}

export default LegacySettingsLayout;
