export type StepState = 'active' | 'completed' | 'inactive';

export type TimelineRegistration = {
  steps: HTMLButtonElement[];
  lines: HTMLElement[];
};

export type ProcessContextValue = {
  cardCount: number;
  activeIndex: number;
  getStepState: (index: number) => StepState;
  registerCard: (index: number, el: HTMLElement | null) => void;
  registerImage: (index: number, el: HTMLElement | null) => void;
  registerContent: (index: number, el: HTMLElement | null) => void;
  registerTimeline: (registration: TimelineRegistration) => () => void;
  goToStep: (index: number) => void;
  setPaused: (paused: boolean) => void;
  pauseLineTween: () => void;
  resumeLineTween: () => void;
  killLineTween: () => void;
  killLoopDelay: () => void;
  scheduleLoop: () => void;
  runLoop: () => void;
  isReady: boolean;
};
