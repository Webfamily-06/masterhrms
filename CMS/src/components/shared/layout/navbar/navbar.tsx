'use client';

import RevealAnimation from '@/src/components/animation/reveal-animation';
import MobileMenu from '@/src/components/shared/layout/mobile-menu/mobile-menu';
import { CompanyMenu } from '@/src/components/shared/layout/navbar/company-menu';
import { InnerPagesMenu } from '@/src/components/shared/layout/navbar/inner-pages-menu';
import { NavChevron } from '@/src/components/shared/layout/navbar/nav-chevron';
import { NavbarMobileMenuButton } from '@/src/components/shared/layout/navbar/navbar-mobile-menu-button';
import { PlanAndSupportMenu } from '@/src/components/shared/layout/navbar/plan-and-support-menu';
import { PlatformMenu } from '@/src/components/shared/layout/navbar/platform-menu';
import { ButtonPrimary } from '@/src/components/shared/ui/button';
import { mobileMenuData } from '@/src/data/mobile-meu';
import { useNavbarScroll } from '@/src/hooks/useScrollHeader';
import { cn } from '@/src/utils/cn';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navLinkClass =
  'hover:border-stroke-2 text-tagline-1 text-secondary/60 hover:text-secondary flex items-center gap-1 rounded-full border border-transparent px-4 py-2 font-normal transition-all duration-200';

const Navbar = () => {
  const pathname = usePathname();
  const [menuDropdownId, setMenuDropdownId] = useState<string | null>(null);
  const scroll = useNavbarScroll(100);

  if (pathname?.startsWith('/dashboard') || pathname === '/login') {
    return null;
  }

  return (
    <header onMouseLeave={() => setMenuDropdownId(null)}>
      <div
        className={cn(
          'lp:max-w-[1290px]! fixed left-1/2 z-50 mx-auto w-full max-w-[350px] -translate-x-1/2 rounded-full backdrop-blur-[25px] transition-all duration-500 ease-in-out min-[425px]:max-w-[375px] min-[500px]:max-w-[450px] sm:max-w-[540px] md:max-w-[720px] lg:max-w-[960px] xl:max-w-[1140px]',
          scroll.isScrolled ? 'top-2' : 'top-5'
        )}
      >
        <RevealAnimation direction="up" offset={100} delay={0.1} instant>
          <div className="flex w-full items-center justify-between rounded-full bg-white px-2.5 py-2.5 xl:py-0">
            <div className="py-1 px-2">
              <Link href="/" className="flex items-center" aria-label="Home">
                <figure className="relative h-9 sm:h-10 w-auto max-w-[198px] flex items-center">
                  <Image
                    src="/images/logo/logo.webp"
                    alt="Logo"
                    width={180}
                    height={40}
                    className="h-9 sm:h-10 w-auto object-contain object-left"
                    priority
                  />
                </figure>
              </Link>
            </div>

            <nav className="hidden items-center xl:flex" aria-label="Main">
              <ul className="flex items-center">
                <li
                  className={cn(
                    'nav-item relative cursor-pointer py-2.5',
                    menuDropdownId === 'company-mega-menu-v2' && 'active menu-active'
                  )}
                  data-menu="company-mega-menu-v2"
                  onMouseEnter={() => setMenuDropdownId('company-mega-menu-v2')}
                >
                  <Link href="#" className={navLinkClass} onClick={(e) => e.preventDefault()}>
                    <span>Company</span>
                    <NavChevron open={menuDropdownId === 'company-mega-menu-v2'} />
                  </Link>
                  <CompanyMenu
                    menuDropdownId={menuDropdownId}
                    setMenuDropdownId={setMenuDropdownId}
                  />
                </li>
                <li
                  className={cn(
                    'nav-item relative cursor-pointer py-2.5',
                    menuDropdownId === 'resources-dropdown-menu-v2' && 'active menu-active'
                  )}
                  data-menu="resources-dropdown-menu-v2"
                  onMouseEnter={() => setMenuDropdownId('resources-dropdown-menu-v2')}
                >
                  <Link href="#" className={navLinkClass} onClick={(e) => e.preventDefault()}>
                    <span>Inner pages</span>
                    <NavChevron open={menuDropdownId === 'resources-dropdown-menu-v2'} />
                  </Link>
                  <InnerPagesMenu
                    menuDropdownId={menuDropdownId}
                    setMenuDropdownId={setMenuDropdownId}
                  />
                </li>
                <li
                  className={cn(
                    'nav-item relative cursor-pointer py-2.5',
                    menuDropdownId === 'platform-mega-menu-v2' && 'active menu-active'
                  )}
                  data-menu="platform-mega-menu-v2"
                  onMouseEnter={() => setMenuDropdownId('platform-mega-menu-v2')}
                >
                  <Link href="#" className={navLinkClass} onClick={(e) => e.preventDefault()}>
                    <span>Platform</span>
                    <NavChevron open={menuDropdownId === 'platform-mega-menu-v2'} />
                  </Link>
                  <PlatformMenu
                    menuDropdownId={menuDropdownId}
                    setMenuDropdownId={setMenuDropdownId}
                  />
                </li>
                <li
                  className={cn(
                    'nav-item relative cursor-pointer py-2.5',
                    menuDropdownId === 'product-mega-menu' && 'active menu-active'
                  )}
                  data-menu="product-mega-menu"
                  onMouseEnter={() => setMenuDropdownId('product-mega-menu')}
                >
                  <Link href="#" className={navLinkClass} onClick={(e) => e.preventDefault()}>
                    <span>Plans & Support</span>
                    <NavChevron open={menuDropdownId === 'product-mega-menu'} />
                  </Link>
                  <PlanAndSupportMenu
                    menuDropdownId={menuDropdownId}
                    setMenuDropdownId={setMenuDropdownId}
                  />
                </li>
              </ul>
            </nav>

            <div className="hidden items-center justify-center xl:flex gap-3">
              <Link
                href="/login"
                className="text-tagline-1 text-secondary/70 hover:text-secondary px-3 py-1.5 font-medium transition-colors"
                aria-label="Sign in"
              >
                Sign in
              </Link>
              <Link href="/dashboard" className="inline-block" aria-label="Dashboard">
                <ButtonPrimary>Dashboard</ButtonPrimary>
              </Link>
            </div>
            <NavbarMobileMenuButton />
          </div>
        </RevealAnimation>
      </div>
      <MobileMenu menuData={mobileMenuData} />
    </header>
  );
};

export default Navbar;
