'use client';

import AuthOrDivider from '@/src/components/auth/auth-or-divider';
import SocialButtons from '@/src/components/auth/social-buttons';
import { ButtonWhite } from '@/src/components/shared/ui/button';
import Link from 'next/link';

const inputClassName =
  'w-full rounded-md border border-stroke-3/25 bg-transparent px-4.5 py-3 text-white/90 placeholder:text-white/55 focus:outline-none';

const SignUpForm = () => {
  return (
    <form
      className="bg-background-7 flex flex-col items-center gap-8 rounded-lg px-8 py-6 backdrop-blur-[60px] md:py-8"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-4">
          <fieldset className="space-y-2">
            <label htmlFor="signup-username" className="text-tagline-2 block text-white/90">
              Username
            </label>
            <input
              type="text"
              id="signup-username"
              name="username"
              placeholder="Your name"
              className={inputClassName}
              required
              aria-label="Username"
            />
          </fieldset>

          <fieldset className="space-y-2">
            <label htmlFor="signup-email" className="text-tagline-2 block text-white/90">
              Your email
            </label>
            <input
              type="email"
              id="signup-email"
              name="email"
              placeholder="Email address"
              className={inputClassName}
              required
              aria-label="Your email"
            />
          </fieldset>

          <fieldset className="space-y-2">
            <label htmlFor="signup-password" className="text-tagline-2 block text-white/90">
              Password
            </label>
            <input
              type="password"
              id="signup-password"
              name="password"
              placeholder="At least 8 characters"
              className={inputClassName}
              required
              minLength={8}
              aria-label="Password"
            />
          </fieldset>

          <fieldset className="space-y-2">
            <label
              htmlFor="signup-confirm-password"
              className="text-tagline-2 block text-white/90"
            >
              Confirm password
            </label>
            <input
              type="password"
              id="signup-confirm-password"
              name="confirm-password"
              placeholder="Re-enter your password"
              className={inputClassName}
              required
              aria-label="Confirm Password"
            />
          </fieldset>
        </div>

        <ButtonWhite
          type="submit"
          className="w-full md:w-auto"
          textClassName="text-center text-nowrap flex-1 px-0! mr-8!"
        >
          Sign up
        </ButtonWhite>

        <AuthOrDivider />

        <SocialButtons />
      </div>

      <p className="text-tagline-3 text-center text-white/90">
        Already have an account?{' '}
        <Link href="/login" className="text-white/70 underline">
          Login
        </Link>
      </p>
    </form>
  );
};

export default SignUpForm;
