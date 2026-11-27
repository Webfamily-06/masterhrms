"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <section className="min-h-[80vh] w-full flex items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-8 sm:p-10 shadow-sm text-center space-y-6">
        <div className="mx-auto size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <i className="ph-duotone ph-compass text-3xl" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Error 404</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            The route you requested does not exist or has been moved. Return to your workspace dashboard or home page.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild variant="primary" size="default" className="w-full sm:w-auto gap-2">
            <Link href="/">
              <i className="ph-duotone ph-house text-base" aria-hidden="true" />
              <span>Go Back Home</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="default" className="w-full sm:w-auto gap-2">
            <Link href="/auth">
              <i className="ph-duotone ph-sign-in text-base" aria-hidden="true" />
              <span>Sign In</span>
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default NotFound;
