import RevealAnimation from '@/src/components/animation/reveal-animation';
import { footerNavColumns } from '@/src/data/footer-links';
import Link from 'next/link';

export const FooterLinkGroups = () => {
  return (
    <div className="col-span-12 grid grid-cols-12 gap-x-0 gap-y-8 xl:col-span-8">
      {footerNavColumns.map((column, columnIndex) => (
        <div key={column.title} className="col-span-12 md:col-span-4">
          <RevealAnimation delay={0.2 + columnIndex * 0.1}>
            <div className="space-y-8">
              <p className="sm:text-heading-6 text-tagline-1 text-secondary font-normal">
                {column.title}
              </p>
              <ul className="space-y-5">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link href={link.href} className="footer-link-v2">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </RevealAnimation>
        </div>
      ))}
    </div>
  );
};
