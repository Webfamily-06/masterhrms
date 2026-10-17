import asanaLogo from '@/public/images/icons/asana-with-black-text.svg';
import discordLogo from '@/public/images/icons/discord-with-black-text.svg';
import dropboxLogo from '@/public/images/icons/dropbox-with-black-text.svg';
import hotjarLogo from '@/public/images/icons/hotjar-with-black-text.svg';
import latticeLogo from '@/public/images/icons/lattice-with-black-text.svg';
import notionLogo from '@/public/images/icons/notion-with-black-text.svg';
import outreachLogo from '@/public/images/icons/outreach-with-black-text.svg';
import scapicLogo from '@/public/images/icons/scapic-with-black-text.svg';
import spotifyLogo from '@/public/images/icons/spotify-with-black-text.svg';
import squarespaceLogo from '@/public/images/icons/squarespace-with-black-text.svg';
import stripeLogo from '@/public/images/icons/stripe-with-black-text.svg';
import { LogoItem, LogosCarousel } from '@/src/components/animation/logos-carousel';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import Image from 'next/image';

const AboutClients = () => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <RevealAnimation
        asChild={false}
        delay={0.1}
        offset={40}
        className="main-container space-y-6 lg:space-y-8"
      >
        <LogosCarousel
          count={6}
          stagger={0.1}
          duration={550}
          interval={2800}
          initialDelay={600}
          groupClassName="flex flex-wrap items-center justify-center gap-x-2 gap-y-6 lg:gap-x-14 lg:gap-y-8"
        >
          <LogoItem>
            <Image src={scapicLogo} alt="clients" className="w-fit" />
          </LogoItem>
          <LogoItem>
            <Image src={notionLogo} alt="clients" className="w-fit" />
          </LogoItem>
          <LogoItem>
            <Image src={latticeLogo} alt="clients" className="w-fit" />
          </LogoItem>
          <LogoItem>
            <Image src={hotjarLogo} alt="clients" className="w-fit" />
          </LogoItem>
          <LogoItem>
            <Image src={discordLogo} alt="clients" className="w-fit" />
          </LogoItem>
          <LogoItem>
            <Image src={dropboxLogo} alt="clients" className="w-fit" />
          </LogoItem>
          <LogoItem>
            <Image src={stripeLogo} alt="clients" className="w-fit" />
          </LogoItem>
          <LogoItem>
            <Image src={spotifyLogo} alt="clients" className="w-fit" />
          </LogoItem>
          <LogoItem>
            <Image src={outreachLogo} alt="clients" className="w-fit" />
          </LogoItem>
          <LogoItem>
            <Image src={asanaLogo} alt="clients" className="w-fit" />
          </LogoItem>
          <LogoItem>
            <Image src={squarespaceLogo} alt="clients" className="w-fit" />
          </LogoItem>
        </LogosCarousel>
      </RevealAnimation>
    </section>
  );
};

export default AboutClients;
