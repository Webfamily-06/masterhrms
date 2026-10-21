import { cn } from '@/src/utils/cn';
import type { FC } from 'react';

interface IconProps {
  className?: string;
}

const FacebookIcon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    aria-hidden
    className={cn('size-5 fill-none stroke-[#F8F9FA]', className)}
  >
    <path
      d="M10 19C14.9706 19 19 14.9706 19 10C19 5.02944 14.9706 1 10 1C5.02944 1 1 5.02944 1 10C1 14.9706 5.02944 19 10 19Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.75 6.25H12.25C11.6533 6.25 11.081 6.48705 10.659 6.90901C10.2371 7.33097 10 7.90326 10 8.5V19"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M7 11.5H13" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InstagramIcon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    aria-hidden
    className={cn('size-5 fill-none stroke-[#CED7DE]', className)}
  >
    <path
      d="M10 13.75C12.0711 13.75 13.75 12.0711 13.75 10C13.75 7.92893 12.0711 6.25 10 6.25C7.92893 6.25 6.25 7.92893 6.25 10C6.25 12.0711 7.92893 13.75 10 13.75Z"
      strokeMiterlimit="10"
    />
    <path
      d="M14.125 1.375H5.875C3.38972 1.375 1.375 3.38972 1.375 5.875V14.125C1.375 16.6103 3.38972 18.625 5.875 18.625H14.125C16.6103 18.625 18.625 16.6103 18.625 14.125V5.875C18.625 3.38972 16.6103 1.375 14.125 1.375Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M14.875 6.25C15.4963 6.25 16 5.74632 16 5.125C16 4.50368 15.4963 4 14.875 4C14.2537 4 13.75 4.50368 13.75 5.125C13.75 5.74632 14.2537 6.25 14.875 6.25Z" />
  </svg>
);

const XIcon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 17 17"
    aria-hidden
    className={cn('size-[17px] fill-none stroke-[#CED7DE]', className)}
  >
    <path
      d="M15.2955 1L9.19287 7.29329M7.11364 9.4375L0.75 16M0.75 1L12.1136 16H15.75L4.38636 1H0.75Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LinkedInIcon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 18 18"
    aria-hidden
    className={cn('size-[18px] fill-none stroke-[#CED7DE]', className)}
  >
    <path
      d="M16.5 0.75H1.5C1.08579 0.75 0.75 1.08579 0.75 1.5V16.5C0.75 16.9142 1.08579 17.25 1.5 17.25H16.5C16.9142 17.25 17.25 16.9142 17.25 16.5V1.5C17.25 1.08579 16.9142 0.75 16.5 0.75Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8.25 7.5V13.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.25 7.5V13.5" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M8.25 10.125C8.25 9.42881 8.52656 8.76113 9.01884 8.26884C9.51113 7.77656 10.1788 7.5 10.875 7.5C11.5712 7.5 12.2389 7.77656 12.7312 8.26884C13.2234 8.76113 13.5 9.42881 13.5 10.125V13.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M5.25 5.625C5.87132 5.625 6.375 5.12132 6.375 4.5C6.375 3.87868 5.87132 3.375 5.25 3.375C4.62868 3.375 4.125 3.87868 4.125 4.5C4.125 5.12132 4.62868 5.625 5.25 5.625Z" />
  </svg>
);

const YouTubeIcon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    aria-hidden
    className={cn('size-[24px] fill-none stroke-[#CED7DE]', className)}
  >
    <path
      d="M22.5406 6.42C22.4218 5.94541 22.1799 5.51057 21.8392 5.15941C21.4986 4.80824 21.0713 4.55318 20.6006 4.42C18.8806 4 12.0006 4 12.0006 4C12.0006 4 5.12057 4 3.40057 4.46C2.92982 4.59318 2.50255 4.84824 2.16192 5.19941C1.82129 5.55057 1.57936 5.98541 1.46057 6.46C1.14579 8.20556 0.991808 9.97631 1.00057 11.75C0.989351 13.537 1.14334 15.3213 1.46057 17.08C1.59153 17.5398 1.83888 17.9581 2.17872 18.2945C2.51855 18.6308 2.93939 18.8738 3.40057 19C5.12057 19.46 12.0006 19.46 12.0006 19.46C12.0006 19.46 18.8806 19.46 20.6006 19C21.0713 18.8668 21.4986 18.6118 21.8392 18.2606C22.1799 17.9094 22.4218 17.4746 22.5406 17C22.8529 15.2676 23.0069 13.5103 23.0006 11.75C23.0118 9.96295 22.8578 8.1787 22.5406 6.42V6.42Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.75 15.0166L15.5 11.7466L9.75 8.47656V15.0166Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const StarIcon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 11 11"
    fill="none"
    className={cn('fill-opai-purple size-[11px] shrink-0', className)}
  >
    <path d="M5.21514 1.2258C5.38701 0.820568 5.97239 0.820568 6.14426 1.2258L7.15865 3.61752C7.23115 3.78836 7.39498 3.90508 7.58304 3.91986L10.216 4.12687C10.6622 4.16194 10.843 4.70789 10.5032 4.99341L8.49709 6.67856C8.35382 6.79895 8.29121 6.98782 8.33498 7.16777L8.94787 9.68744C9.05171 10.1143 8.57815 10.4518 8.19621 10.223L5.94197 8.87275C5.78095 8.7763 5.57845 8.7763 5.41744 8.87275L3.16319 10.223C2.78125 10.4518 2.30767 10.1143 2.41151 9.68744L3.0244 7.16777C3.06818 6.98782 3.0056 6.79895 2.86232 6.67856L0.856219 4.99341C0.516328 4.70789 0.697221 4.16194 1.14333 4.12687L3.77637 3.91986C3.96445 3.90508 4.12827 3.78836 4.20073 3.61752L5.21514 1.2258Z" />
  </svg>
);

