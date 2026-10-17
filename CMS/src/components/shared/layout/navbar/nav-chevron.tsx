import { cn } from '@/src/utils/cn';

export const NavChevron = ({ open }: Readonly<{ open: boolean }>) => (
  <span
    className={cn(
      'nav-arrow block origin-center translate-y-px transition-all duration-300',
      open && 'rotate-180'
    )}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="size-4"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  </span>
);
