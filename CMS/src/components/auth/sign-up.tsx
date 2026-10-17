import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import SignUpForm from '@/src/components/auth/sign-up-form';

const SignUp = () => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container">
        <div className="flex flex-col items-center gap-10 md:gap-16">
          <div className="space-y-2 text-center md:space-y-3">
            <TextReveal delay={0.1}>
              <h2 className="text-heading-2 text-secondary">Let&apos;s get started</h2>
            </TextReveal>
            <TextReveal delay={0.2}>
              <p className="text-tagline-1 text-secondary/60 mx-auto max-w-[420px]">
                Let&apos;s explore how Nexsas can support your goals with AI-driven solutions.
              </p>
            </TextReveal>
          </div>

          <RevealAnimation
            asChild={false}
            delay={0.3}
            className="bg-background-8 w-full max-w-[413px] rounded-xl p-2"
          >
            <SignUpForm />
          </RevealAnimation>
        </div>
      </div>
    </section>
  );
};

export default SignUp;
