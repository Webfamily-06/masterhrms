import { LogoOrbit, OrbitHub, OrbitItem, OrbitRing } from '@/src/components/animation/logo-orbit';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { BadgePrimary } from '@/src/components/shared/ui/badge';
import { ButtonWhite } from '@/src/components/shared/ui/button';
import { integrationOrbitLogos } from '@/src/data/integration-orbit-logos';
import Link from 'next/link';

const Integration = () => {
  return (
    <section className="relative pt-20 md:pt-25 lg:pt-39">
      <div className="main-container relative overflow-hidden pb-35">
        <div className="relative z-30 space-y-8 lg:space-y-14">
          <div className="space-y-5 text-center">
            <RevealAnimation delay={0.1}>
              <BadgePrimary>Integration</BadgePrimary>
            </RevealAnimation>

            <div className="space-y-3">
              <TextReveal delay={0.2}>
                <h2 className="mx-auto max-w-[600px]">Your entire tech stack — fully connected</h2>
              </TextReveal>
              <TextReveal delay={0.3}>
                <p className="text-background-14/60 mx-auto max-w-[592px]">
                  Integrate your favorite apps and build workflows that move data, trigger actions,
                  and keep everything in sync — automatically.
                </p>
              </TextReveal>
            </div>
          </div>

          <RevealAnimation delay={0.4} className="flex items-center justify-center">
            <Link href="/pricing">
              <ButtonWhite>Start free</ButtonWhite>
            </Link>
          </RevealAnimation>
        </div>

        <RevealAnimation
          asChild={false}
          delay={0.5}
          className="absolute top-[-18%] left-1/2 -translate-x-1/2 md:top-[-72%] lg:top-[-115%] xl:top-[-137%]"
        >
          <LogoOrbit speed={0.3}>
            <OrbitRing>
              <OrbitHub>
                {integrationOrbitLogos.map((logo, index) => (
                  <OrbitItem key={`${logo.alt}-${index}`} src={logo.src} alt={logo.alt} />
                ))}
              </OrbitHub>
            </OrbitRing>
          </LogoOrbit>
        </RevealAnimation>

        <div className="pointer-events-none absolute top-0 left-0 z-20 h-[100px] w-full bg-[linear-gradient(to_bottom,#f2f5fa,transparent)]" />
      </div>
    </section>
  );
};

export default Integration;
