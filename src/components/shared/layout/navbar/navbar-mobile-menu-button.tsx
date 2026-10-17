'use client';

import { useMobileMenuContext } from '@/src/context/MobileMenuContext';

export const NavbarMobileMenuButton = () => {
  const { openMenu } = useMobileMenuContext();

  return (
    <div className="block xl:hidden">
      <button
        type="button"
        onClick={openMenu}
        className="nav-hamburger bg-background-4 flex size-12 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-full"
        aria-label="Open menu"
      >
        <span className="sr-only">Menu</span>
        <span className="bg-stroke-9 block h-0.5 w-6" />
        <span className="bg-stroke-9 block h-0.5 w-6" />
        <span className="bg-stroke-9 block h-0.5 w-6" />
      </button>
    </div>
  );
};
