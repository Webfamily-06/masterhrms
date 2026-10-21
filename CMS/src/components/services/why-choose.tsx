import avatarImgOne from '@/public/images/ns-avatar-11.jpg';
import avatarImgTwo from '@/public/images/ns-avatar-12.jpg';
import avatarImgThree from '@/public/images/ns-avatar-13.jpg';
import featureImg from '@/public/images/opai-img-5.jpg';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { ButtonWhite } from '@/src/components/shared/ui/button';
import Image from 'next/image';
import Link from 'next/link';

const WhyChoose = () => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container space-y-10 md:space-y-14">
        <TextReveal delay={0.1}>
          <h2 className="text-center">Why Nexsas?</h2>
        </TextReveal>

        <RevealAnimation
          asChild={false}
          delay={0.2}
          className="relative grid w-full grid-cols-1 gap-8 overflow-hidden rounded-2xl bg-[url('/images/opai-img-138.jpg')] bg-cover bg-center bg-no-repeat p-4 md:grid-cols-2 md:p-8 lg:grid-cols-4"
        >
          <RevealAnimation delay={0.2} className="overflow-hidden rounded-xl">
            <figure>
              <Image
                src={avatarImgOne}
                alt="Why choose Nexsas"
                className="size-full object-cover"
              />
            </figure>
          </RevealAnimation>

          <RevealAnimation delay={0.3} className="overflow-hidden rounded-xl">
            <figure>
              <Image
                src={avatarImgTwo}
                alt="Why choose Nexsas"
                className="size-full object-cover"
              />
            </figure>
          </RevealAnimation>

          <RevealAnimation
            asChild={false}
            delay={0.4}
            className="flex flex-col justify-end rounded-xl bg-white p-5"
          >
            <TextReveal delay={0.2}>
              <h3 className="text-heading-5 text-secondary/90">
                Ship reliable automation across teams and tools
              </h3>
            </TextReveal>
          </RevealAnimation>

          <RevealAnimation
            asChild={false}
            delay={0.5}
            className="flex flex-col justify-end rounded-xl bg-white p-5"
          >
            <TextReveal delay={0.3}>
              <h3 className="text-heading-5 text-secondary/90">
                Standardize workflows without slowing teams down
              </h3>
            </TextReveal>
          </RevealAnimation>

          <RevealAnimation
            asChild={false}
            delay={0.2}
            className="flex flex-col justify-end rounded-xl bg-white p-5"
          >
            <TextReveal delay={0.4}>
              <h3 className="text-heading-5 text-secondary/90">
                Reduce manual ops work and repetitive handoffs
              </h3>
            </TextReveal>
          </RevealAnimation>

          <RevealAnimation
            asChild={false}
            delay={0.3}
            className="flex flex-col justify-end rounded-xl bg-white p-5"
          >
            <TextReveal delay={0.5}>
              <h3 className="text-heading-5 text-secondary/90">
                Improve visibility with logs, alerts, and run analytics
              </h3>
            </TextReveal>
          </RevealAnimation>

          <RevealAnimation delay={0.4} className="overflow-hidden rounded-xl">
            <figure>
              <Image src={featureImg} alt="Why choose Nexsas" className="size-full object-cover" />
            </figure>
          </RevealAnimation>

          <RevealAnimation delay={0.5} className="overflow-hidden rounded-xl">
            <figure>
              <Image
                src={avatarImgThree}
                alt="Why choose Nexsas"
                className="size-full object-cover"
              />
            </figure>
          </RevealAnimation>
        </RevealAnimation>

        <RevealAnimation delay={0.1} asChild={false} className="flex justify-center">
          <Link href="/contact">
            <ButtonWhite
              className="mx-auto w-[80%]! md:w-fit!"
              textClassName="text-center text-nowrap max-sm:flex-1 max-sm:pr-8!"
            >
              Talk to our automation experts
            </ButtonWhite>
          </Link>
        </RevealAnimation>
      </div>
    </section>
  );
};

export default WhyChoose;
