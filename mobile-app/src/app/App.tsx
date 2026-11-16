import React from 'react';
import { AppProviders } from './providers/AppProviders';
import { AppBootstrap } from './bootstrap/AppBootstrap';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <AppBootstrap />
    </AppProviders>
  );
};

export default App;
