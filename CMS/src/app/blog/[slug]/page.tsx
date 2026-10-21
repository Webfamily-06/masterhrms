import DetailsInfo from '@/src/components/blog-details/details-info';
import RelatedBlog from '@/src/components/blog-details/related-blog';
import CTA from '@/src/components/shared/cta';
import { BlogPost } from '@/src/interface/interface';
import { generateMetadata as buildMeta } from '@/src/utils/generateMetaData';
import getMarkDownContent from '@/src/utils/getMarkDownContent';
import getMarkDownData from '@/src/utils/getMarkDownData';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateStaticParams() {
  const posts = getMarkDownData<BlogPost>('src/data/blog', false, 'order');
  return posts.map((post) => ({ slug: post.slug }));
}

async function verifySuperAdmin(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch('http://localhost:4000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const user = await res.json();
    return Array.isArray(user?.roles) && user.roles.includes('super_admin');
  } catch {
    return false;
  }
}

async function getPostData(
  slug: string,
  isPreview: boolean = false,
  authToken?: string
): Promise<{ data: Partial<BlogPost>; content: string; isDraftPreview?: boolean } | null> {
  const isSuperAdmin = authToken ? await verifySuperAdmin(authToken) : false;

  // 1. Check CMS MySQL database first via API
  try {
    const candidateSlugs = [slug, `blog-${slug}`];
    for (const s of candidateSlugs) {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch(`http://localhost:4000/api/cms/pages/${encodeURIComponent(s)}`, {
        headers,
        cache: 'no-store',
      });
      if (res.ok) {
        const page = await res.json();
        if (page) {
          // If page is published, anyone can view it
          if (page.published) {
            const c = page.content || {};
            const fallbackCover = c.coverImage || '/images/blog/blog-1.jpg';
            return {
              data: {
                title: page.title || 'Untitled Post',
                slug: page.slug.replace(/^blog-/, ''),
                image: fallbackCover,
                heroImageLeft: fallbackCover,
                heroImageRight: fallbackCover,
                publishedAt: c.publishedAt || (page.created_at ? new Date(page.created_at).toLocaleDateString() : 'Recent'),
                dateTime: page.created_at || new Date().toISOString(),
                readTime: c.readTime || '5 min read',
                authorName: c.author || 'Master HRMS Editorial',
                authorImage: '/images/ns-avatar-8.jpg',
                footerAuthorName: c.author || 'Master HRMS Editorial',
                footerAuthorImage: '/images/ns-avatar-8.jpg',
                category: c.category || 'ERP Insights',
              } as Partial<BlogPost>,
              content: c.body || c.richText || c.excerpt || '',
            };
          }

          // If page is an UNPUBLISHED DRAFT:
          // Strictly REQUIRE both explicit preview parameter AND verified Super Admin session
          if (isPreview && isSuperAdmin) {
            const c = page.content || {};
            const fallbackCover = c.coverImage || '/images/blog/blog-1.jpg';
            return {
              data: {
                title: page.title || 'Untitled Draft Post',
                slug: page.slug.replace(/^blog-/, ''),
                image: fallbackCover,
                heroImageLeft: fallbackCover,
                heroImageRight: fallbackCover,
                publishedAt: c.publishedAt || 'Unpublished Draft',
                dateTime: page.created_at || new Date().toISOString(),
                readTime: c.readTime || '5 min read',
                authorName: c.author || 'Master HRMS Editorial',
                authorImage: '/images/ns-avatar-8.jpg',
                footerAuthorName: c.author || 'Master HRMS Editorial',
                footerAuthorImage: '/images/ns-avatar-8.jpg',
                category: c.category || 'ERP Insights',
              } as Partial<BlogPost>,
              content: c.body || c.richText || c.excerpt || '',
              isDraftPreview: true,
            };
          }

          // If it is a draft in the database and user is unauthorized, do NOT reveal or fall through
          return null;
        }
      }
    }
  } catch {
    // API unavailable, continue to local markdown
  }

  // 2. Fallback to local markdown file in src/data/blog/ (only for legacy static published posts)
  if (!isPreview) {
    try {
      const doc = getMarkDownContent('src/data/blog/', slug);
      if (doc?.data) {
        return {
          data: doc.data as Partial<BlogPost>,
          content: doc.content || '',
        };
      }
    } catch {
      // Markdown file not found
    }
  }

  return null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const isPreview = sp.preview === 'true';

  let token = '';
  try {
    const cookieStore = await cookies();
    token = cookieStore.get('hrms_auth_token')?.value || '';
  } catch {}

  const post = await getPostData(slug, isPreview, token);

  if (!post) {
    return buildMeta('Post Not Found');
  }

  const prefix = post.isDraftPreview ? '[DRAFT PREVIEW] ' : '';
  const title = post.data.title
    ? `${prefix}${post.data.title} - Blog - Master HRMS`
    : 'Blog Details - Master HRMS';

  return buildMeta(title);
}

const Page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
}) => {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const isPreview = sp.preview === 'true';

  let token = '';
  try {
    const cookieStore = await cookies();
    token = cookieStore.get('hrms_auth_token')?.value || '';
  } catch {}

  const post = await getPostData(slug, isPreview, token);

  if (!post) {
    notFound();
  }

  return (
    <>
      {post.isDraftPreview && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-400 px-4 py-3 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <span className="inline-block size-2 rounded-full bg-amber-500 animate-pulse" />
          <span>SUPER ADMIN PREVIEW MODE — This draft article is unpublished and not visible to the public.</span>
        </div>
      )}
      <DetailsInfo data={post.data} content={post.content} />
      <RelatedBlog currentSlug={slug} />
      <CTA />
    </>
  );
};

export default Page;
