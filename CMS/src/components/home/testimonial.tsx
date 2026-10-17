import slideImg8 from '@/public/images/ns-avatar-10.jpg';
import avatar3 from '@/public/images/ns-avatar-14.jpg';
import slideImg2 from '@/public/images/ns-avatar-4.jpg';
import slideImg3 from '@/public/images/ns-avatar-5.jpg';
import slideImg4 from '@/public/images/ns-avatar-6.jpg';
import slideImg5 from '@/public/images/ns-avatar-7.jpg';
import { default as avatar1, default as slideImg6 } from '@/public/images/ns-avatar-8.jpg';
import { default as avatar2, default as slideImg7 } from '@/public/images/ns-avatar-9.jpg';
import slideImg1 from '@/public/images/ns-img-2.jpg';
import CounterNumberOnScroll from '@/src/components/animation/counter-number-on-scroll';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import {
  SlideContent,
  SlideImg,
  SlideItem,
  SlideNavigation,
  SlideNext,
  SlidePrev,
  SplitSlide,
} from '@/src/components/animation/split-slide';
import { ArrowDotLeftIcon, ArrowDotRightIcon, StarIcon } from '@/src/components/shared/icon';
import AvatarItem from '@/src/components/shared/ui/avatar-reveal/avatar-item';
import AvatarReveal from '@/src/components/shared/ui/avatar-reveal/avatar-reveal';
import Image from 'next/image';

