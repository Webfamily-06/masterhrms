'use client';

import { cn } from '@/src/utils/cn';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import Image, { StaticImageData } from 'next/image';
import { ComponentPropsWithoutRef, useEffect, useRef } from 'react';
import { PROCESS_ANIMATION } from './process-animation-config';
import { useProcessContext } from './process-context';

gsap.registerPlugin(useGSAP);

const overlayFigureStyle = { boxShadow: '0 1px 0 0 rgba(255, 255, 255, 0.4) inset' };

type ProcessImgProps = {
  index: number;
  image: StaticImageData | string;
  imageAlt: string;
  overlay: StaticImageData | string;
  overlayAlt: string;
} & ComponentPropsWithoutRef<'figure'>;

const ProcessImg = ({
  index,
  image,
  imageAlt,
  overlay,
  overlayAlt,
  className,
  ...props
}: ProcessImgProps) => {
  const { registerImage } = useProcessContext();
  const imageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    registerImage(index, imageRef.current);
    return () => registerImage(index, null);
  }, [index, registerImage]);

  useGSAP(
    () => {
      const el = imageRef.current;
      if (!el) return;

      gsap.set(el, {
        yPercent: 0,
        opacity: index === 0 ? 1 : 0,
        filter: PROCESS_ANIMATION.BLUR_OUT,
        willChange: 'transform, opacity, filter',
      });
    },
    { dependencies: [index] },
  );

  return (
    <figure
      ref={imageRef}
      className={cn('relative h-fit w-full overflow-hidden rounded-2xl md:h-[464px]', className)}
      {...props}
    >
      <Image src={image} alt={imageAlt} className="size-full rounded-2xl object-cover" />
      <figure
        className="absolute bottom-7 left-1/2 z-20 w-[calc(100%-48px)] -translate-x-1/2 overflow-hidden rounded-2xl bg-white/15 backdrop-blur-[20px]"
        style={overlayFigureStyle}
      >
        <Image src={overlay} alt={overlayAlt} />
      </figure>
    </figure>
  );
};

export default ProcessImg;
