import ServicesHero from '@/src/components/services/hero';
import ServicesList from '@/src/components/services/services-list';
import WhyChoose from '@/src/components/services/why-choose';
import CTA from '@/src/components/shared/cta';
import { generateMetadata } from '@/src/utils/generateMetaData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  ...generateMetadata(
    'Enterprise Services & Modules — MasterHRMS',
    'Discover the full suite of MasterHRMS solutions: automated payroll, biometric time tracking, employee self-service, and leave management.',
    'https://www.masterhrms.com/services'
  ),
};

const ServicesPage = () => {
  return (
    <>
      <ServicesHero />
      <ServicesList />
      <WhyChoose />
      <CTA />
    </>
  );
};

export default ServicesPage;
