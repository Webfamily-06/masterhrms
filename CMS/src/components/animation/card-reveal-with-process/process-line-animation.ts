import { gsap } from 'gsap';
import { PROCESS_ANIMATION } from './process-animation-config';
import type { TimelineRegistration } from './process-types';

export const isLineHorizontal = (el: HTMLElement) => {
  const axis = el.dataset.lineAxis;
  if (axis === 'horizontal') return true;
  if (axis === 'vertical') return false;
  return el.offsetWidth > el.offsetHeight;
};

export const initTimelineLines = (timelines: TimelineRegistration[]) => {
  timelines.forEach(({ lines }) => {
    lines.forEach((line) => {
      if (isLineHorizontal(line))
        gsap.set(line, { transformOrigin: 'left center', scaleX: 0 });
      else gsap.set(line, { transformOrigin: 'top center', scaleY: 0 });
    });
  });
};

export const setTimelineLineProgress = (timelines: TimelineRegistration[], index: number) => {
  timelines.forEach(({ lines }) => {
    lines.forEach((line, i) => {
      if (isLineHorizontal(line)) gsap.set(line, { scaleX: i < index ? 1 : 0 });
      else gsap.set(line, { scaleY: i < index ? 1 : 0 });
    });
  });
};

export const animateTimelineLine = (
  timelines: TimelineRegistration[],
  lineIndex: number,
  timeline: gsap.core.Timeline,
) => {
  timelines.forEach(({ lines }) => {
    const line = lines[lineIndex];
    if (!line) return;

    if (isLineHorizontal(line))
      timeline.to(
        line,
        { scaleX: 1, duration: PROCESS_ANIMATION.LINE_DURATION, ease: 'sine.inOut' },
        0,
      );
    else
      timeline.to(
        line,
        { scaleY: 1, duration: PROCESS_ANIMATION.LINE_DURATION, ease: 'sine.inOut' },
        0,
      );
  });
};
