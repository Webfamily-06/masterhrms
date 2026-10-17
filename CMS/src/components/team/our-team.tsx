import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { BadgePrimary } from '@/src/components/shared/ui/badge';
import { TeamCard } from '@/src/components/shared/ui/card';
import { TeamMember } from '@/src/interface/interface';
import getMarkDownData from '@/src/utils/getMarkDownData';

const members = getMarkDownData<TeamMember>('src/data/team', false, 'order');

const OurTeam = () => {
  return (
    <section className="overflow-hidden pt-[190px]">
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
              Our team brings together product, design, and engineering to ship automation people
              rely on.
              <br className="hidden md:block" />
              Every release is shaped by feedback from teams like yours.
            </p>
          </TextReveal>
        </div>

        <div className="grid grid-cols-12 gap-y-8 md:gap-x-8">
          {members.map((member, index) => (
            <RevealAnimation key={member.slug} delay={0.1 * ((index % 3) + 1)} offset={40}>
              <TeamCard
                image={member.image}
                name={member.name}
                title={member.title}
                href={`/team/${member.slug}`}
              />
            </RevealAnimation>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OurTeam;
