'use client';

import newArrowWhite from '@/public/images/icons/new-arrow-white.svg';
import whatsNewImage from '@/public/images/ns-img-422.jpg';
import {
  AboutIcon,
  CareerIcon,
  CaseStudyICon,
  CustomersIcon,
  ManifestoIcon,
  ServiceIcon,
  TeamIcon,
  TestimonialIcon,
  UseCaseIcon,
  WhyChooseUsIcon,
} from '@/src/components/shared/icon/menu-icon';
import {
  CompanyMenuLink,
  type CompanyMenuLinkProps,
} from '@/src/components/shared/layout/navbar/company-menu-link';
import { cn } from '@/src/utils/cn';
import Image from 'next/image';
import Link from 'next/link';

const MENU_COMPANY_ID = 'company-mega-menu-v2';

type CompanyLink = Omit<CompanyMenuLinkProps, 'onClose'>;

const aboutLinks: CompanyLink[] = [
  {
    title: 'About Us',
    description: 'See how others are using Nexsas',
    href: '/about',
    icon: AboutIcon,
  },
  {
    title: 'Our Team',
    description: 'Dynamic content solutions',
    href: '/team',
    icon: TeamIcon,
  },
  {
    title: 'Career',
    description: 'Join our team',
    href: '#',
    icon: CareerIcon,
  },
  {
    title: 'Why Choose Us',
    description: 'Our unique selling points and competitive advantages',
    href: '#',
    icon: WhyChooseUsIcon,
  },
];

const cultureLinks: CompanyLink[] = [
  {
    title: 'Our Manifesto',
    description: 'Our values and principles',
    href: '#',
    icon: ManifestoIcon,
  },
  {
    title: 'Customers',
    description: 'Success stories and testimonials',
    href: '#',
    icon: CustomersIcon,
  },
  {
    title: 'Testimonials',
    description: 'What our customers say about us',
    href: '/testimonial',
    icon: TestimonialIcon,
  },
  {
    title: 'Case Studies',
    description: 'Real-world examples of our solutions',
    href: '/case-study',
    icon: CaseStudyICon,
  },
];

const solutionLinks: CompanyLink[] = [
  {
    title: 'Services',
    description: 'Our services and offerings',
    href: '/services',
    icon: ServiceIcon,
  },
  {
    title: 'Use Cases',
    description: 'Real-world examples of our solutions',
    href: '#',
    icon: UseCaseIcon,
  },
];

interface CompanyMenuProps {
  menuDropdownId: string | null;
  setMenuDropdownId: (id: string | null) => void;
}

export const CompanyMenu = ({ menuDropdownId, setMenuDropdownId }: CompanyMenuProps) => {
  const handleClose = () => setMenuDropdownId(null);
  const isOpen = menuDropdownId === MENU_COMPANY_ID;

  return (
    <div>
      <div className="dropdown-menu-bridge pointer-events-none fixed top-full left-1/2 z-40 h-3 w-full -translate-x-1/2 bg-transparent transition-opacity duration-300 lg:w-[946px]" />
      <div
        id={MENU_COMPANY_ID}
        className={cn(
          'dropdown-menu border-stroke-1 fixed top-full left-1/2 z-50 mt-2 flex w-full -translate-x-1/2 items-start gap-y-6 rounded-[20px] border bg-white p-4 transition-all duration-300 md:gap-x-6 lg:w-[946px]',
          isOpen && 'active'
        )}
      >
        <div className="flex-1 space-y-3">
          <ul className="space-y-2">
            {aboutLinks.map((link) => (
              <CompanyMenuLink key={link.title} {...link} onClose={handleClose} />
            ))}
          </ul>
        </div>
        <div className="flex-1 space-y-3">
          <ul className="space-y-2">
            {cultureLinks.map((link) => (
              <CompanyMenuLink key={link.title} {...link} onClose={handleClose} />
            ))}
          </ul>
        </div>
        <div className="flex-1">
          <div className="space-y-3">
            <ul className="space-y-2">
              {solutionLinks.map((link) => (
                <CompanyMenuLink key={link.title} {...link} onClose={handleClose} />
              ))}
            </ul>
          </div>
          <p className="text-tagline-2 text-secondary/60 p-3 font-medium">What&apos;s new</p>
          <div>
            <figure className="group relative min-h-[166px] w-full max-w-full overflow-hidden rounded-[14px]">
              <Image
                src={whatsNewImage}
                alt="What's new"
                fill
                className="rounded-[14px] object-cover"
                sizes="(max-width: 1024px) 100vw, 300px"
              />
              <div className="absolute top-3 bottom-3 left-3 w-full space-y-5 p-2">
                <div>
                  <p className="text-tagline-1 text-secondary font-normal">Product updates</p>
                  <p className="text-tagline-2 text-secondary/60 w-full max-w-[169px] font-normal">
                    Stay ahead with the latest features and improvements.
                  </p>
                </div>
                <Link
                  href="#"
                  onClick={handleClose}
                  className="group/arrow bg-secondary group-hover:bg-primary-500 relative flex h-9.5 w-16 items-center justify-center space-y-5 overflow-hidden rounded-[40px] px-5 py-2 ring-[6px] ring-white transition-all duration-500 ease-in-out"
                >
                  <span className="relative flex size-6 items-center justify-center overflow-hidden">
                    <Image
                      src={newArrowWhite}
                      alt=""
                      width={24}
                      height={24}
                      className="absolute inset-0 size-full -translate-x-6 object-cover transition-transform duration-400 ease-in-out group-hover/arrow:translate-x-1"
                    />
                    <Image
                      src={newArrowWhite}
                      alt=""
                      width={24}
                      height={24}
                      className="size-full object-cover transition-transform duration-400 ease-in-out group-hover/arrow:translate-x-6"
                    />
                  </span>
                </Link>
              </div>
            </figure>
          </div>
        </div>
      </div>
    </div>
  );
};
