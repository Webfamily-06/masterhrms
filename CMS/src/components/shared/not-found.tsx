import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { ButtonPrimary } from '@/src/components/shared/ui/button';
import Link from 'next/link';

const NotFound = () => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container">
        <RevealAnimation
          delay={0.1}
          className="relative w-full overflow-hidden rounded-2xl bg-[url('/images/opai-img-138.jpg')] bg-cover bg-center bg-no-repeat p-8"
        >
          <div className="flex flex-col items-center gap-14 rounded-xl bg-white/5 px-8 py-20 backdrop-blur-[60px] md:gap-16 md:px-20 md:py-28 lg:px-39 lg:py-39">
            <div className="flex flex-col items-center gap-4 text-center">
              <TextReveal delay={0.2}>
                <h2 className="text-secondary/90 text-[100px] leading-[1.2] md:text-[150px] lg:text-[175px] xl:text-[200px]">
                  404
                </h2>
              </TextReveal>

              <div className="flex flex-col items-center gap-3">
                <TextReveal delay={0.3}>
                  <h3>Oops! Page not found</h3>
                </TextReveal>
                <TextReveal delay={0.4}>
                  <p className="text-tagline-1 text-secondary/60 max-w-[420px] text-center">
                    The page does not exist or was moved. Use the button below to get back to the
                    homepage.
                  </p>
                </TextReveal>
              </div>
            </div>

            <RevealAnimation delay={0.5} className="inline-flex">
              <Link href="/">
                <ButtonPrimary
                  className="w-full md:w-auto"
                  textClassName="text-center text-nowrap max-sm:flex-1 max-sm:pr-8!"
                >
                  Go back home
                </ButtonPrimary>
              </Link>
            </RevealAnimation>
          </div>
        </RevealAnimation>
      </div>
    </section>
  );
};

export default NotFound;
