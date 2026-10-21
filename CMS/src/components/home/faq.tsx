import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import {
  Accordion,
  AccordionAction,
  AccordionContent,
  AccordionIcon,
  AccordionItem,
  AccordionTitle,
} from '@/src/components/shared/ui/accordion';
import { BadgePrimary } from '@/src/components/shared/ui/badge';
import { ButtonWhite } from '@/src/components/shared/ui/button';
import Link from 'next/link';

const faqItems = [
  {
    value: 'what-does-nexsas-automate',
    question: 'What does Nexsas automate?',
    answer:
      'Nexsas connects your tools and automates repetitive tasks like routing requests, updating records, sending notifications, and syncing data across your stack.',
  },
  {
    value: 'which-apps-can-i-connect',
    question: 'Which apps can I connect?',
    answer:
      'Connect CRMs, project tools, email, forms, spreadsheets, and databases. Mix multiple integrations in one workflow to keep data synced across teams.',
  },
  {
    value: 'multi-step-workflows',
    question: 'Can I build multi-step workflows?',
    answer:
      'Yes. Create triggers, conditions, approvals, delays, and branching logic. You can also retry failed steps and route exceptions to the right person automatically.',
  },
  {
    value: 'is-my-data-secure',
    question: 'Is my data secure?',
    answer:
      'We use encryption in transit and at rest, strict access controls, and audit-friendly logs. You decide which connections and actions each workflow is allowed to run.',
  },
  {
    value: 'coding-skills-required',
    question: 'Do I need coding skills to use Nexsas?',
    answer:
      'No. Start with templates and a visual builder. If you want advanced customization, you can add rules, webhooks, and custom fields without changing your existing tools.',
  },
  {
    value: 'monitor-runs-and-troubleshoot',
    question: 'How do I monitor runs and troubleshoot failures?',
    answer:
      'Every automation stores run history with timestamps, outcomes, and step-level detail. You can filter errors, set notifications when something breaks, pause a workflow safely, and replay or fix failed steps without losing context.',
  },
];

const FAQ = () => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container">
        <div className="flex flex-col items-start justify-center gap-y-6 overflow-hidden lg:flex-row lg:gap-x-18 lg:gap-y-0">
          <RevealAnimation delay={0.1} direction="left" offset={100} className="w-full lg:w-1/2">
            <div className="space-y-14 text-center lg:text-left">
              <div className="space-y-5">
                <RevealAnimation delay={0.1}>
                  <BadgePrimary>Frequently Asked Questions</BadgePrimary>
                </RevealAnimation>

                <div className="space-y-3">
                  <TextReveal delay={0.2}>
                    <h2>Frequently asked questions</h2>
                  </TextReveal>
                  <TextReveal delay={0.3}>
                    <p className="text-background-14/60 mx-auto max-w-[450px] lg:mx-0">
                      We&apos;ve gathered the most commonly asked questions to help you understand
                      our services, workflow, pricing, and support.
                    </p>
                  </TextReveal>
                </div>
              </div>

              <Link href="/contact" className="flex justify-center lg:justify-start">
                <ButtonWhite
                  className="mx-auto w-[80%]! md:mx-0 md:w-fit!"
                  textClassName="text-center max-sm:flex-1 max-sm:px-0! max-sm:pr-8!"
                >
                  Contact Us
                </ButtonWhite>
              </Link>
            </div>
          </RevealAnimation>

          <RevealAnimation delay={0.2} direction="right" offset={100} className="w-full lg:w-1/2">
            <Accordion defaultOpen={faqItems[0].value} className="space-y-4" aria-label="FAQ">
              {faqItems.map((item) => (
                <AccordionItem
                  key={item.value}
                  value={item.value}
                  className="group rounded-[20px] bg-white px-4 md:px-6"
                >
                  <AccordionAction
                    showIcon={false}
                    className="flex w-full cursor-pointer items-center justify-between gap-x-4 pt-6 transition-all duration-400 ease-in-out group-data-[state=closed]:pb-6 group-data-[state=open]:pb-4 md:pt-8 md:group-data-[state=closed]:pb-8"
                  >
                    <AccordionTitle>{item.question}</AccordionTitle>
                    <AccordionIcon className="shrink-0" />
                  </AccordionAction>
                  <AccordionContent contentClassName="text-tagline-3 sm:text-tagline-2 font-inter-tight cursor-text pb-8 text-left">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </RevealAnimation>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
