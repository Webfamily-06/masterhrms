'use client';

import {
  AboutIcon,
  BlogIcon,
  ContactIcon,
  FeatureIcon,
  ServiceIcon,
  TeamIcon,
} from '@/src/components/shared/icon/menu-icon';
import { InnerPagesMenuLink } from '@/src/components/shared/layout/navbar/inner-pages-menu-link';
import { cn } from '@/src/utils/cn';
import type { ComponentType } from 'react';

interface InnerLink {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

const MENU_INNER_PAGES_ID = 'resources-dropdown-menu-v2';

const innerPageLinks: InnerLink[] = [
  { label: 'About us', href: '/about', icon: AboutIcon },
  { label: 'Features', href: '#', icon: FeatureIcon },
  { label: 'Services', href: '/services', icon: ServiceIcon },
  { label: 'Team', href: '/team', icon: TeamIcon },
  { label: 'Blog', href: '/blog', icon: BlogIcon },
  { label: 'Contact', href: '/contact', icon: ContactIcon },
];

interface InnerPagesMenuProps {
  menuDropdownId: string | null;
  setMenuDropdownId: (id: string | null) => void;
}

export const InnerPagesMenu = ({ menuDropdownId, setMenuDropdownId }: InnerPagesMenuProps) => {
  const handleClose = () => setMenuDropdownId(null);
  const isOpen = menuDropdownId === MENU_INNER_PAGES_ID;

  return (
    <div>
      <div className="dropdown-menu-bridge pointer-events-none absolute top-full left-1/2 z-40 h-3 w-full min-w-[280px] -translate-x-1/2 bg-transparent transition-opacity duration-300" />
      <ul
        id={MENU_INNER_PAGES_ID}
        className={cn(
          'dropdown-menu shadow-14 border-stroke-1 absolute top-full left-1/2 z-50 mt-2 w-[280px] -translate-x-1/2 rounded-[20px] border bg-white p-3 transition-all duration-300',
          isOpen && 'active'
        )}
      >
        {innerPageLinks.map((link) => (
          <InnerPagesMenuLink key={link.label} {...link} onClose={handleClose} />
        ))}
      </ul>
    </div>
  );
};
