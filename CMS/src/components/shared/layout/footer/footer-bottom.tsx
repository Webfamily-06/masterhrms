import RevealAnimation from '@/src/components/animation/reveal-animation';

export const FooterBottom = () => {
  return (
    <RevealAnimation delay={0.7} offset={10} start="top 105%">
      <div className="relative pt-[26px] pb-[42px] text-center">
        <div className="bg-stroke-3 absolute top-0 right-0 left-0 mx-auto h-px origin-center" />
        <p className="text-tagline-1 text-secondary font-normal">
          Copyright &copy; <span>{new Date().getFullYear()}</span> Pixels71. Nexsas – smart
          application for modern business
        </p>
      </div>
    </RevealAnimation>
  );
};
