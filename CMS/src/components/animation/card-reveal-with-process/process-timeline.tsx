'use client';

import { cn } from '@/src/utils/cn';
import {
  Children,
  ComponentPropsWithoutRef,
  Fragment,
  isValidElement,
  ReactElement,
  ReactNode,
  useLayoutEffect,
  useRef,
} from 'react';
import ProcessStep from './process-step';
import { useProcessContext } from './process-context';

type ProcessStepProps = ComponentPropsWithoutRef<typeof ProcessStep>;
type ProcessStepElement = ReactElement<ProcessStepProps>;

type ProcessTimelineProps = {
  children: ReactNode;
} & ComponentPropsWithoutRef<'div'>;

const isProcessStepElement = (child: ReactNode): child is ProcessStepElement => {
  if (!isValidElement(child)) return false;

  const props = child.props as Partial<ProcessStepProps>;
  return typeof props.index === 'number' && typeof props.label === 'string';
};

const isHorizontalTimeline = (className?: string) => /\bflex-row\b/.test(className ?? '');

const ProcessTimeline = ({ children, className, ...props }: ProcessTimelineProps) => {
  const { registerTimeline } = useProcessContext();
  const timelineRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<(HTMLButtonElement | undefined)[]>([]);
  const linesRef = useRef<(HTMLElement | undefined)[]>([]);
  const isHorizontal = isHorizontalTimeline(className);

  const steps = Children.toArray(children).filter(isProcessStepElement);
  const stepCount = steps.length;
  const lineCount = Math.max(stepCount - 1, 0);
  const stepKey = steps.map((step) => step.props.index).join(',');

  useLayoutEffect(() => {
    let cleanup: (() => void) | undefined;
    let frame = 0;

    const tryRegister = () => {
      const registeredSteps = stepsRef.current.filter(
        (step): step is HTMLButtonElement => step !== undefined,
      );
      const registeredLines = linesRef.current.filter(
        (line): line is HTMLElement => line !== undefined,
      );

      if (registeredSteps.length !== stepCount || registeredLines.length !== lineCount) {
        return false;
      }

      cleanup = registerTimeline({ steps: registeredSteps, lines: registeredLines });
      return true;
    };

    if (!tryRegister()) {
      frame = requestAnimationFrame(() => {
        tryRegister();
      });
    }

    return () => {
      cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, [stepCount, lineCount, stepKey, isHorizontal, registerTimeline]);

  return (
    <div ref={timelineRef} className={cn(className)} {...props}>
      {steps.map((step, trackIndex) => {
        const { index, label, className: stepClassName, ...stepProps } = step.props;

        return (
          <Fragment key={index}>
            <ProcessStep
              {...stepProps}
              index={index}
              label={label}
              className={stepClassName}
              ref={(el) => {
                stepsRef.current[index] = el ?? undefined;
              }}
            />
            {trackIndex < stepCount - 1 && (
              <div
                className={cn(
                  'bg-stroke-3 relative shrink-0',
                  isHorizontal ? 'mx-1 inline-block h-px w-14' : 'mx-auto inline-block h-[114px] w-px',
                )}
              >
                <div
                  ref={(el) => {
                    linesRef.current[index] = el ?? undefined;
                  }}
                  data-line-axis={isHorizontal ? 'horizontal' : 'vertical'}
                  className={cn(
                    'absolute inset-0',
                    isHorizontal
                      ? 'rounded-r-full bg-linear-to-r from-[#F2F5FA00] to-[#864FFE]'
                      : 'rounded-b-full bg-linear-to-b from-[#F2F5FA00] to-[#864FFE]',
                  )}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
};

export default ProcessTimeline;
