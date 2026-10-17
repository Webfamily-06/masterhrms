'use client';

import {
  createContext,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { OrbitContextValue, OrbitItemRefEntry } from './orbit-types';

const OrbitContext = createContext<OrbitContextValue | null>(null);

export const useOrbitContext = () => {
  const context = useContext(OrbitContext);
  if (!context) {
    throw new Error('Orbit components must be used within LogoOrbit');
  }
  return context;
};

type OrbitProviderProps = {
  children: ReactNode;
  speed?: number;
  orbitSize?: number;
};

export const OrbitProvider = ({ children, speed = 0.3, orbitSize }: OrbitProviderProps) => {
  const orbitRingRef = useRef<HTMLDivElement>(null);
  const orbitHubRef = useRef<HTMLDivElement>(null);
  const orbitItemRefs = useRef<OrbitItemRefEntry[]>([]);
  const [itemVersion, setItemVersion] = useState(0);

  const registerItem = useCallback(
    (
      orbitPivotRef: RefObject<HTMLDivElement | null>,
      orbitItemRef: RefObject<HTMLDivElement | null>,
    ): OrbitItemRefEntry => {
      const entry = { orbitPivotRef, orbitItemRef };
      orbitItemRefs.current = [...orbitItemRefs.current, entry];
      setItemVersion((version) => version + 1);
      return entry;
    },
    [],
  );

  const unregisterItem = useCallback((entry: OrbitItemRefEntry) => {
    orbitItemRefs.current = orbitItemRefs.current.filter((item) => item !== entry);
    setItemVersion((version) => version + 1);
  }, []);

  const value = useMemo<OrbitContextValue>(
    () => ({
      orbitRingRef,
      orbitHubRef,
      orbitItemRefs,
      registerItem,
      unregisterItem,
      itemVersion,
      speed,
      orbitSize,
    }),
    [registerItem, unregisterItem, itemVersion, speed, orbitSize],
  );

  return (
    <OrbitContext.Provider value={value}>
      {children}
    </OrbitContext.Provider>
  );
};