const Testimonial = () => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container">
        <div className="grid grid-cols-12 items-start justify-center gap-x-5 gap-y-5 lg:gap-y-0 xl:gap-x-14">
          <div className="col-span-12 lg:col-span-4">
            <div className="flex h-[300px] flex-col items-center justify-between lg:h-[355px]">
              <div className="flex flex-row items-center gap-x-4 gap-y-4 md:flex-col lg:flex-row lg:gap-y-0">
                <div className="flex items-center -space-x-4">
                  <AvatarReveal
                    className="flex items-center justify-center -space-x-3.5"
                    direction="left"
                    offset={50}
                    stagger={0.1}
                  >
                    {[avatar1, avatar2, avatar3].map((avatar, index) => (
                      <AvatarItem
                        key={avatar.src}
                        className="outline-background-2 size-11 overflow-hidden rounded-full outline-2"
                      >
                        <Image
                          src={avatar}
                          alt={`avatar-${index + 1}`}
                          className="size-full rounded-full object-cover"
                        />
                      </AvatarItem>
                    ))}
                    <AvatarItem className="font-inter-tight text-tagline-3 text-secondary flex size-11 items-center justify-center rounded-full bg-white font-normal">
                      +243
                    </AvatarItem>
                  </AvatarReveal>
                </div>

                <RevealAnimation delay={0.5} direction="right" offset={50}>
                  <div>
                    <span className="flex items-center justify-start gap-x-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon key={i} className="fill-primary-500 size-4" />
                      ))}
                    </span>
                    <p className="text-background-14/60 text-tagline-2">
                      Happy by <CounterNumberOnScroll value={20} />
                      k+ clients
                    </p>
                  </div>
                </RevealAnimation>
              </div>

              <div className="w-full space-y-4">
                <RevealAnimation
                  asChild={false}
                  delay={0.4}
                  className="w-full rounded-xl bg-white p-4 text-center"
                >
                  <p className="text-tagline-3">Top Customer Ratings</p>
                  <div className="text-secondary font-medium">
                    <CounterNumberOnScroll value={91} duration={1.2} />%
                  </div>
                </RevealAnimation>

                <div className="flex items-center gap-x-4">
                  <RevealAnimation
                    asChild={false}
                    delay={0.5}
                    className="w-1/2 rounded-xl bg-white p-4 text-center"
                  >
                    <p className="text-tagline-3">On-Time Deliveries</p>
                    <div className="text-secondary font-medium">
                      <CounterNumberOnScroll value={100} duration={1.2} />%
                    </div>
                  </RevealAnimation>

                  <RevealAnimation
                    asChild={false}
                    delay={0.6}
                    className="w-1/2 rounded-xl bg-white p-4 text-center"
                  >
                    <p className="text-tagline-3">Logistics Optimization</p>
                    <div className="text-secondary font-medium">
                      <CounterNumberOnScroll value={87} duration={1.2} />%
                    </div>
                  </RevealAnimation>
                </div>
              </div>
            </div>
          </div>

          <RevealAnimation delay={0.6}>
            <div className="col-span-12 lg:col-span-8">
              <SplitSlide>
                <SlideItem>
                  <SlideImg src={slideImg1} alt="testimonial one" />
                  <SlideContent>
                    <p className="text-secondary">
                      &ldquo;Before using this platform, our team was drowning in repetitive tasks
                      across tools and spreadsheets.
                      <span className="mt-5 inline-block">
                        After setup, most daily updates now run automatically and our team finally
                        has time for strategic work.&rdquo;
                      </span>
                    </p>
                  </SlideContent>
                </SlideItem>

                <SlideItem>
                  <SlideImg src={slideImg2} alt="testimonial two" />
                  <SlideContent>
                    <p className="text-secondary">
                      &ldquo;Our automation SaaS turned scattered handoffs into one clear pipeline
                      we can monitor end to end.
                      <span className="mt-5 inline-block">
                        Approvals, status updates, and owner changes now propagate automatically, so
                        delivery stays on track without chasing people in chat.&rdquo;
                      </span>
                    </p>
                  </SlideContent>
                </SlideItem>

                <SlideItem>
                  <SlideImg src={slideImg3} alt="testimonial three" />
                  <SlideContent>
                    <p className="text-secondary">
                      &ldquo;We plugged our CRM, billing, and support stack into the platform in a
                      single afternoon.
                      <span className="mt-5 inline-block">
                        Triggers and webhooks keep customer records and subscription events in sync,
                        so ops and finance always see the same live automation health.&rdquo;
                      </span>
                    </p>
                  </SlideContent>
                </SlideItem>

                <SlideItem>
                  <SlideImg src={slideImg4} alt="testimonial four" />
                  <SlideContent>
                    <p className="text-secondary">
                      &ldquo;No-code paths let CS and success teams ship playbooks without waiting
                      on engineering for every tweak.
                      <span className="mt-5 inline-block">
                        We still drop into advanced rules when we need them, but most SaaS lifecycle
                        automation now ship in hours, not sprints.&rdquo;
                      </span>
                    </p>
                  </SlideContent>
                </SlideItem>

                <SlideItem>
                  <SlideImg src={slideImg5} alt="testimonial five" />
                  <SlideContent>
                    <p className="text-secondary">
                      &ldquo;Trial-to-paid and renewal reminders used to live in spreadsheets and
                      side threads.
                      <span className="mt-5 inline-block">
                        The product now sequences emails, in-app nudges, and Slack alerts from one
                        automation graph, with full run history for every account.&rdquo;
                      </span>
                    </p>
                  </SlideContent>
                </SlideItem>

                <SlideItem>
                  <SlideImg src={slideImg6} alt="testimonial six" />
                  <SlideContent>
                    <p className="text-secondary">
                      &ldquo;Security reviews were a blocker because we could not prove who touched
                      which workflow or credential.
                      <span className="mt-5 inline-block">
                        Role-based access, audit logs, and environment separation gave our buyers
                        confidence that our SaaS automation are production-grade, not shadow
                        IT.&rdquo;
                      </span>
                    </p>
                  </SlideContent>
                </SlideItem>

                <SlideItem>
                  <SlideImg src={slideImg7} alt="testimonial seven" />
                  <SlideContent>
                    <p className="text-secondary">
                      &ldquo;Usage spikes used to mean overnight pager rotations whenever a batch
                      job failed silently.
                      <span className="mt-5 inline-block">
                        Retries, dead-letter queues, and dashboards in the automation layer mean our
                        SaaS backend keeps pace with growth without heroic manual
                        babysitting.&rdquo;
                      </span>
                    </p>
                  </SlideContent>
                </SlideItem>

                <SlideItem>
                  <SlideImg src={slideImg8} alt="testimonial eight" />
                  <SlideContent>
                    <p className="text-secondary">
                      &ldquo;Executive reviews finally show one automation-backed view of MRR, churn
                      risk, and delivery commitments.
                      <span className="mt-5 inline-block">
                        Instead of reconciling five tools the night before a board meeting, we
                        export governed dashboards fed by the same SaaS workflows our teams run
                        every day.&rdquo;
                      </span>
                    </p>
                  </SlideContent>
                </SlideItem>

                {/* upper md  */}
                <SlideNavigation className="absolute right-5 bottom-10 z-20 mx-auto mt-6 hidden w-full max-w-[180px] max-[376px]:max-w-[140px] md:flex md:max-w-[220px] lg:max-w-[300px] xl:max-w-[446px]">
                  <SlidePrev>
                    <button type="button" aria-label="Previous testimonial">
                      <ArrowDotLeftIcon className="fill-secondary group-hover:fill-accent size-6 transition-colors duration-500" />
                    </button>
                  </SlidePrev>
                  <SlideNext>
                    <button type="button" aria-label="Next testimonial">
                      <ArrowDotRightIcon className="fill-secondary group-hover:fill-accent size-6 transition-colors duration-500" />
                    </button>
                  </SlideNext>
                </SlideNavigation>

                {/* lower md and below */}
                <SlideNavigation className="mx-auto mt-6 flex w-[220px] md:hidden">
                  <SlidePrev>
                    <button type="button" aria-label="Previous testimonial">
                      <ArrowDotLeftIcon className="fill-secondary group-hover:fill-accent size-6 transition-colors duration-500" />
                    </button>
                  </SlidePrev>
                  <SlideNext>
                    <button type="button" aria-label="Next testimonial">
                      <ArrowDotRightIcon className="fill-secondary group-hover:fill-accent size-6 transition-colors duration-500" />
                    </button>
                  </SlideNext>
                </SlideNavigation>
              </SplitSlide>
            </div>
          </RevealAnimation>
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
