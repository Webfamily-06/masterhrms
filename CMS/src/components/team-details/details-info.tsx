import gradientImg from '@/public/images/gradient/opai-15.png';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { SocialIcons } from '@/src/components/shared/social-icons';
import TeamDetailsMarkdown from '@/src/components/team-details/team-details-markdown';
import { TeamMember } from '@/src/interface/interface';
import Image from 'next/image';

const SOCIAL_LINKS = [
  { name: 'Facebook', href: 'https://www.facebook.com/' },
  { name: 'Instagram', href: 'https://www.instagram.com/' },
  { name: 'X', href: 'https://x.com/' },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/' },
  { name: 'YouTube', href: 'https://www.youtube.com/' },
] as const;

function phoneToTelHref(phone: string) {
  const digits = phone.replaceAll(/\D/g, '');
  return digits ? `tel:+${digits}` : '#';
}

interface DetailsInfoProps {
  data: Partial<TeamMember>;
  content: string;
}

const DetailsInfo = ({ data, content }: DetailsInfoProps) => {
  const phone = data.phone ?? '';
  const telHref = phoneToTelHref(phone);

  return (
    <section className="overflow-hidden pt-[190px]">
      <div className="main-container">
        <div className="bg-background-5 mx-auto w-full max-w-[850px] overflow-hidden rounded-[20px]">
          <RevealAnimation
            asChild={false}
            delay={0.1}
            className="relative mx-auto flex h-[700px] w-full items-end overflow-hidden rounded-t-[20px] bg-cover bg-center px-8 py-[42px] xl:h-[922px]"
            style={{ backgroundImage: `url(${data.heroImage})` }}
          />

          <RevealAnimation
            asChild={false}
            delay={0.2}
            className="bg-background-5 relative w-full max-w-full overflow-hidden rounded-b-[20px] p-6 lg:p-[42px]"
          >
            <figure
              className="pointer-events-none absolute -top-144 -right-117 rotate-180"
              aria-hidden="true"
            >
              <Image src={gradientImg} alt="" className="size-full object-cover" />
            </figure>

            <div className="relative z-10 flex flex-col items-center justify-between gap-x-4 gap-y-6 md:flex-row md:gap-y-0">
              <div className="border-stroke-3/20 basis-1/2 space-y-4 border-b pr-4 pb-4 md:border-r md:border-b-0 md:pb-0">
                <div className="space-y-1">
                  <TextReveal delay={0.3}>
                    <p className="text-tagline-3 text-white/70">{data.title}</p>
                  </TextReveal>
                  <TextReveal delay={0.4}>
                    <h2 className="text-heading-4 text-white">{data.name}</h2>
                  </TextReveal>
                </div>

                <TextReveal delay={0.5}>
                  <p className="text-tagline-3 mr-5 text-white/75 lg:mr-0">{data.bio}</p>
                </TextReveal>
              </div>

              <div className="w-full space-y-5.5 md:basis-1/2">
                <div className="space-y-2">
                  <TextReveal delay={0.4}>
                    <h3 className="text-heading-5 text-white">Contact information</h3>
                  </TextReveal>
                  <TextReveal delay={0.5}>
                    <p className="text-tagline-3 text-white/75">
                      <a href={telHref} className="block hover:underline">
                        {phone}
                      </a>
                      <a href={`mailto:${data.email}`} className="block hover:underline">
                        {data.email}
                      </a>
                    </p>
                  </TextReveal>
                </div>

                <RevealAnimation delay={0.6}>
                  <SocialIcons links={SOCIAL_LINKS} iconClassName="stroke-white" />
                </RevealAnimation>
              </div>
            </div>
          </RevealAnimation>
        </div>

        <TeamDetailsMarkdown content={content} />
      </div>
    </section>
  );
};

export default DetailsInfo;
