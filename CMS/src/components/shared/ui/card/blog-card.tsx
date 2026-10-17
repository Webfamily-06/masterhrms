import { cn } from '@/src/utils/cn';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import { forwardRef, type HTMLAttributes } from 'react';

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
  return (
    <article
      ref={ref}
      className={cn('group underline-hover-effect h-auto space-y-4', className)}
      {...props}
    >
      <figure
        className={cn('h-[420px] w-full overflow-hidden rounded-lg', figureClassName)}
      >
        <Link href={href} className="block h-full w-full">
          <Image
            src={image}
            alt={imageAlt}
            width={800}
            height={600}
            className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
          />
        </Link>
      </figure>

      <div className="px-3">
        <time
          dateTime={dateTime}
          className="text-tagline-3 text-secondary/80 flex items-center gap-x-2"
        >
          {publishedAt} <span>{readTime}</span>
        </time>
        <Link href={href} className="block pt-2">
          <h3 className="title text-heading-4 text-secondary/80 line-clamp-2">{title}</h3>
        </Link>
      </div>
    </article>
  );
});

BlogCard.displayName = 'BlogCard';
