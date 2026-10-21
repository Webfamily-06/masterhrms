import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { ServiceCard } from '@/src/components/shared/ui/card/service-card';
import { ServiceData } from '@/src/interface/interface';
import getMarkDownData from '@/src/utils/getMarkDownData';

const services = getMarkDownData<ServiceData>('src/data/services', false, 'iconClass');

const ServicesList = () => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container space-y-10 md:space-y-14">
        <div className="space-y-3 text-center">
          <div className="space-y-2 text-center md:space-y-3">
            <TextReveal delay={0.1}>
              <h2>What you can automate</h2>
            </TextReveal>

            <TextReveal delay={0.2}>
              <p className="text-tagline-1 text-secondary/60 mx-auto max-w-[560px]">
                From workflow orchestration to decision support, our automation services help teams
                move faster with fewer errors.
              </p>
            </TextReveal>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-y-5 *:col-span-12 md:gap-4 *:md:col-span-6 *:lg:col-span-4 [&>*:nth-child(4)]:lg:col-span-6 [&>*:nth-child(5)]:lg:col-span-6">
          {services.map((service, index) => (
            <RevealAnimation key={service.slug} delay={0.1 * (index + 1)}>
              <ServiceCard
                iconClass={service.iconClass}
                title={service.title}
                description={service.description}
                href={`/services/${service.slug}`}
              />
            </RevealAnimation>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesList;
