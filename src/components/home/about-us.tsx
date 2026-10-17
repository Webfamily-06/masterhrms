import aboutImgPrimary from '@/public/images/ns-img-6.jpg';
import aboutImgSecondary from '@/public/images/ns-img-7.jpg';
import CounterNumberOnScroll from '@/src/components/animation/counter-number-on-scroll';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { StarIcon } from '@/src/components/shared/icon';
import { BadgePrimary } from '@/src/components/shared/ui/badge';
import { ButtonWhite } from '@/src/components/shared/ui/button';
import Image from 'next/image';
import Link from 'next/link';

const AboutUs = () => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container">
        <div className="grid grid-cols-12 items-center justify-center gap-y-8 lg:gap-x-8 xl:gap-x-14">
          <RevealAnimation
            delay={0.1}
            direction="left"
            offset={100}
            className="col-span-12 lg:col-span-3"
          >
            <figure className="h-[520px] w-full overflow-hidden rounded-[20px]">
              <Image src={aboutImgPrimary} alt="about-us-img" className="size-full object-cover" />
            </figure>
          </RevealAnimation>

          <div className="col-span-12 lg:col-span-9">
            <div className="flex w-full flex-col gap-y-8 xl:gap-y-14">
              <RevealAnimation delay={0.2}>
                <div className="flex flex-col items-center justify-center gap-y-8 md:gap-x-8 lg:flex-row xl:gap-x-14">
                  <div className="w-full space-y-5 lg:w-1/2">
                    <BadgePrimary>About Us</BadgePrimary>
                    <TextReveal delay={0.3}>
                      <h2>The team behind smarter automation</h2>
                    </TextReveal>
                  </div>

                  <div className="w-full space-y-8 lg:w-1/2 lg:space-y-14">
                    <TextReveal delay={0.4}>
                      <p>
                        We created this platform to solve one simple problem — too much time is
                        wasted on repetitive work.
                      </p>
                    </TextReveal>

                    <Link href="/about">
                      <ButtonWhite
                        className="mx-auto w-[80%]! md:mx-0 md:w-fit!"
                        textClassName="text-center text-nowrap max-sm:flex-1 max-sm:pr-8!"
                      >
                        Learn more
                      </ButtonWhite>
                    </Link>
                  </div>
                </div>
              </RevealAnimation>

              <RevealAnimation delay={0.3}>
                <div className="flex flex-col items-end justify-end gap-y-5 md:flex-row md:gap-x-8 xl:gap-x-14">
                  <div className="w-full space-y-8 md:w-1/2">
                    <div className="flex items-center justify-start gap-x-8">
                      <div className="space-y-1">
                        <h3 className="text-heading-5">
                          <CounterNumberOnScroll value={90} />
                          <span>%</span>
                        </h3>
                        <p className="text-background-14/60">Client Satisfaction</p>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-heading-5">
                          <CounterNumberOnScroll value={10} />
                          <span>M+</span>
                        </h3>
                        <p className="text-background-14/60">automated workflows</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-heading-5 flex items-center gap-x-2">
                        <CounterNumberOnScroll
                          value={4.9}
                          format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                        />
                        <span className="size-5">
                          <StarIcon className="fill-primary-500 size-4" />
                        </span>
                      </h3>
                      <p className="text-background-14/60">user rating</p>
                    </div>
                  </div>

                  <figure className="h-[290px] w-full overflow-hidden rounded-[20px] md:w-1/2">
                    <Image
                      src={aboutImgSecondary}
                      alt="about-us-img"
                      className="size-full object-cover"
                    />
                  </figure>
                </div>
              </RevealAnimation>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
