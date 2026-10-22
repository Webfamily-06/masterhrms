import React from 'react';
import { Navigate, Outlet, createRootRoute } from '@tanstack/react-router';
import ScrollToTop from '/src/utils/ScrollToTop';

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <Navigate to="/error-404" replace />,
});

function RootComponent() {
  return (
    <ScrollToTop>
      <Outlet />
    </ScrollToTop>
  );
}
