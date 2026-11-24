import React from "react";

export default function PublicCareersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css"
      />
      <link
        rel="stylesheet"
        href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css"
      />
      <link
        rel="stylesheet"
        href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css"
      />
      <div className="min-h-screen bg-[#f8fafc] dark:bg-background text-foreground">
        {children}
      </div>
    </>
  );
}
