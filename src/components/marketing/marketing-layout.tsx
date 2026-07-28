import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b bg-gradient-to-b from-secondary/40 to-background">
      <div className="mx-auto max-w-7xl px-6 py-20 text-center">
        {eyebrow && (
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            {eyebrow}
          </div>
        )}
        <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight max-w-3xl mx-auto">{title}</h1>
        {subtitle && <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>}
        {children && <div className="mt-8 flex justify-center gap-3">{children}</div>}
      </div>
    </section>
  );
}
