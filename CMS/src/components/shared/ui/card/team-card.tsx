import { cn } from '@/src/utils/cn';
import Image, { StaticImageData } from 'next/image';
import Link from 'next/link';

export type TeamCardProps = Readonly<{
  image: StaticImageData | string;
  name: string;
  title: string;
  href: string;
  className?: string;
}>;

export const TeamCard = ({ image, name, title, href, className }: TeamCardProps) => (
  <div className="col-span-12 md:col-span-6 lg:col-span-4">
    <div
      className={cn(
        'group bg-background-5 relative mx-auto max-h-[395px] w-full max-w-[708px] overflow-hidden rounded-[20px] lg:max-w-[409px]',
        className
      )}
      aria-label="Team member profile"
    >
      <figure className="size-full overflow-hidden transition-transform duration-400 ease-out group-hover:scale-[1.03]">
        <Image src={image} width={409} height={395} alt={name} className="size-full object-cover" />
      </figure>
      <div className="absolute bottom-5 left-1/2 w-[calc(100%-40px)] -translate-x-1/2 space-y-0.5 rounded-md bg-white/50 p-5 backdrop-blur-[15px] transition-all duration-400 ease-out lg:translate-y-[30%] lg:scale-[90%] lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:scale-100 lg:group-hover:opacity-100">
        <Link href={href}>
          <h3 className="text-heading-6 text-secondary font-medium">{name}</h3>
        </Link>
        <p className="text-tagline-3 text-secondary/50 font-normal">{title}</p>
      </div>
    </div>
  </div>
);
