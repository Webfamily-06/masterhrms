import Pricing from '@/src/components/home/pricing';
import Testimonial from '@/src/components/home/testimonial';
import CTA from '@/src/components/shared/cta';
import { generateMetadata } from '@/src/utils/generateMetaData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  ...generateMetadata(
    'Pricing & Enterprise Plans — MasterHRMS',
    'Flexible, transparent pricing for teams of any size. Explore MasterHRMS plans for automated payroll, shift scheduling, and HR compliance.',
    'https://www.masterhrms.com/pricing'
  ),
};

const PricingPage = () => {
  return (
    <>
      <Pricing />
      <Testimonial />
      <CTA />
    </>
  );
};

export default PricingPage;
