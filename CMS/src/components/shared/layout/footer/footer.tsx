'use client';

import RevealAnimation from '@/src/components/animation/reveal-animation';
import { FooterBottom } from '@/src/components/shared/layout/footer/footer-bottom';
import { FooterLinkGroups } from '@/src/components/shared/layout/footer/footer-link-groups';
import { FooterSocialLinks } from '@/src/components/shared/layout/footer/footer-social-links';
import { DynamicLogo } from '@/src/components/ui/dynamic-logo';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Footer = () => {
  const pathname = usePathname();

  if (pathname?.startsWith('/dashboard') || pathname === '/login') {
    return null;
  }
  return (
    <footer className="footer bg-background-13 relative z-0 overflow-hidden">
      <div className="main-container px-5">
        <div className="grid grid-cols-12 justify-between gap-x-0 gap-y-16 pb-12 pt-39">
          <div className="col-span-12 xl:col-span-4">
            <RevealAnimation delay={0.1}>
              <div className="max-w-[306px]">
                <Link href="/" aria-label="Home">
                  <figure className="relative h-10 w-auto max-w-[198px] flex items-center">
                    <Image
                      src="/images/logo/logo.webp"
                      alt="Logo"
                      width={180}
                      height={40}
                      className="h-10 w-auto object-contain object-left"
                    />
                  </figure>
                </Link>
                <p className="text-background-14/60 text-tagline-1 mt-4 mb-7 font-normal">
                  Webfamily Tech Solutions helps teams automate workflows, connect the apps they already use, and ship
                  faster—without piling on complexity.
                </p>
                <FooterSocialLinks />
              </div>
            </RevealAnimation>
          </div>
          <FooterLinkGroups />
        </div>
        <FooterBottom />
      </div>
    </footer>
  );
};

export default Footer;
