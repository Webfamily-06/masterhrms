'use client';

import {
  AffiliatePolicyIcon,
  AffiliateProgramIcon,
  GDPRIcon,
  LegalNoticeIcon,
  LoginIcon,
  PrivacyIcon,
  ReferralProgramIcon,
  RefundPolicyIcon,
  SignUpIcon,
  TermsConditionsIcon,
} from '@/src/components/shared/icon/menu-icon';
import {
  PlanSupportMenuLink,
  type PlanSupportMenuLinkProps,
} from '@/src/components/shared/layout/navbar/plan-support-menu-link';
import whatsNewImage from '@/public/images/ns-img-419.jpg';
import { cn } from '@/src/utils/cn';
import Image from 'next/image';
import Link from 'next/link';

const MENU_PLAN_SUPPORT_ID = 'product-mega-menu';

type PlanLink = Omit<PlanSupportMenuLinkProps, 'onClose'>;

const columnOne: PlanLink[] = [
  {
    title: 'Login',
    description: 'Log into your dashboard',
    href: '/login',
    icon: LoginIcon,
  },
  {
    title: 'Create Account',
    description: 'Create your free account',
    href: '/signup',
    icon: SignUpIcon,
  },
  {
    title: 'Referral Program',
    description: 'Share and earn together',
    href: '#',
    icon: ReferralProgramIcon,
  },
  {
    title: 'Affiliate Program',
    description: 'Earn commissions as partner',
    href: '#',
    icon: AffiliateProgramIcon,
  },
  {
    title: 'Affiliate Policy',
    description: 'Understand our policies',
    href: '#',
    icon: AffiliatePolicyIcon,
  },
];

const columnTwo: PlanLink[] = [
  {
    title: 'Terms & Conditions',
    description: 'Understand our terms',
    href: '#',
    icon: TermsConditionsIcon,
  },
  {
    title: 'Privacy Policy',
    description: 'Understand data protection',
    href: '#',
    icon: PrivacyIcon,
  },
  {
    title: 'Refund Policy',
    description: 'Review refund terms',
    href: '#',
    icon: RefundPolicyIcon,
  },
  {
    title: 'GDPR',
    description: 'Review GDPR information',
    href: '#',
    icon: GDPRIcon,
  },
  {
    title: 'Legal',
    description: 'Read legal policies',
    href: '#',
    icon: LegalNoticeIcon,
  },
];

interface PlanAndSupportMenuProps {
  menuDropdownId: string | null;
  setMenuDropdownId: (id: string | null) => void;
}

export const PlanAndSupportMenu = ({
  menuDropdownId,
  setMenuDropdownId,
}: PlanAndSupportMenuProps) => {
  const handleClose = () => setMenuDropdownId(null);
  const isOpen = menuDropdownId === MENU_PLAN_SUPPORT_ID;

  return (
    <div>
      <div className="dropdown-menu-bridge pointer-events-none fixed top-full left-1/2 z-40 h-3 w-full min-w-[952px] -translate-x-1/2 bg-transparent transition-opacity duration-300" />
      <div
        id={MENU_PLAN_SUPPORT_ID}
        className={cn(
          'dropdown-menu border-stroke-1 fixed top-full left-1/2 z-50 mt-2 w-full -translate-x-1/2 space-y-6 rounded-[20px] border bg-white p-4 transition-all duration-300 md:w-[952px]',
          isOpen && 'active'
        )}
      >
        <div className="flex items-start gap-y-6 md:gap-x-6">
          <ul className="flex-1 space-y-2">
            {columnOne.map((item) => (
              <PlanSupportMenuLink key={item.title} {...item} onClose={handleClose} />
            ))}
          </ul>
          <ul className="flex-1 space-y-2">
            {columnTwo.map((item) => (
              <PlanSupportMenuLink key={item.title} {...item} onClose={handleClose} />
            ))}
          </ul>
          <figure className="w-full flex-1 space-y-3">
            <p className="text-tagline-2 text-secondary/60 font-medium">What&apos;s New</p>
            <Link href="#" onClick={handleClose}>
              <figure className="group relative min-h-[200px] w-full max-w-full overflow-hidden rounded-[14px]">
                <Image
                  src={whatsNewImage}
                  alt="What's New"
                  fill
                  className="rounded-[14px] object-cover transition-all duration-500 ease-in-out group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 320px"
                />
                <div className="absolute top-4 left-4 size-full space-y-1 transition-all duration-500 ease-in-out group-hover:top-5 group-hover:left-5">
                  <p className="text-tagline-1 font-medium text-white">Automation SaaS Changelog</p>
                  <p className="text-tagline-3 w-full max-w-[212px] font-normal text-white/60">
                    Access all your workflows, analytics, and integrations in one smart dashboard.
                  </p>
                </div>
              </figure>
            </Link>
          </figure>
        </div>
      </div>
    </div>
  );
};
