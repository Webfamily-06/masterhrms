import { gsap } from 'gsap';
import { PROCESS_ANIMATION, PROCESS_REVEAL_DUR } from './process-animation-config';

type SlideToParams = {
  nextIndex: number;
  reverse?: boolean;
  cards: Map<number, HTMLElement>;
  images: Map<number, HTMLElement>;
  contents: Map<number, HTMLElement>;
  activeIndex: number;
  busyRef: { current: boolean };
  onIndexChange: (index: number) => void;
  onLineProgress: (index: number) => void;
};

export const slideToCard = ({
  nextIndex,
  reverse = false,
  cards,
  images,
  contents,
  activeIndex,
  busyRef,
  onIndexChange,
  onLineProgress,
}: SlideToParams) => {
  if (busyRef.current || nextIndex === activeIndex) return;

  const current = cards.get(activeIndex);
  const next = cards.get(nextIndex);
  if (!current || !next) return;

  busyRef.current = true;

  const currentImage = images.get(activeIndex);
  const currentText = contents.get(activeIndex);
  const nextImage = images.get(nextIndex);
  const nextText = contents.get(nextIndex);

  const { CLOSE_DUR, OPEN_DUR, EASE, TEXT_STAGGER, BLUR_IN, BLUR_OUT } = PROCESS_ANIMATION;

  gsap.killTweensOf([current, next, currentImage, currentText, nextImage, nextText]);

  const tl = gsap.timeline();
  tl.set(next, { pointerEvents: 'auto', zIndex: 2, backgroundColor: 'transparent' }, 0);
  tl.set(current, { zIndex: 3, backgroundColor: 'transparent' }, 0);

  if (nextImage)
    tl.set(nextImage, { yPercent: reverse ? -100 : 100, opacity: 0, filter: BLUR_IN }, 0);
  if (nextText)
    tl.set(nextText, { yPercent: reverse ? 100 : -100, opacity: 0, filter: BLUR_IN }, 0);

  if (currentImage)
    tl.to(
      currentImage,
      {
        yPercent: reverse ? 100 : -100,
        opacity: 0,
        filter: BLUR_IN,
        duration: CLOSE_DUR,
        force3D: true,
        ease: EASE,
      },
      0,
    );
  if (nextImage)
    tl.to(
      nextImage,
      {
        yPercent: 0,
        opacity: 1,
        filter: BLUR_OUT,
        duration: OPEN_DUR,
        force3D: true,
        ease: EASE,
      },
      0,
    );
  if (currentText)
    tl.to(
      currentText,
      {
        yPercent: reverse ? -100 : 100,
        opacity: 0,
        filter: BLUR_IN,
        duration: CLOSE_DUR,
        force3D: true,
        ease: EASE,
      },
      0,
    );
  if (nextText)
    tl.to(
      nextText,
      {
        yPercent: 0,
        opacity: 1,
        filter: BLUR_OUT,
        duration: OPEN_DUR,
        force3D: true,
        ease: EASE,
      },
      TEXT_STAGGER,
    );

  tl.set(current, { pointerEvents: 'none', zIndex: 0, backgroundColor: '' }, PROCESS_REVEAL_DUR);
  tl.set(next, { backgroundColor: '' }, PROCESS_REVEAL_DUR);
  if (currentImage)
    tl.set(currentImage, { yPercent: 0, opacity: 0, filter: BLUR_OUT }, PROCESS_REVEAL_DUR);
  if (currentText)
    tl.set(currentText, { yPercent: 0, opacity: 0, filter: BLUR_OUT }, PROCESS_REVEAL_DUR);
  tl.call(
    () => {
      busyRef.current = false;
    },
    [],
    PROCESS_REVEAL_DUR,
  );

  onIndexChange(nextIndex);
  onLineProgress(nextIndex);
};
