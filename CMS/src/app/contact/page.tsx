import ContactUs from '@/src/components/contact/contact-us';
import CTA from '@/src/components/shared/cta';
import { generateMetadata } from '@/src/utils/generateMetaData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  ...generateMetadata(
    'Contact Sales & Enterprise Support — MasterHRMS',
    'Get in touch with MasterHRMS for enterprise workforce demos, custom deployment consultations, and dedicated support.',
    'https://www.masterhrms.com/contact'
  ),
};

const ContactPage = () => {
  return (
    <>
      <ContactUs />
      <CTA />
    </>
  );
};

export default ContactPage;
