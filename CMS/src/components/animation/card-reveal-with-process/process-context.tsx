'use client';

import { createContext, ReactNode, useContext } from 'react';
import type { ProcessContextValue } from './process-types';
import { useProcessController } from './use-process-controller';

const ProcessContext = createContext<ProcessContextValue | null>(null);

export const useProcessContext = () => {
  const context = useContext(ProcessContext);
  if (!context) {
    throw new Error('useProcessContext must be used within ProcessProvider');
  }
  return context;
};

type ProcessProviderProps = {
  cardCount: number;
  children: ReactNode;
};

export const ProcessProvider = ({ cardCount, children }: ProcessProviderProps) => {
  const value = useProcessController(cardCount);
  return <ProcessContext.Provider value={value}>{children}</ProcessContext.Provider>;
};
