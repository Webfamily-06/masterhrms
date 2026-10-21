'use client';
import {  createFileRoute, Outlet, redirect  } from "@/src/lib/router-compat";



function LegacySettingsLayout() {
  return <Outlet />;
}

export default LegacySettingsLayout;
