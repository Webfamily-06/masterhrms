import type { RefObject } from 'react';

export type OrbitItemRefEntry = {
  orbitPivotRef: RefObject<HTMLDivElement | null>;
  orbitItemRef: RefObject<HTMLDivElement | null>;
};

export type OrbitContextValue = {
  orbitRingRef: RefObject<HTMLDivElement | null>;
  orbitHubRef: RefObject<HTMLDivElement | null>;
  orbitItemRefs: RefObject<OrbitItemRefEntry[]>;
  registerItem: (
    orbitPivotRef: RefObject<HTMLDivElement | null>,
    orbitItemRef: RefObject<HTMLDivElement | null>,
  ) => OrbitItemRefEntry;
  unregisterItem: (entry: OrbitItemRefEntry) => void;
  itemVersion: number;
  speed: number;
  orbitSize?: number;
};
