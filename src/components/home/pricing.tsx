'use client';

import clutchImg from '@/public/images/ns-img-25.png';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { ArrowRightIcon, CheckIcon, GradientCircleIcon } from '@/src/components/shared/icon';
import { BadgePrimary } from '@/src/components/shared/ui/badge';
import { ButtonPrimary } from '@/src/components/shared/ui/button';
import { cn } from '@/src/utils/cn';
import { useGSAP } from '@gsap/react';
import NumberFlow from '@number-flow/react';
import gsap from 'gsap';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';

gsap.registerPlugin(useGSAP);

type PlanId = 'starter' | 'pro' | 'business';

interface PlanData {
  monthly: number;
  yearly: number;
  activeCount: number;
  description: string;
}

interface Plan {
  id: PlanId;
  name: string;
  subtitle: string;
}

const pricingPlans: Plan[] = [
  { id: 'starter', name: 'Starter', subtitle: 'For early-stage teams' },
  { id: 'pro', name: 'Pro', subtitle: 'For growing teams' },
  { id: 'business', name: 'Business', subtitle: 'For established businesses' },
];

const pricingPlanData: Record<PlanId, PlanData> = {
  starter: {
    monthly: 2500,
    yearly: 25000,
    activeCount: 5,
    description:
      'Big sound in a small package. The S1 is a sleek, portable Bluetooth speaker with rich audio and all-day battery life',
  },
  pro: {
    monthly: 4190,
    yearly: 41900,
    activeCount: 7,
    description:
      'Built for growing teams with advanced automation, priority workflows, and deeper analytics to keep everything moving.',
  },
  business: {
    monthly: 8290,
    yearly: 82900,
    activeCount: 9,
    description:
      'Enterprise-grade controls with custom workflows, team-wide governance, and dedicated support for large-scale operations.',
  },
};

const includedItems: string[] = [
  'Delaware franchise tax',
  'State income tax',
  'Foreign founders',
  'Foreign subsidiary',
  'R&D tax credits',
  'Sales tax nexus',
  'Employment tax nexus',
  'Property tax nexus',
  'Income tax nexus',
];

