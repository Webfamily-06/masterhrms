import React, { Suspense } from 'react';
import { Outlet, createFileRoute } from '@tanstack/react-router';
import LayoutClassic from '/src/layout/MainLayout/ClassicLayout';

export const Route = createFileRoute('/_app')({
  component: AppLayoutRoute,
});

function AppLayoutRoute() {
  return (
    <Suspense
      fallback={
        <div className="preloader-it">
          <div className="loader-pendulums" />
        </div>
      }
    >
      <LayoutClassic>
        <Outlet />
      </LayoutClassic>
    </Suspense>
  );
}
