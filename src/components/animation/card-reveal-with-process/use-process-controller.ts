'use client';

import { gsap } from 'gsap';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PROCESS_ANIMATION } from './process-animation-config';
import {
  animateTimelineLine,
  initTimelineLines,
  setTimelineLineProgress,
} from './process-line-animation';
import { slideToCard } from './process-slide-animation';
import type { ProcessContextValue, StepState, TimelineRegistration } from './process-types';

export const useProcessController = (cardCount: number): ProcessContextValue => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const cardsRef = useRef<Map<number, HTMLElement>>(new Map());
  const imagesRef = useRef<Map<number, HTMLElement>>(new Map());
  const contentsRef = useRef<Map<number, HTMLElement>>(new Map());
  const timelinesRef = useRef<TimelineRegistration[]>([]);

  const activeIndexRef = useRef(0);
  const busyRef = useRef(false);
  const isPausedRef = useRef(false);
  const lineTlRef = useRef<gsap.core.Timeline | undefined>(undefined);
  const loopDelayRef = useRef<gsap.core.Tween | undefined>(undefined);
  const runLoopRef = useRef<() => void>(() => {});

  const getStepState = useCallback(
    (index: number): StepState => {
      if (index === activeIndex) return 'active';
      if (index < activeIndex) return 'completed';
      return 'inactive';
    },
    [activeIndex],
  );

  const setLineProgress = useCallback((index: number) => {
    setTimelineLineProgress(timelinesRef.current, index);
  }, []);

  const tryMarkReady = useCallback(() => {
    const ready =
      cardsRef.current.size === cardCount &&
      imagesRef.current.size === cardCount &&
      contentsRef.current.size === cardCount &&
      timelinesRef.current.length === 2;

    if (ready && !isReady) {
      setIsReady(true);
      setLineProgress(0);
    }
  }, [cardCount, isReady, setLineProgress]);

  const registerCard = useCallback(
    (index: number, el: HTMLElement | null) => {
      if (el) cardsRef.current.set(index, el);
      else cardsRef.current.delete(index);
      tryMarkReady();
    },
    [tryMarkReady],
  );

  const registerImage = useCallback(
    (index: number, el: HTMLElement | null) => {
      if (el) imagesRef.current.set(index, el);
      else imagesRef.current.delete(index);
      tryMarkReady();
    },
    [tryMarkReady],
  );

  const registerContent = useCallback(
    (index: number, el: HTMLElement | null) => {
      if (el) contentsRef.current.set(index, el);
      else contentsRef.current.delete(index);
      tryMarkReady();
    },
    [tryMarkReady],
  );

  const registerTimeline = useCallback(
    (registration: TimelineRegistration) => {
      timelinesRef.current.push(registration);
      initTimelineLines(timelinesRef.current);
      tryMarkReady();

      return () => {
        timelinesRef.current = timelinesRef.current.filter((item) => item !== registration);
      };
    },
    [tryMarkReady],
  );

  const slideTo = useCallback(
    (nextIndex: number, reverse = false) => {
      slideToCard({
        nextIndex,
        reverse,
        cards: cardsRef.current,
        images: imagesRef.current,
        contents: contentsRef.current,
        activeIndex: activeIndexRef.current,
        busyRef,
        onIndexChange: (index) => {
          activeIndexRef.current = index;
          setActiveIndex(index);
        },
        onLineProgress: setLineProgress,
      });
    },
    [setLineProgress],
  );

  const scheduleLoop = useCallback(() => {
    if (isPausedRef.current) return;
    loopDelayRef.current?.kill();
    loopDelayRef.current = gsap.delayedCall(PROCESS_ANIMATION.STEP_WAIT, () => runLoopRef.current());
  }, []);

  const runLoop = useCallback(() => {
    if (isPausedRef.current || busyRef.current) {
      scheduleLoop();
      return;
    }

    const currentIndex = activeIndexRef.current;
    const nextIndex = (currentIndex + 1) % cardCount;
    const lineIndex = currentIndex % Math.max(cardCount - 1, 1);

    lineTlRef.current = gsap.timeline({
      onComplete: () => {
        slideTo(nextIndex);
        scheduleLoop();
      },
    });

    animateTimelineLine(timelinesRef.current, lineIndex, lineTlRef.current);
  }, [cardCount, scheduleLoop, slideTo]);

  useEffect(() => {
    runLoopRef.current = runLoop;
  }, [runLoop]);

  const goToStep = useCallback(
    (index: number) => {
      if (index === activeIndexRef.current || busyRef.current) return;
      lineTlRef.current?.kill();
      loopDelayRef.current?.kill();
      slideTo(index, index < activeIndexRef.current);
      scheduleLoop();
    },
    [scheduleLoop, slideTo],
  );

  const setPaused = useCallback((paused: boolean) => {
    isPausedRef.current = paused;
  }, []);

  const pauseLineTween = useCallback(() => {
    lineTlRef.current?.pause();
    loopDelayRef.current?.pause();
  }, []);

  const resumeLineTween = useCallback(() => {
    if (lineTlRef.current?.isActive()) lineTlRef.current.resume();
  }, []);

  const killLineTween = useCallback(() => {
    lineTlRef.current?.kill();
  }, []);

  const killLoopDelay = useCallback(() => {
    loopDelayRef.current?.kill();
  }, []);

  return useMemo<ProcessContextValue>(
    () => ({
      cardCount,
      activeIndex,
      getStepState,
      registerCard,
      registerImage,
      registerContent,
      registerTimeline,
      goToStep,
      setPaused,
      pauseLineTween,
      resumeLineTween,
      killLineTween,
      killLoopDelay,
      scheduleLoop,
      runLoop,
      isReady,
    }),
    [
      cardCount,
      activeIndex,
      getStepState,
      registerCard,
      registerImage,
      registerContent,
      registerTimeline,
      goToStep,
      setPaused,
      pauseLineTween,
      resumeLineTween,
      killLineTween,
      killLoopDelay,
      scheduleLoop,
      runLoop,
      isReady,
    ],
  );
};
