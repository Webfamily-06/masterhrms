'use client';

import { ButtonPrimary } from '@/src/components/shared/ui/button';

const ContactForm = () => {
  return (
    <form
      className="w-full space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <fieldset className="mb-6 space-y-2">
        <label htmlFor="name" className="text-tagline-2 text-secondary/90 inline-block font-normal">
          Your name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="Enter your name"
          className="text-secondary/90 placeholder:text-secondary/60 w-full rounded-md border border-secondary/20 px-4.5 py-3 focus-within:border-secondary/60 focus-within:outline-none"
          required
        />
      </fieldset>

      <fieldset className="mb-6 space-y-2">
        <label htmlFor="email" className="text-tagline-2 text-secondary/90 inline-block font-normal">
          Your email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Enter your email"
          className="text-secondary/90 placeholder:text-secondary/60 w-full rounded-md border border-secondary/20 px-4.5 py-3 focus-within:border-secondary/60 focus-within:outline-none"
          required
        />
      </fieldset>

      <fieldset className="mb-4 space-y-2">
        <label
          htmlFor="message"
          className="text-tagline-2 text-secondary/90 inline-block font-normal"
        >
          Your message
        </label>
        <textarea
          id="message"
          name="message"
          placeholder="Enter your message"
          className="text-secondary/90 placeholder:text-secondary/60 h-45.5 w-full rounded-md border border-secondary/20 px-4.5 py-3 focus-within:border-secondary/60 focus-within:outline-none"
        />
      </fieldset>

      <fieldset className="mb-8 flex items-center justify-between gap-x-5">
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" name="terms" required className="peer sr-only" />
          <span className="relative size-5 cursor-pointer rounded-[2px] border border-secondary/40 after:absolute after:top-1/2 after:left-1/2 after:size-3 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-[2px] after:bg-secondary/70 after:opacity-0 after:content-[''] peer-checked:border-secondary peer-checked:after:opacity-100" />
          <span className="text-tagline-3 text-secondary/60 peer-checked:text-secondary/90 select-none font-medium">
            I agree with the terms and privacy policy
          </span>
        </label>
      </fieldset>

      <div className="inline-block pt-4 md:pt-6">
        <ButtonPrimary
          type="submit"
          className="w-full md:w-auto"
          textClassName="text-center text-nowrap max-sm:flex-1 max-sm:pr-8!"
        >
          Send message
        </ButtonPrimary>
      </div>
    </form>
  );
};

export default ContactForm;
