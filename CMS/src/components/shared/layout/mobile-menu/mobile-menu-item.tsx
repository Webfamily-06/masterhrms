'use client';

import { useMobileMenuContext } from '@/src/context/MobileMenuContext';
import { cn } from '@/src/utils/cn';
import { ReactNode } from 'react';

interface MobileMenuItemProps {
  id: string;
  title: string;
  children?: ReactNode;
  hasSubmenu?: boolean;
}

const MobileMenuItem = ({ id, title, children, hasSubmenu = false }: MobileMenuItemProps) => {
  const { activeSubmenu, toggleSubmenu } = useMobileMenuContext();
  const isActive = activeSubmenu === id;

  return (
    <li className="space-y-2">
      <button
        type="button"
        onClick={() => hasSubmenu && toggleSubmenu(id)}
        data-menu={id}
        data-selected={isActive ? true : undefined}
        className="group mobile-menu-toggle flex w-full cursor-pointer items-center justify-between py-2.5 text-left font-normal data-[selected=true]:font-medium"
        aria-expanded={hasSubmenu ? isActive : undefined}
        aria-controls={hasSubmenu ? `submenu-${id}` : undefined}
      >
        <span className="font-sora text-tagline-2 text-secondary/90 group-data-[selected=true]:text-secondary block">
          {title}
        </span>
        {hasSubmenu && (
          <span
            className={cn('menu-arrow transition-transform duration-300', isActive && 'rotate-90')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="none"
              className="stroke-secondary/90 size-5"
            >
              <path
                d="M10 12L14 8L10 4"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </button>

      {hasSubmenu && children && (
        <ul
          id={`submenu-${id}`}
          data-submenu={id}
          className={cn('mobile-submenu', isActive ? 'block' : 'hidden')}
        >
          {children}
        </ul>
      )}
    </li>
  );
};

MobileMenuItem.displayName = 'MobileMenuItem';
export default MobileMenuItem;
