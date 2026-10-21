'use client';

import { cn } from '@/src/utils/cn';
import {
  Children,
  isValidElement,
  ReactElement,
  ReactNode,
  useRef,
  useState,
} from 'react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import { Autoplay } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { hasSlideImg, SlideItemActivator, type SlideItemProps } from './slide-item';
import { SlideContext } from './split-slide-context';

type SplitSlideProps = {
  children: ReactNode;
  className?: string;
  autoplayDelay?: number;
};

/** Split mixed children: SlideItems → Swiper slides; SlideNavigation → outside Swiper. */
const partitionChildren = (children: ReactNode) => {
  const slides: ReactElement<SlideItemProps>[] = [];
  const navigationButtons: ReactElement[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (hasSlideImg(child as ReactElement<{ children?: ReactNode }>)) {
      slides.push(child as ReactElement<SlideItemProps>);
    } else {
      navigationButtons.push(child);
    }
  });

  return { slides, navigationButtons };
};

const SplitSlide = ({ children, className, autoplayDelay = 4800 }: SplitSlideProps) => {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInitial, setIsInitial] = useState(true);

  const { slides, navigationButtons } = partitionChildren(children);

  const goPrev = () => {
    swiperRef.current?.slidePrev();
    swiperRef.current?.autoplay?.start();
  };

  const goNext = () => {
    swiperRef.current?.slideNext();
    swiperRef.current?.autoplay?.start();
  };

  return (
    <SlideContext.Provider value={{ activeIndex, slideCount: slides.length, goPrev, goNext }}>
      <div
        className={cn('relative flex flex-col md:h-[357px]', className)}
        onMouseEnter={() => swiperRef.current?.autoplay?.pause()}
        onMouseLeave={() => swiperRef.current?.autoplay?.resume()}
      >
        <Swiper
          className="relative h-[500px] w-full shrink-0 overflow-hidden md:h-full"
          modules={[Autoplay]}
          slidesPerView={1}
          speed={650}
          loop
          autoplay={{ delay: autoplayDelay, disableOnInteraction: false }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            setActiveIndex(swiper.realIndex);
          }}
          onSlideChangeTransitionStart={(swiper) => {
            setActiveIndex(swiper.realIndex);
            setIsInitial(false);
          }}
        >
          {slides.map((slide, index) => (
            <SwiperSlide key={index}>
              <SlideItemActivator
                isActive={activeIndex === index}
                instant={activeIndex === index && isInitial}
              >
                {slide}
              </SlideItemActivator>
            </SwiperSlide>
          ))}
        </Swiper>

        {navigationButtons}
      </div>
    </SlideContext.Provider>
  );
};

export default SplitSlide;
