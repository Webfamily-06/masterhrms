import mainLogo from '@/public/images/logo/main-logo.svg';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { FooterBottom } from '@/src/components/shared/layout/footer/footer-bottom';
import { FooterLinkGroups } from '@/src/components/shared/layout/footer/footer-link-groups';
import { FooterSocialLinks } from '@/src/components/shared/layout/footer/footer-social-links';
import Image from 'next/image';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="footer bg-background-13 relative z-0 overflow-hidden">
      <div className="main-container px-5">
        <div className="grid grid-cols-12 justify-between gap-x-0 gap-y-16 pb-12 pt-39">
          <div className="col-span-12 xl:col-span-4">
            <RevealAnimation delay={0.1}>
              <div className="max-w-[306px]">
                <Link href="/">
                  <span className="sr-only">Nexsas</span>
                  <figure>
                    <Image src={mainLogo} alt="Nexsas Logo" width={198} height={40} />
                  </figure>
                </Link>
                <p className="text-background-14/60 text-tagline-1 mt-4 mb-7 font-normal">
                  Nexsas helps teams automate workflows, connect the apps they already use, and ship
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
