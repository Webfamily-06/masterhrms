import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import LoginForm from '@/src/components/auth/login-form';

const Login = () => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container">
        <div className="flex flex-col items-center gap-10 md:gap-16">
          <div className="space-y-2 text-center md:space-y-3">
            <TextReveal delay={0.1}>
              <h2 className="text-heading-2 text-secondary">Login to your account</h2>
            </TextReveal>
            <TextReveal delay={0.2}>
              <p className="text-tagline-1 text-secondary/60 mx-auto max-w-[420px]">
                Let&apos;s explore how Nexsas can support your goals with AI-driven solutions.
              </p>
            </TextReveal>
          </div>

          <RevealAnimation
            delay={0.3}
            asChild={false}
            className="bg-background-8 w-full max-w-[413px] rounded-xl p-2"
          >
            <LoginForm />
          </RevealAnimation>
        </div>
      </div>
    </section>
  );
};

export default Login;
