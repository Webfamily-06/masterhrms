import { cn } from '@/src/utils/cn';
import type { CSSProperties } from 'react';

export type ProgressiveBlurPosition = 'bottom' | 'top' | 'left' | 'right';

export interface ProgressiveBlurProps {
  /** Scales blur amounts; baseline matches script default `50` (factor 1 → 1px / 3px / 6px). */
  intensity?: number;
  position?: ProgressiveBlurPosition;
  className?: string;
}

const GRADIENT_DIRECTION: Record<ProgressiveBlurPosition, string> = {
  bottom: 'to bottom',
  top: 'to top',
  left: 'to left',
  right: 'to right',
};

const CONTAINER_POSITION: Record<ProgressiveBlurPosition, CSSProperties> = {
  bottom: { bottom: 0, left: 0, right: 0, top: 'auto' },
  top: { top: 0, left: 0, right: 0, bottom: 'auto' },
  left: { left: 0, top: 0, bottom: 0, right: 'auto' },
  right: { right: 0, top: 0, bottom: 0, left: 'auto' },
};

const BLUR_LAYERS = [
  { blurFactor: 1, maskStart: 0, maskEnd: 25, zIndex: 1 },
  { blurFactor: 3, maskStart: 25, maskEnd: 75, zIndex: 2 },
  { blurFactor: 6, maskStart: 75, maskEnd: 100, zIndex: 3 },
] as const;

const ProgressiveBlur = ({
  intensity = 50,
  position = 'top',
  className,
}: ProgressiveBlurProps) => {
  const intensityFactor = intensity / 50;

  return (
    <div
      className={cn('pointer-events-none absolute z-10', className)}
      style={CONTAINER_POSITION[position]}
      aria-hidden
      data-progressive-blur-effect
    >
      {BLUR_LAYERS.map((layer) => {
        const blur = `${layer.blurFactor * intensityFactor}px`;
        const maskImage = `linear-gradient(${GRADIENT_DIRECTION[position]}, transparent ${layer.maskStart}%, black ${layer.maskEnd}%)`;
        return (
          <div
            key={layer.zIndex}
            className="pointer-events-none absolute inset-0"
            style={{
              zIndex: layer.zIndex,
              backdropFilter: `blur(${blur})`,
              WebkitBackdropFilter: `blur(${blur})`,
              maskImage,
              WebkitMaskImage: maskImage,
            }}
          />
        );
      })}
    </div>
  );
};

export default ProgressiveBlur;
