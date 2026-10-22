const fs = require('fs');
const path = require('path');
const prismaClientPath = path.join(__dirname, '../server/node_modules/@prisma/client');
const { PrismaClient } = require(prismaClientPath);

const prisma = new PrismaClient();

const blogDir = path.join(__dirname, '../CMS/src/data/blog');

const metadataMap = {
  '3-ai-skills-you-need-to-master-in-2025.md': {
    category: 'Workforce AI',
    tags: ['AI', 'Future of Work', 'Productivity'],
    coverImage: '/images/blog/blog-3.svg',
    excerpt: 'Workflow automation, predictive decision modeling, and high-impact operational skills for modern teams.'
  },
  'automate-your-day-with-ai.md': {
    category: 'Automation Insights',
    tags: ['Automation', 'Productivity', 'Workflows'],
    coverImage: '/images/blog/blog-4.svg',
    excerpt: 'The fastest automation wins come from tasks you already repeat: status updates, follow-ups, and meeting prep.'
  },
  'building-an-ai-ready-culture-in-your-team.md': {
    category: 'Workforce AI',
    tags: ['Culture', 'Leadership', 'Teams'],
    coverImage: '/images/blog/blog-5.svg',
    excerpt: 'AI-ready teams share habits: experimentation, documentation, and clear ownership of outcomes.'
  },
  'the-future-of-ai-content-tools.md': {
    category: 'Automation Insights',
    tags: ['Content', 'Marketing', 'AI'],
    coverImage: '/images/blog/blog-6.svg',
    excerpt: 'AI content tools are moving from one-off generation to integrated workflow systems that draft, review, and publish.'
  },
  'using-ai-to-personalize-customer-experiences-at-scale.md': {
    category: 'Automation Insights',
    tags: ['Customer Experience', 'Personalization', 'Retention'],
    coverImage: '/images/blog/blog-7.svg',
    excerpt: 'Dynamic lifecycle messaging and real-time behavioral segmentation without manual overhead.'
  },
  'why-responsible-ai-matters-for-your-business.md': {
    category: 'Workforce AI',
    tags: ['Governance', 'Compliance', 'Trust'],
    coverImage: '/images/blog/blog-8.svg',
    excerpt: 'Responsible AI is not only an ethics discussion—it affects customer trust, compliance, and long-term adoption.'
  }
};

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const yaml = match[1];
  const content = match[2];
  const data = {};
  yaml.split(/\r?\n/).forEach(line => {
    const idx = line.indexOf(':');
    if (idx !== -1) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      data[key] = val;
    }
  });
  return { data, content };
}

async function main() {
  const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} markdown files to import.`);

  for (const filename of files) {
    const rawContent = fs.readFileSync(path.join(blogDir, filename), 'utf-8');
    const { data: frontmatter, content: markdownBody } = parseFrontmatter(rawContent);

    const baseSlug = filename.replace(/\.md$/, '');
    const dbSlug = `blog-${baseSlug}`;
    const meta = metadataMap[filename] || {
      category: 'Workforce AI',
      tags: ['AI', 'Innovation'],
      coverImage: '/images/blog/blog-3.svg',
      excerpt: frontmatter.title
    };

    const pubDate = frontmatter.dateTime || (frontmatter.publishedAt ? new Date(frontmatter.publishedAt).toISOString().split('T')[0] : '2025-01-15');

    const contentPayload = {
      body: markdownBody.trim(),
      hero: {
        title: frontmatter.title,
        eyebrow: meta.category,
        subtitle: meta.excerpt,
      },
      tags: meta.tags,
      author: frontmatter.authorName || 'Sofia Patel',
      authorImage: frontmatter.authorImage || '/images/avatars/avatar-1.png',
      excerpt: meta.excerpt,
      category: meta.category,
      readTime: frontmatter.readTime || '5 min read',
      seoTitle: `${frontmatter.title} || Master HRMS`,
      seoDescription: meta.excerpt,
      coverImage: meta.coverImage,
      coverImageAlt: frontmatter.title,
      socialImage: meta.coverImage,
      canonicalUrl: `/blog/${baseSlug}`,
      publishedAt: pubDate,
    };

    const existing = await prisma.cmsPage.findUnique({
      where: { slug: dbSlug }
    });

    if (existing) {
      console.log(`Updating existing article: ${dbSlug}`);
      await prisma.cmsPage.update({
        where: { id: existing.id },
        data: {
          title: frontmatter.title,
          metaDescription: meta.excerpt,
          published: true,
          content: contentPayload,
          updatedAt: new Date(),
        }
      });
    } else {
      console.log(`Creating new article: ${dbSlug}`);
      await prisma.cmsPage.create({
        data: {
          id: crypto.randomUUID(),
          slug: dbSlug,
          title: frontmatter.title,
          metaDescription: meta.excerpt,
          published: true,
          content: contentPayload,
          createdAt: new Date(pubDate),
          updatedAt: new Date(),
        }
      });
    }
  }

  // Also update coverImage for existing 2 articles so they use clean SVG banners
  const blog1 = await prisma.cmsPage.findUnique({ where: { slug: 'blog-automating-multi-country-payroll-2026' } });
  if (blog1) {
    const updatedContent = { ...(blog1.content || {}), coverImage: '/images/blog/blog-1.svg', socialImage: '/images/blog/blog-1.svg' };
    await prisma.cmsPage.update({ where: { id: blog1.id }, data: { content: updatedContent } });
    console.log('Updated blog-automating-multi-country-payroll-2026 cover image.');
  }

  const blog2 = await prisma.cmsPage.findUnique({ where: { slug: 'blog-next-gen-payroll-engine-2027' } });
  if (blog2) {
    const updatedContent = { ...(blog2.content || {}), coverImage: '/images/blog/blog-2.svg', socialImage: '/images/blog/blog-2.svg' };
    await prisma.cmsPage.update({ where: { id: blog2.id }, data: { content: updatedContent } });
    console.log('Updated blog-next-gen-payroll-engine-2027 cover image.');
  }

  // Count total blogs in DB
  const totalBlogs = await prisma.cmsPage.count({
    where: {
      OR: [
        { slug: { startsWith: 'blog-' } },
        { slug: 'resource-blogs' }
      ]
    }
  });

  console.log(`Import complete! Total blog articles in database: ${totalBlogs}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
