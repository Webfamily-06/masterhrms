'use client';

import { createPortal } from 'react-dom';
import { Panel } from './panel';
import { useAnimation } from './use-animation';

export type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { backdropRef, panelRef, registerItem, close } = useAnimation({ open, onClose });

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4" aria-hidden={false}>
      <div
        ref={backdropRef}
        className="absolute inset-0 z-0 bg-secondary/35 backdrop-blur-[14px]"
        onClick={close}
      />
      <Panel panelRef={panelRef} registerItem={registerItem} onClose={close} />
    </div>,
    document.body
  );
}
