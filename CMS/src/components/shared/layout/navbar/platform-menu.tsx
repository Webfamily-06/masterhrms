'use client';

import newArrowWhite from '@/public/images/icons/new-arrow-white.svg';
import platformCardOne from '@/public/images/ns-img-424.jpg';
import platformCardTwo from '@/public/images/ns-img-425.jpg';
import {
  AnalyticsIconV2,
  BrandKitIcon,
  DownloadIcon,
  FeatureIcon,
  IntegrationIconV2,
  PressIcon,
  PricingIcon,
  ProcessICon,
  SecurityIcon,
  SupportIconV2,
  TeamIcon,
  WhitePaperIconV2,
} from '@/src/components/shared/icon/menu-icon';
import { InnerPagesMenuLink } from '@/src/components/shared/layout/navbar/inner-pages-menu-link';
import { cn } from '@/src/utils/cn';
import Image from 'next/image';
import Link from 'next/link';
import type { ComponentType } from 'react';

const MENU_PLATFORM_ID = 'platform-mega-menu-v2';

type PlatformLink = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const overviewLinks: PlatformLink[] = [
  { label: 'Features & Capabilities', href: '#', icon: FeatureIcon },
  { label: 'Process & Workflow', href: '#', icon: ProcessICon },
  { label: 'Security & Compliance', href: '#', icon: SecurityIcon },
  { label: 'Our Brandkit', href: '#', icon: BrandKitIcon },
  { label: 'Download App', href: '#', icon: DownloadIcon },
  { label: 'Press', href: '#', icon: PressIcon },
];

const integrationLinks: PlatformLink[] = [
  { label: 'Pricing', href: '/pricing', icon: PricingIcon },
  { label: 'HR & Payroll', href: '#', icon: TeamIcon },
  { label: 'Customer Support', href: '#', icon: SupportIconV2 },
  { label: 'Analytics & Reporting', href: '#', icon: AnalyticsIconV2 },
  { label: 'Whitepaper & Reports', href: '#', icon: WhitePaperIconV2 },
  { label: 'Explore All Integrations', href: '#', icon: IntegrationIconV2 },
];

interface PlatformMenuProps {
  menuDropdownId: string | null;
  setMenuDropdownId: (id: string | null) => void;
}

export const PlatformMenu = ({ menuDropdownId, setMenuDropdownId }: PlatformMenuProps) => {
  const handleClose = () => setMenuDropdownId(null);
  const isOpen = menuDropdownId === MENU_PLATFORM_ID;

  return (
    <div>
      <div className="dropdown-menu-bridge pointer-events-none fixed top-full left-1/2 z-40 h-3 w-full -translate-x-1/2 bg-transparent transition-opacity duration-300 lg:w-[1290px]" />
      <div
        id={MENU_PLATFORM_ID}
        className={cn(
          'dropdown-menu border-stroke-1 fixed top-full left-1/2 z-50 mt-2 w-full -translate-x-1/2 rounded-[20px] border bg-white p-4 transition-all duration-300 lg:w-[1290px]',
          isOpen && 'active'
        )}
      >
        <div className="grid grid-cols-12 items-start gap-y-6 md:gap-x-6">
          <div className="col-span-12 grid grid-cols-12 gap-x-6 lg:col-span-6">
            <div className="col-span-12 xl:col-span-6">
              <p className="text-tagline-2 text-secondary/60 p-3 font-medium">Overview</p>
              <ul>
                {overviewLinks.map((link) => (
                  <InnerPagesMenuLink key={link.label} {...link} onClose={handleClose} />
                ))}
              </ul>
            </div>
            <div className="col-span-12 xl:col-span-6">
              <p className="text-tagline-2 text-secondary/60 p-3 font-medium">Integrations</p>
              <ul>
                {integrationLinks.map((link) => (
                  <InnerPagesMenuLink key={link.label} {...link} onClose={handleClose} />
                ))}
              </ul>
            </div>
          </div>
          <div className="col-span-12 grid grid-cols-12 gap-x-6 lg:col-span-6">
            {[
              { image: platformCardOne, title: 'Merge Unified' },
              { image: platformCardTwo, title: 'Combine Unified' },
            ].map((card) => (
              <div key={card.title} className="col-span-12 xl:col-span-6">
                <Link href="/blog/3-ai-skills-you-need-to-master-in-2025" onClick={handleClose} className="block">
                  <article className="group border-stroke-1 space-y-3 rounded-2xl border p-3">
                    <figure className="overflow-hidden rounded-lg">
                      <Image
                        src={card.image}
                        alt="Featured"
                        className="size-full rounded-lg object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
                        sizes="(max-width: 1280px) 50vw, 300px"
                      />
                    </figure>
                    <div className="space-y-14">
                      <div>
                        <p className="text-heading-6 text-secondary font-normal">{card.title}</p>
                        <p className="text-tagline-1 text-secondary/60 font-normal">
                          One API. Countless product <br />
                          integrations.
                        </p>
                      </div>
                      <div>
                        <span className="bg-secondary group-hover:bg-primary-500 ring-background-12 relative flex h-9.5 w-16 items-center justify-center overflow-hidden rounded-full px-5 py-2 ring-[6px] transition-all duration-500 ease-in-out">
                          <span className="relative flex size-6 items-center justify-center overflow-hidden">
                            <Image
                              src={newArrowWhite}
                              alt=""
                              width={24}
                              height={24}
                              className="absolute inset-0 size-full -translate-x-6 object-cover transition-transform duration-400 ease-in-out group-hover:translate-x-1"
                            />
                            <Image
                              src={newArrowWhite}
                              alt=""
                              width={24}
                              height={24}
                              className="size-full object-cover transition-transform duration-400 ease-in-out group-hover:translate-x-6"
                            />
                          </span>
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
