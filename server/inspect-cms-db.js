const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const blogs = await prisma.blogPost.findMany({
    select: { id: true, slug: true, title: true, category: true, tags: true, published: true, createdAt: true }
  });
  console.log('--- BLOG POSTS ---');
  console.log(JSON.stringify(blogs, null, 2));

  const faqs = await prisma.faq.findMany({
    select: { id: true, question: true, category: true, order: true, published: true }
  });
  console.log('--- FAQS ---');
  console.log(JSON.stringify(faqs, null, 2));

  const testimonials = await prisma.testimonial.findMany({
    select: { id: true, name: true, role: true, company: true, order: true, published: true }
  });
  console.log('--- TESTIMONIALS ---');
  console.log(JSON.stringify(testimonials, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
