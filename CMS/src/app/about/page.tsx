import { generateMetadata } from '@/src/utils/generateMetaData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  ...generateMetadata(),
  title: 'About - Automation SaaS || Nexsas',
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
