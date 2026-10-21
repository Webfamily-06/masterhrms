import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TeamCard } from '@/src/components/shared/ui/card';
import { TeamMember } from '@/src/interface/interface';
import getMarkDownData from '@/src/utils/getMarkDownData';
import { OurTeamHeader } from './our-team-header';

const members = getMarkDownData<TeamMember>('src/data/team', false, 'order');

const OurTeam = () => {
  return (
    <section className="overflow-hidden pt-[190px]">
      <div className="main-container space-y-10 md:space-y-14">
        <OurTeamHeader />

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
