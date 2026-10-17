'use client';

import LoginForm from '@/src/components/auth/login-form';
import { DynamicLogo } from '@/src/components/ui/dynamic-logo';

const Login = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#070b10] px-4 py-16 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-purple-700/20 via-indigo-600/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 h-[450px] w-[500px] rounded-full bg-gradient-to-tr from-blue-700/15 via-purple-600/10 to-transparent blur-3xl" />

      <div className="relative z-10 w-full max-w-[460px]">
        {/* Brand header with Dynamic Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4">
            <DynamicLogo href="/" size="xl" showTitle={false} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Welcome to Workspace
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-white/60">
            Sign in to access your Enterprise HRMS, Payroll & Team Operations
          </p>
        </div>

        {/* Real Authenticating Form */}
        <LoginForm />

        {/* System Footer info */}
        <p className="mt-8 text-center text-xs text-white/40">
          Master HRMS Platform • Protected by TLS 1.3 & Enterprise SSO
        </p>
      </div>
    </div>
  );
};

export default Login;
