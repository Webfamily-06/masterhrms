import avatar11 from '@/public/images/ns-avatar-11.jpg';
import avatar12 from '@/public/images/ns-avatar-12.jpg';
import avatar13 from '@/public/images/ns-avatar-13.jpg';
import avatar4 from '@/public/images/ns-avatar-4.jpg';
import avatar5 from '@/public/images/ns-avatar-5.jpg';
import avatar6 from '@/public/images/ns-avatar-6.jpg';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { BadgePrimary } from '@/src/components/shared/ui/badge';
import { ButtonPrimary } from '@/src/components/shared/ui/button';
import { TeamCard } from '@/src/components/shared/ui/card';
import Link from 'next/link';

const teamMembers = [
  {
    image: avatar11,
    name: 'James Walker',
    title: 'Chief Technology Officer',
    href: '/team/james-walker',
  },
  {
    image: avatar12,
    name: 'Elijah Brooks',
    title: 'Senior automation engineer',
    href: '/team/elijah-brooks',
  },
  {
    image: avatar13,
    name: 'Michael Rivera',
    title: 'Platform infrastructure lead',
    href: '/team/michael-rivera',
  },
  {
    image: avatar4,
    name: 'Daniel Kim',
    title: 'Workflow product lead',
    href: '/team/daniel-kim',
  },
  {
    image: avatar5,
    name: 'Robert Hayes',
    title: 'Integrations specialist',
    href: '/team/robert-hayes',
  },
  {
    image: avatar6,
    name: 'Brandon Scott',
    title: 'Security & compliance lead',
    href: '/team/brandon-scott',
    cardClassName: 'lg:max-w-[409px]',
  },
];

const AboutTeam = () => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container space-y-10 md:space-y-14">
        <div className="space-y-1.5 text-center md:space-y-3 md:pb-6">
          <RevealAnimation delay={0.1}>
            <BadgePrimary>Meet the team</BadgePrimary>
          </RevealAnimation>

          <TextReveal delay={0.2}>
            <h2>The minds behind Nexsas</h2>
          </TextReveal>

          <TextReveal delay={0.3}>
            <p className="text-background-14/60 mx-auto max-w-[640px]">
              Our team brings together product, design, and engineering to build automation people
              actually use. Every release is shaped by feedback from teams like yours.
            </p>
          </TextReveal>
        </div>

        <div className="grid grid-cols-12 gap-y-8 md:gap-x-8">
          {teamMembers.map((member, index) => (
            <RevealAnimation
              key={member.name}
              delay={0.1 + index * 0.1}
              className="col-span-12 md:col-span-6 lg:col-span-4"
            >
              <TeamCard
                image={member.image}
                name={member.name}
                title={member.title}
                href={member.href}
                className={member.cardClassName}
              />
            </RevealAnimation>
          ))}
        </div>

        <RevealAnimation delay={0.1} asChild={false} offset={40} className="flex justify-center">
          <Link href="/team" className="inline-flex">
            <ButtonPrimary
              className="md:w-auto!"
              textClassName="text-center text-nowrap max-sm:flex-1 max-sm:pr-8!"
            >
              Meet our experts
            </ButtonPrimary>
          </Link>
        </RevealAnimation>
      </div>
    </section>
  );
};

export default AboutTeam;
