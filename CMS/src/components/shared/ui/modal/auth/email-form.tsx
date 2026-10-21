'use client';

import emailAuth from '@/public/images/icons/email-auth.svg';
import { ButtonIcon } from '@/src/components/shared/ui/button/button-icon';
import Image from 'next/image';
import type { Ref } from 'react';

export function EmailForm({ ref }: Readonly<{ ref?: Ref<HTMLFormElement> }>) {
  return (
    <form ref={ref} className="space-y-4" onSubmit={(event) => event.preventDefault()}>
      <div className="relative">
        <Image
          src={emailAuth}
          alt=""
          width={20}
          height={20}
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
        />
        <input
          type="email"
          required
          placeholder="name@example.com"
          className="text-tagline-3 h-11 w-full rounded-full border border-secondary/10 bg-white pr-12 pl-10 text-secondary outline-secondary placeholder:text-secondary/60 focus-visible:outline-1"
        />
        <button
          type="submit"
          className="group absolute top-1/2 right-1 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-secondary/20 bg-secondary transition-transform duration-300"
        >
          <ButtonIcon
            wrapperClassName="flex size-full items-center justify-center overflow-hidden rounded-full bg-transparent"
            iconClassName="size-5 fill-white"
          />
        </button>
      </div>
    </form>
  );
}
