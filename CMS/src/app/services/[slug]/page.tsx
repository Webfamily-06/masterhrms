import ServiceDetailsMarkdown from '@/src/components/service-details/service-details-markdown';
import WhyUse from '@/src/components/service-details/why-use';
import CTA from '@/src/components/shared/cta';
import { ServiceData } from '@/src/interface/interface';
import { generateMetadata as buildMeta } from '@/src/utils/generateMetaData';
import getMarkDownContent from '@/src/utils/getMarkDownContent';
import getMarkDownData from '@/src/utils/getMarkDownData';
import type { Metadata } from 'next';const Page = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const slug = (await params).slug;
  const doc = getMarkDownContent('src/data/services/', slug);

  return (
    <>
      <ServiceDetailsMarkdown content={doc.content} />
      <WhyUse />
      <CTA />
    </>
  );
};

export default Page;