const ArrowRightIcon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden
    className={cn('fill-none stroke-current', className)}
  >
    <path d="M3.33301 8H12.6663" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 3.33325L12.6667 7.99992L8 12.6666" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden
    className={cn('fill-none stroke-current', className)}
  >
    <path
      d="M13.3337 4L6.00033 11.3333L2.66699 8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ArrowUpIcon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 12 18"
    fill="none"
    aria-hidden
    className={cn('fill-current', className)}
  >
    <path d="M0.17521 5.2682C-0.0908608 5.58565 -0.0492032 6.0587 0.268254 6.32477C0.585712 6.59084 1.05876 6.54918 1.32483 6.23172L5.00002 1.84673L5.00002 16.75C5.00002 17.1642 5.3358 17.5 5.75002 17.5C6.16423 17.5 6.50002 17.1642 6.50002 16.75L6.50002 1.84803L10.1753 6.23181C10.4414 6.54922 10.9144 6.59081 11.2319 6.3247C11.5493 6.05858 11.5909 5.58553 11.3248 5.26811L7.64149 0.874796C6.66384 -0.291572 4.83506 -0.291625 3.85744 0.874796L0.17521 5.2682Z" />
  </svg>
);

const GradientCircleIcon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden
    className={cn('size-2.5 shrink-0', className)}
  >
    <circle cx="5" cy="5" r="5" fill="url(#gradient_circle_icon_paint)" />
    <defs>
      <linearGradient
        id="gradient_circle_icon_paint"
        x1="5"
        y1="0"
        x2="5"
        y2="10"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#A585FF" />
        <stop offset="1" stopColor="#FFC2AD" />
      </linearGradient>
    </defs>
  </svg>
);

const ArrowDotLeftIcon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    className={cn('fill-current', className)}
  >
    <path d="M16 5H14V7H16V5Z" />
    <path d="M13 8H11V10H13V8Z" />
    <path d="M10 11H8V13H10V11Z" />
    <path d="M13 14H11V16H13V14Z" />
    <path d="M16 17H14V19H16V17Z" />
  </svg>
);

const LocationIcon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    className={cn('fill-current', className)}
  >
    <path d="M12 6C11.2583 6 10.5333 6.21993 9.91661 6.63199C9.29993 7.04404 8.81928 7.62971 8.53545 8.31494C8.25162 9.00016 8.17736 9.75416 8.32205 10.4816C8.46675 11.209 8.8239 11.8772 9.34835 12.4017C9.8728 12.9261 10.541 13.2833 11.2684 13.4279C11.9958 13.5726 12.7498 13.4984 13.4351 13.2145C14.1203 12.9307 14.706 12.4501 15.118 11.8334C15.5301 11.2167 15.75 10.4917 15.75 9.75C15.75 8.75544 15.3549 7.80161 14.6517 7.09835C13.9484 6.39509 12.9946 6 12 6ZM12 12C11.555 12 11.12 11.868 10.75 11.6208C10.38 11.3736 10.0916 11.0222 9.92127 10.611C9.75097 10.1999 9.70642 9.7475 9.79323 9.31105C9.88005 8.87459 10.0943 8.47368 10.409 8.15901C10.7237 7.84434 11.1246 7.63005 11.561 7.54323C11.9975 7.45642 12.4499 7.50097 12.861 7.67127C13.2722 7.84157 13.6236 8.12996 13.8708 8.49997C14.118 8.86998 14.25 9.30499 14.25 9.75C14.25 10.3467 14.0129 10.919 13.591 11.341C13.169 11.7629 12.5967 12 12 12ZM12 1.5C9.81273 1.50248 7.71575 2.37247 6.16911 3.91911C4.62247 5.46575 3.75248 7.56273 3.75 9.75C3.75 12.6937 5.11031 15.8138 7.6875 18.7734C8.84552 20.1108 10.1489 21.3151 11.5734 22.3641C11.6995 22.4524 11.8498 22.4998 12.0037 22.4998C12.1577 22.4998 12.308 22.4524 12.4341 22.3641C13.856 21.3147 15.1568 20.1104 16.3125 18.7734C18.8859 15.8138 20.25 12.6937 20.25 9.75C20.2475 7.56273 19.3775 5.46575 17.8309 3.91911C16.2843 2.37247 14.1873 1.50248 12 1.5ZM12 20.8125C10.4503 19.5938 5.25 15.1172 5.25 9.75C5.25 7.95979 5.96116 6.2429 7.22703 4.97703C8.4929 3.71116 10.2098 3 12 3C13.7902 3 15.5071 3.71116 16.773 4.97703C18.0388 6.2429 18.75 7.95979 18.75 9.75C18.75 15.1153 13.5497 19.5938 12 20.8125Z" />
  </svg>
);

const ArrowDotRightIcon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    className={cn('fill-current', className)}
  >
    <path d="M8 5H10V7H8V5Z" />
    <path d="M11 8H13V10H11V8Z" />
    <path d="M14 11H16V13H14V11Z" />
    <path d="M11 14H13V16H11V14Z" />
    <path d="M8 17H10V19H8V17Z" />
  </svg>
);

export {
  ArrowDotLeftIcon,
  ArrowDotRightIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  FacebookIcon,
  GradientCircleIcon,
  InstagramIcon,
  LinkedInIcon,
  LocationIcon,
  StarIcon,
  XIcon,
  YouTubeIcon,
};
