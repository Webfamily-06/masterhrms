'use client';

import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { BlogManagerStudio } from "@/components/cms/blog-manager-studio";

export default function SuperBlogsPage() {
  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <i className="ph-duotone ph-book-open text-xl"></i>
            </span>
            Blog Insights & Publishing Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Author, organize, filter, and monitor public marketing insights, editorial articles, and technical playbooks.
          </p>
        </div>
        <BreadcrumbNav
          items={[
            { label: "Dashboard", href: "/super" },
            { label: "CMS Studio", href: "/super/cms" },
            { label: "Blogs & Insights", href: "/super/blogs" },
          ]}
        />
      </div>
      <BlogManagerStudio />
    </div>
  );
}
