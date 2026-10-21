import BlogList from '@/src/components/blog/blog-list';
import Testimonial from '@/src/components/home/testimonial';
import CTA from '@/src/components/shared/cta';
import { generateMetadata } from '@/src/utils/generateMetaData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  ...generateMetadata(),
  title: 'Blog - Automation SaaS || Nexsas',
};

const Page = () => {
  return (
    <>
      <BlogList />
      <Testimonial />
      <CTA />
    </>
  );
};

export default Page;
