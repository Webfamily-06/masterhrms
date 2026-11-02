import { generateMetadata } from '@/src/utils/generateMetaData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  ...generateMetadata(
    'About Us — MasterHRMS Enterprise Workforce Platform',
    'Learn how MasterHRMS streamlines workforce management, payroll compliance, and biometric attendance for modern global enterprises.',
    'https://www.masterhrms.com/about'
  ),
};

import AboutClients from '@/src/components/about/clients';
import AboutHero from '@/src/components/about/hero';
import OurMission from '@/src/components/about/our-mission';
import AboutTeam from '@/src/components/about/team';
import Integration from '@/src/components/home/integration';
import CTA from '@/src/components/shared/cta';

const AboutPage = () => {
  return (
    <>
      <AboutHero />
      <AboutClients />
      <OurMission />
      <AboutTeam />
      <Integration />
      <CTA />
    </>
  );
};

export default AboutPage;
