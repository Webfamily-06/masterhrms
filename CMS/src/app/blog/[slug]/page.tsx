import DetailsInfo from '@/src/components/blog-details/details-info';
import RelatedBlog from '@/src/components/blog-details/related-blog';
import CTA from '@/src/components/shared/cta';
import { BlogPost } from '@/src/interface/interface';
import { generateMetadata as buildMeta } from '@/src/utils/generateMetaData';
import getMarkDownContent from '@/src/utils/getMarkDownContent';
import getMarkDownData from '@/src/utils/getMarkDownData';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  const posts = getMarkDownData<BlogPost>('src/data/blog', false, 'order');
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const slug = (await params).slug;
  const doc = getMarkDownContent('src/data/blog/', slug);
  const data = doc.data as Partial<BlogPost>;
  const title = data.title
    ? `${data.title} - Blog - Automation SaaS || Nexsas`
    : 'Blog Details - Automation SaaS || Nexsas';

  return buildMeta(title);
}

const Page = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const slug = (await params).slug;
  const doc = getMarkDownContent('src/data/blog/', slug);
  const data = doc.data as Partial<BlogPost>;

  return (
    <>
      <DetailsInfo data={data} content={doc.content} />
      <RelatedBlog currentSlug={slug} />
      <CTA />
    </>
  );
};

export default Page;