const Pricing = () => {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('starter');
  const [isYearly, setIsYearly] = useState(false);
  const pricingCardRef = useRef<HTMLDivElement>(null);
  const badgeWrapperRef = useRef<HTMLSpanElement>(null);
  const prevPlanRef = useRef<PlanId>('starter');
  const badgeRefs = useRef<Partial<Record<PlanId, HTMLSpanElement>>>({});
  const descriptionsRefs = useRef<Partial<Record<PlanId, HTMLParagraphElement>>>({});
  const currentPlan = pricingPlanData[selectedPlan];
  const price = isYearly ? currentPlan.yearly : currentPlan.monthly;

  useGSAP(
    () => {
      const wrapper = badgeWrapperRef.current;
      const defaultBadge = badgeRefs.current[pricingPlans[0].id];
      if (!wrapper) return;

      pricingPlans.forEach((plan, index) => {
        const badge = badgeRefs.current[plan.id];
        if (!badge) return;
        gsap.set(badge, { opacity: index === 0 ? 1 : 0, y: 0 });
      });

      if (defaultBadge) {
        wrapper.style.width = `${defaultBadge.offsetWidth}px`;
        wrapper.style.height = `${defaultBadge.offsetHeight}px`;
      }
    },
    { scope: pricingCardRef }
  );

  useGSAP(
    () => {
      const prev = prevPlanRef.current;
      const next = selectedPlan;
      if (prev === next) return;

      const fromBadge = badgeRefs.current[prev];
      const toBadge = badgeRefs.current[next];
      const fromDescription = descriptionsRefs.current[prev];
      const toDescription = descriptionsRefs.current[next];

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (fromBadge && toBadge) {
        const wrapper = badgeWrapperRef.current;
        const fromWidth = wrapper?.offsetWidth ?? fromBadge.offsetWidth;
        const toWidth = toBadge.offsetWidth;

        tl.set(toBadge, { y: 12, opacity: 0 }, 0);
        tl.to(fromBadge, { y: -12, opacity: 0, duration: 0.22 }, 0);
        tl.to(toBadge, { y: 0, opacity: 1, duration: 0.28 }, 0.12);
        tl.set(fromBadge, { y: 0 }, 0.3);

        if (wrapper) {
          tl.to(
            wrapper,
            { width: toWidth, duration: 0.28, ease: 'power3.out' },
            toWidth > fromWidth ? 0 : 0.12
          );
        }
      }

      if (fromDescription && toDescription) {
        tl.set(toDescription, { y: 12, opacity: 0 }, 0);
        tl.to(fromDescription, { y: -12, opacity: 0, duration: 0.22 }, 0);
        tl.to(toDescription, { y: 0, opacity: 1, duration: 0.28 }, 0.12);
        tl.set(fromDescription, { y: 0 }, 0.3);
      }

      prevPlanRef.current = next;
    },
    { scope: pricingCardRef, dependencies: [selectedPlan] }
  );

  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container overflow-hidden">
        <div className="space-y-10 lg:space-y-18">
          <div className="space-y-8">
            <div className="space-y-5 text-center">
              <RevealAnimation delay={0.1}>
                <BadgePrimary>Pricing</BadgePrimary>
              </RevealAnimation>

              <div className="space-y-3">
                <TextReveal delay={0.2}>
                  <h2>Simple pricing that scales with you</h2>
                </TextReveal>
                <TextReveal delay={0.3}>
                  <p className="text-background-14/60 mx-auto max-w-[600px]">
                    Upgrade anytime as your needs evolve, and stay focused on what matters most
                    building and expanding your product with confidence.
                  </p>
                </TextReveal>
              </div>
            </div>

            <RevealAnimation delay={0.4}>
              <div className="flex items-center justify-center">
                <label className="inline-flex cursor-pointer items-center">
                  <span className="text-tagline-2 text-secondary me-2.5 font-normal select-none">
                    Monthly
                  </span>
                  <input
                    type="checkbox"
                    checked={isYearly}
                    onChange={(e) => setIsYearly(e.target.checked)}
                    className="peer sr-only"
                    aria-label="Toggle yearly billing"
                  />
                  <div className="bg-secondary peer peer-checked:after:border-buffer after:shadow-16 relative h-6 w-11.5 rounded-full peer-focus:outline-0 after:absolute after:inset-s-[2px] after:top-1/2 after:size-5 after:-translate-y-1/2 after:rounded-full after:bg-(image:--color-gradient-14) after:transition-all after:content-[''] peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
                  <span className="text-tagline-2 text-secondary ms-2.5 font-normal select-none">
                    Yearly
                  </span>
                </label>
              </div>
            </RevealAnimation>
          </div>

          <div className="mx-auto grid max-w-[980px] grid-cols-12 items-start justify-center gap-y-6 md:gap-x-8 lg:gap-x-14">
            <RevealAnimation
              asChild={false}
              delay={0.5}
              direction="left"
              offset={50}
              className="col-span-12 space-y-8 md:col-span-5 md:space-y-14"
            >
              <div className="space-y-5">
                <div className="bg-background-4 space-y-2 rounded-[20px] p-2">
                  {pricingPlans.map((plan) => {
                    const isActive = selectedPlan === plan.id;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan.id)}
                        data-active={isActive ? 'true' : 'false'}
                        className="group flex w-full cursor-pointer items-center justify-between gap-x-6 rounded-xl px-5 py-3 transition-colors hover:bg-white data-[active=true]:bg-white"
                      >
                        <div className="space-y-1">
                          <h3 className="text-tagline-1 text-left">{plan.name}</h3>
                          <p className="text-tagline-3 text-background-14/60">{plan.subtitle}</p>
                        </div>

                        <span
                          className={cn(
                            'bg-secondary flex size-8 items-center justify-center rounded-full transition-all duration-500 ease-in-out',
                            isActive ? 'scale-100' : 'scale-0'
                          )}
                        >
                          <ArrowRightIcon className="size-4 stroke-white" />
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-x-6">
                  <span className="flex items-center gap-x-1">
                    <GradientCircleIcon />
                    <span className="text-tagline-2 text-secondary font-inter-tight font-normal italic">
                      Free trial
                    </span>
                  </span>
                  <span className="flex items-center gap-x-1">
                    <GradientCircleIcon />
                    <span className="text-tagline-2 text-secondary font-inter-tight font-normal italic">
                      Cancel anytime
                    </span>
                  </span>
                </div>
              </div>

              <figure className="mx-auto flex h-11 w-full max-w-[168px] items-center justify-center">
                <Image src={clutchImg} alt="clutch-img" />
              </figure>
            </RevealAnimation>

            <RevealAnimation
              asChild={false}
              delay={0.6}
              direction="right"
              offset={50}
              className="col-span-12 md:col-span-7"
            >
              <div ref={pricingCardRef} className="space-y-14 rounded-xl bg-white px-6 py-8">
                <div className="space-y-8">
                  <span ref={badgeWrapperRef} className="relative block h-8 w-full overflow-hidden">
                    {pricingPlans.map((plan) => (
                      <span
                        key={plan.id}
                        ref={(el) => {
                          badgeRefs.current[plan.id] = el ?? undefined;
                        }}
                        className={cn(
                          'border-stroke-3 text-tagline-2 text-secondary font-inter-tight rounded-full border px-3 py-1 font-normal whitespace-nowrap',
                          'absolute top-0 left-0 h-8 w-fit'
                        )}
                      >
                        {plan.name}
                      </span>
                    ))}
                  </span>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-heading-6">Subscription</h3>
                      <h3 className="text-heading-4 font-medium">
                        $
                        <NumberFlow
                          value={price}
                          format={{
                            useGrouping: true,
                            minimumIntegerDigits: 2,
                            maximumFractionDigits: 0,
                            minimumFractionDigits: 0,
                          }}
                          transformTiming={{ duration: 700, easing: 'ease-out' }}
                          spinTiming={{ duration: 700, easing: 'ease-out' }}
                          opacityTiming={{ duration: 315, easing: 'ease-out' }}
                        />
                        <span className="text-tagline-2 text-secondary/60 font-inter-tight font-normal">
                          {isYearly ? '/year' : '/month'}
                        </span>
                      </h3>
                    </div>
                    <span className="relative grid overflow-hidden">
                      {pricingPlans.map((plan) => (
                        <p
                          key={plan.id}
                          ref={(el) => {
                            descriptionsRefs.current[plan.id] = el ?? undefined;
                          }}
                          className={cn(
                            'col-start-1 row-start-1',
                            plan.id !== 'starter' && 'opacity-0'
                          )}
                        >
                          {pricingPlanData[plan.id]?.description}
                        </p>
                      ))}
                    </span>
                  </div>

                  <Link href="/contact">
                    <ButtonPrimary
                      className="w-full"
                      textClassName="text-center flex-1 px-0! pr-8!"
                    >
                      Get started
                    </ButtonPrimary>
                  </Link>
                </div>

                <div className="space-y-4">
                  <h4 className="text-heading-6">What&apos;s included:</h4>
                  <ul className="space-y-5">
                    {includedItems.map((item, index) => {
                      const isActive = index < currentPlan.activeCount;

                      return (
                        <li
                          key={item}
                          data-active={isActive ? 'true' : 'false'}
                          className="group flex items-center gap-x-2"
                        >
                          <span className="border-stroke-3 flex size-6 shrink-0 items-center justify-center rounded-full border p-1 transition-colors duration-500 ease-in-out">
                            <CheckIcon
                              className={cn(
                                'size-4 transition-colors duration-500 ease-in-out',
                                isActive ? 'stroke-secondary' : 'stroke-secondary/40'
                              )}
                            />
                          </span>
                          <span
                            className={cn(
                              'text-tagline-1 font-inter-tight font-normal transition-colors duration-500 ease-in-out',
                              isActive ? 'text-secondary' : 'text-secondary/40'
                            )}
                          >
                            {item}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </RevealAnimation>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
