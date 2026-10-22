import React from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import PageAnimate from '/src/components/Animation/PageAnimate';

export const RoutePage = ({ component: Component, path }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeProps = {
    history: {
      push: (to) => navigate({ to }),
      replace: (to) => navigate({ to, replace: true }),
    },
    location,
    match: {
      path,
      url: location.pathname,
      params: {},
    },
  };

  return <Component {...routeProps} />;
};

export const AnimatedRoutePage = (props) => (
  <PageAnimate>
    <RoutePage {...props} />
  </PageAnimate>
);
