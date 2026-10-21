import { footerSocialLinks } from '@/src/data/footer-links';
import Image from 'next/image';
import Link from 'next/link';
import { Fragment } from 'react';

export const FooterSocialLinks = () => {
  return (
    <div className="flex items-center gap-3">
      {footerSocialLinks.map((item, index) => (
        <Fragment key={item.label}>
          {index > 0 ? <div className="bg-stroke-3 h-6 w-px" /> : null}
          <Link href={item.href} className="footer-social-link">
            <span className="sr-only">{item.label}</span>
            <Image src={item.icon} alt={item.label} width={24} height={24} className="size-6" />
          </Link>
        </Fragment>
      ))}
    </div>
  );
};
