import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';

const benefits = [
  'Save hours by replacing repetitive operational work',
  'Launch reliable automation with clear ownership and control',
  'Standardize workflows across teams and connected systems',
  'Monitor health, detect failures early, and improve continuously',
  'Scale execution without proportionally growing manual effort',
];

const listItemClass =
  "relative pl-4 text-tagline-2 text-secondary/90 before:absolute before:top-1/2 before:left-0 before:size-1.5 before:translate-y-[-38%] before:rounded-full before:bg-secondary/90 before:content-['']";

const WhyUse = () => {
  return (
    <section
      className="bg-[url('/images/opai-img-137.jpg')] bg-cover bg-center bg-no-repeat object-contain object-bottom pt-20 pb-20 md:pt-25 md:pb-25 lg:pt-39 lg:pb-39"
      aria-labelledby="why-use-heading"
    >
      <div className="main-container space-y-8 md:space-y-14">
        <TextReveal delay={0.2}>
          <h2 id="why-use-heading">Why use Nexsas for automation?</h2>
        </TextReveal>

        <div className="grid grid-cols-12">
          <RevealAnimation asChild={false} delay={0.1} className="col-span-12 min-h-[374px] w-full rounded-xl bg-white/3 p-2 backdrop-blur-[30px]">
            <div className="bg-accent h-full space-y-6 rounded-lg p-7 md:p-10.5">
              <TextReveal delay={0.3}>
                <h3 className="text-heading-4 text-secondary/90">Tools and outcomes</h3>
              </TextReveal>

              <RevealAnimation asChild={false} delay={0.4}>
                <ul className="space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className={listItemClass}>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </RevealAnimation>
            </div>
          </RevealAnimation>
        </div>
      </div>
    </section>
  );
};

export default WhyUse;
