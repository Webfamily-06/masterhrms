import React, { Suspense } from 'react';
import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AnimatePresence } from 'framer-motion';
import classNames from 'classnames';
import { useRouteMatch } from '/src/utils/router-compat.jsx';

export const Route = createFileRoute('/_auth')({
  component: AuthLayoutRoute,
});

function AuthLayoutRoute() {
  const lockScreenAuth = useRouteMatch('/auth/lock-screen');

  return (
    <AnimatePresence>
      <Suspense
        fallback={
          <div className="preloader-it">
            <div className="loader-pendulums" />
          </div>
        }
      >
        <div className={classNames('hk-wrapper hk-pg-auth', { 'bg-primary-dark-3': lockScreenAuth })} data-footer="simple">
          <Outlet />
        </div>
      </Suspense>
    </AnimatePresence>
  );
}
