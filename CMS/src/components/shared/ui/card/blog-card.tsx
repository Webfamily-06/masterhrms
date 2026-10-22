'use client';

import { cn } from '@/src/utils/cn';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import { forwardRef, useState, type HTMLAttributes } from 'react';

export type BlogCardProps = HTMLAttributes<HTMLElement> & {
  image: string | StaticImageData;
  imageAlt: string;
  title: string;
  href: string;
  publishedAt: string;
  dateTime: string;
  readTime: string;
  figureClassName?: string;
};

const PLACEHOLDER_MAP: Record<string, string> = {
  '/images/ns-img-34.jpg': '/images/blog/blog-3.svg',
  '/images/ns-img-35.jpg': '/images/blog/blog-6.svg',
  '/images/ns-img-36.jpg': '/images/blog/blog-4.svg',
  '/images/ns-img-37.jpg': '/images/blog/blog-8.svg',
  '/images/ns-img-38.jpg': '/images/blog/blog-5.svg',
  '/images/ns-img-39.jpg': '/images/blog/blog-7.svg',
  '/images/opai-img-133.jpg': '/images/blog/blog-1.svg',
  '/images/opai-img-135.jpg': '/images/blog/blog-2.svg',
};

export const BlogCard = forwardRef<HTMLElement, BlogCardProps>(function BlogCard(
  {
    image,
    imageAlt,
    title,
    href,
    publishedAt,
    dateTime,
    readTime,
    figureClassName,
    className,
    ...props
  },
  ref
) {
  // Map grey dimension placeholder images to high-res branded SVG artwork
  let resolvedImage = typeof image === 'string' ? (PLACEHOLDER_MAP[image] || image) : image;
  if (typeof resolvedImage === 'string' && resolvedImage.endsWith('.jpg') && resolvedImage.startsWith('/images/blog/')) {
    resolvedImage = resolvedImage.replace(/\.jpg$/, '.svg');
  }

  const [hasError, setHasError] = useState(false);

  return (
    <article
      ref={ref}
      className={cn('group underline-hover-effect h-auto space-y-4 flex flex-col', className)}
      {...props}
    >
      <figure
        className={cn(
          'aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-900/10 dark:bg-slate-800/40 border border-border/40 relative shadow-sm',
          figureClassName
        )}
      >
        <Link href={href} className="block h-full w-full relative">
          {!hasError ? (
            <Image
              src={resolvedImage}
              alt={imageAlt || title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-all duration-500 group-hover:scale-105"
              onError={() => setHasError(true)}
              unoptimized
            />
          ) : (
            <div className="size-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white text-center">
              <span className="p-2.5 rounded-xl bg-primary/20 text-primary-300 mb-2">
                <i className="ph-duotone ph-book-open text-2xl"></i>
              </span>
              <p className="text-xs font-semibold text-slate-300 line-clamp-2">{title}</p>
            </div>
          )}
        </Link>
      </figure>

      <div className="px-1 flex-1 flex flex-col justify-between">
        <time
          dateTime={dateTime}
          className="text-tagline-3 text-secondary/80 flex items-center gap-x-2 font-medium"
        >
          <span>{publishedAt}</span>
          <span className="inline-block size-1 rounded-full bg-secondary/40" />
          <span>{readTime}</span>
        </time>
        <Link href={href} className="block pt-2 mt-auto">
          <h3 className="title text-heading-4 text-secondary/90 font-bold line-clamp-2 hover:text-primary transition-colors">
            {title}
          </h3>
        </Link>
      </div>
    </article>
  );
});

BlogCard.displayName = 'BlogCard';
