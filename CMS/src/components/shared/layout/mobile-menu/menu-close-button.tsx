'use client';

import { useMobileMenuContext } from '@/src/context/MobileMenuContext';

const MenuCloseButton = () => {
  const { closeMenu } = useMobileMenuContext();

  return (
    <button
      type="button"
      onClick={closeMenu}
      className="nav-hamburger-close bg-secondary/10 hover:bg-secondary/20 relative flex size-10 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-full transition-colors duration-200"
    >
      <span className="sr-only">Close Menu</span>
      <span className="bg-secondary absolute block h-0.5 w-4 rotate-45" />
      <span className="bg-secondary absolute block h-0.5 w-4 -rotate-45" />
    </button>
  );
};

MenuCloseButton.displayName = 'MenuCloseButton';
export default MenuCloseButton;
