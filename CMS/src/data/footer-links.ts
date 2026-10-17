export interface FooterLinkItem {
  label: string;
  href: string;
}

export interface FooterLinkColumn {
  title: string;
  links: FooterLinkItem[];
}

export const footerNavColumns: FooterLinkColumn[] = [
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Career', href: '#' },
      { label: 'Why Choose Us', href: '#' },
      { label: 'Our Manifesto', href: '#' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQ', href: '#' },
      { label: 'Documentation', href: '#' },
      { label: 'Tutorial', href: '#' },
      { label: 'Support', href: '#' },
    ],
  },
  {
    title: 'Legal Policies',
    links: [
      { label: 'Terms & Conditions', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Refund Policy', href: '#' },
      { label: 'GDPR Compliance', href: '#' },
      { label: 'Affiliate Policy', href: '#' },
    ],
  },
];

export interface FooterSocialLink {
  label: string;
  href: string;
  icon: string;
}

export const footerSocialLinks: FooterSocialLink[] = [
  { label: 'Facebook', href: '#', icon: '/images/icons/facebook-dark.svg' },
  { label: 'Instagram', href: '#', icon: '/images/icons/instagram-dark.svg' },
  { label: 'Youtube', href: '#', icon: '/images/icons/youtube-dark.svg' },
  { label: 'LinkedIn', href: '#', icon: '/images/icons/linkedin-dark.svg' },
  { label: 'Dribble', href: '#', icon: '/images/icons/dribble-dark.svg' },
  { label: 'Behance', href: '#', icon: '/images/icons/behance-dark.svg' },
];
