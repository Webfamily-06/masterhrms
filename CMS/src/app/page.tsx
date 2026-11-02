import { generateMetadata } from '@/src/utils/generateMetaData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  ...generateMetadata(
    'MasterHRMS — Enterprise HRMS, Payroll & Workforce Management',
    'Manage your workforce with MasterHRMS. Simplify employee management, payroll, attendance, leave, recruitment and HR operations with a secure enterprise HRMS platform.',
    'https://www.masterhrms.com'
  ),
};

import AboutUs from '@/src/components/home/about-us';
import Benefits from '@/src/components/home/benefits';
import CoreFeatures from '@/src/components/home/core-features';
import FAQ from '@/src/components/home/faq';
import Features from '@/src/components/home/features';
import Hero from '@/src/components/home/hero';
import Integration from '@/src/components/home/integration';
import Pricing from '@/src/components/home/pricing';
import Process from '@/src/components/home/process';
import Testimonial from '@/src/components/home/testimonial';
import CTA from '@/src/components/shared/cta';

const Page = () => {
  return (
    <>
      <Hero />
      <AboutUs />
      <Features />
      <Process />
      <CoreFeatures />
      <Benefits />
      <Pricing />
      <Integration />
      <Testimonial />
      <FAQ />
      <CTA />
    </>
  );
};

export default Page;
