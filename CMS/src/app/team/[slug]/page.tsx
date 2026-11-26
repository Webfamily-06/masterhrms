import DetailsInfo from '@/src/components/team-details/details-info';
import CoreValues from '@/src/components/team/core-values';
import CTA from '@/src/components/shared/cta';
import { TeamMember } from '@/src/interface/interface';
import { generateMetadata as buildMeta } from '@/src/utils/generateMetaData';
import getMarkDownContent from '@/src/utils/getMarkDownContent';
import getMarkDownData from '@/src/utils/getMarkDownData';
import type { Metadata } from 'next';const Page = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const slug = (await params).slug;
  const doc = getMarkDownContent('src/data/team/', slug);
  const data = doc.data as Partial<TeamMember>;

  return (
    <>
      <DetailsInfo data={data} content={doc.content} />
      <CoreValues />
      <CTA />
    </>
  );
};

export default Page;
