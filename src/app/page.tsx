import { generateMetadata } from '@/src/utils/generateMetaData';
import { Metadata } from 'next';

// Home components
import Hero from '@/src/components/home/hero';
import AboutUs from '@/src/components/home/about-us';
import Features from '@/src/components/home/features';
import Process from '@/src/components/home/process';
import CoreFeatures from '@/src/components/home/core-features';
import Benefits from '@/src/components/home/benefits';
import Pricing from '@/src/components/home/pricing';
import Integration from '@/src/components/home/integration';
import Testimonial from '@/src/components/home/testimonial';
import FAQ from '@/src/components/home/faq';
import CTA from '@/src/components/shared/cta';

// About components (from about page)
import AboutHero from '@/src/components/about/hero';
import AboutClients from '@/src/components/about/clients';
import OurMission from '@/src/components/about/our-mission';
import AboutTeam from '@/src/components/about/team';

// Features components (from features page)
import FeaturesSection from '@/src/components/features/features';
import WorkFlow from '@/src/components/features/work-flow';

// Services components (from services page)
import ServicesHero from '@/src/components/services/hero';
import ServicesList from '@/src/components/services/services-list';
import WhyChoose from '@/src/components/services/why-choose';

// Team components (from team page)
import OurTeam from '@/src/components/team/our-team';
import CoreValues from '@/src/components/team/core-values';

// Blog components (from blog page)
import BlogList from '@/src/components/blog/blog-list';

// Contact components (from contact page)
import ContactUs from '@/src/components/contact/contact-us';

export const metadata: Metadata = {
  ...generateMetadata(),
  title: 'Automation SaaS || Webfamily Tech Solutions',
};

const Page = () => {
  return (
    <>
      <Hero />
      <div id="about">
        <AboutUs />
        <AboutHero />
        <AboutClients />
        <OurMission />
        <AboutTeam />
      </div>
      <div id="features">
        <Features />
        <FeaturesSection />
        <WorkFlow />
        <Process />
        <CoreFeatures />
      </div>
      <div id="services">
        <ServicesHero />
        <ServicesList />
        <WhyChoose />
      </div>
      <Benefits />
      <div id="pricing">
        <Pricing />
      </div>
      <Integration />
      <div id="team">
        <OurTeam />
        <CoreValues />
      </div>
      <Testimonial />
      <div id="blog">
        <BlogList />
      </div>
      <FAQ />
      <div id="contact">
        <ContactUs />
      </div>
      <CTA />
    </>
  );
};

export default Page;
