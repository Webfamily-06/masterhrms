import Pricing from '@/src/components/home/pricing';
import Testimonial from '@/src/components/home/testimonial';
import CTA from '@/src/components/shared/cta';
import { generateMetadata } from '@/src/utils/generateMetaData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  ...generateMetadata(),
  title: 'Pricing - Automation SaaS || Nexsas',
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
