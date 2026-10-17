'use client';

import { cn } from '@/src/utils/cn';
import Image, { type StaticImageData } from 'next/image';
import { useEffect, useRef } from 'react';
import { useSlideItemContext } from './slide-item-context';

const TILE_COUNT = 10;

type SlideImgProps = {
  src: StaticImageData | string;
  alt: string;
  className?: string;
};

const getImageSrc = (src: StaticImageData | string) => {
  return typeof src === 'string' ? src : src.src;
};

export const SlideImg = ({ src, alt, className }: SlideImgProps) => {
  const { registerTiles } = useSlideItemContext();
  const tileRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const imageSrc = getImageSrc(src);

  useEffect(() => {
    registerTiles(tileRefs.current.filter((tile): tile is HTMLSpanElement => tile !== null));
  }, [registerTiles, imageSrc]);

  return (
    <figure
      className={cn(
        'relative h-[280px] w-full shrink-0 overflow-hidden rounded-2xl md:h-[347px] md:w-[42%]',
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 42vw"
        className="object-cover opacity-0"
      />
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: TILE_COUNT }, (_, i) => (
          <span
            key={i}
            ref={(el) => {
              tileRefs.current[i] = el;
            }}
            className="absolute inset-y-0 bg-no-repeat opacity-0 will-change-[transform,opacity] backface-hidden"
            style={{
              left: `${i * 10}%`,
              width: '10%',
              backgroundImage: `url("${imageSrc}")`,
              backgroundSize: `${TILE_COUNT * 100}% 100%`,
              backgroundPosition: `${(i / (TILE_COUNT - 1)) * 100}% 50%`,
            }}
          />
        ))}
      </div>
    </figure>
  );
};
