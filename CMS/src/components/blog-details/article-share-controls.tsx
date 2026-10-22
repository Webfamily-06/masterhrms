'use client';

import React, { useState } from 'react';
import { getTrustedCanonicalBlogUrl, validateCanonicalUrlOverride } from '@/lib/platform-domain';
import { toast } from 'sonner';
import { Copy, Check, Mail } from 'lucide-react';

interface ArticleShareControlsProps {
  slug: string;
  title: string;
  canonicalUrlOverride?: string;
}

export function ArticleShareControls({
  slug,
  title,
  canonicalUrlOverride,
}: ArticleShareControlsProps) {
  const [copied, setCopied] = useState(false);

  // Derive stable canonical URL from platform config or explicit override
  const cleanSlug = slug.replace(/^blog-/, '');
  const validatedOverride = validateCanonicalUrlOverride(canonicalUrlOverride);
  const canonicalUrl = validatedOverride || getTrustedCanonicalBlogUrl(cleanSlug);

  const encodedUrl = encodeURIComponent(canonicalUrl);
  const encodedTitle = encodeURIComponent(title || 'Master HRMS Enterprise Insights');

  const shareLinks = [
    {
      name: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      title: 'Share on LinkedIn',
      icon: (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/Login/linkedin.svg"
          alt="LinkedIn"
          className="size-[18px] object-contain"
        />
      ),
      hoverClass: 'hover:text-[#0A66C2] hover:border-[#0A66C2]/40 hover:bg-[#0A66C2]/10',
    },
    {
      name: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      title: 'Share on X (Twitter)',
      icon: (
        <svg className="size-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      hoverClass: 'hover:text-foreground hover:border-foreground/40 hover:bg-muted',
    },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      title: 'Share on Facebook',
      icon: (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/Login/facebook-login.svg"
          alt="Facebook"
          className="size-[18px] object-contain"
        />
      ),
      hoverClass: 'hover:text-[#1877F2] hover:border-[#1877F2]/40 hover:bg-[#1877F2]/10',
    },
    {
      name: 'WhatsApp',
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      title: 'Share on WhatsApp',
      icon: (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/Integration/whatsapp.svg"
          alt="WhatsApp"
          className="size-[18px] object-contain"
        />
      ),
      hoverClass: 'hover:text-[#25D366] hover:border-[#25D366]/40 hover:bg-[#25D366]/10',
    },
    {
      name: 'Email',
      href: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(
        `I thought you would find this article from Master HRMS insightful:\n\n${title}\n\nRead the full piece here: ${canonicalUrl}`
      )}`,
      title: 'Share via Email',
      icon: <Mail className="size-4" />,
      hoverClass: 'hover:text-primary hover:border-primary/40 hover:bg-primary/10',
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      toast.success('Article link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = canonicalUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      toast.success('Article link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shareLinks.map((item) => (
        <a
          key={item.name}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          title={item.title}
          aria-label={item.title}
          className={`size-9 rounded-lg border border-border/70 bg-card text-muted-foreground flex items-center justify-center transition-all duration-200 shadow-2xs hover:scale-105 active:scale-95 ${item.hoverClass}`}
        >
          {item.icon}
        </a>
      ))}

      <button
        type="button"
        onClick={handleCopyLink}
        title={copied ? 'Link Copied!' : 'Copy Article Link'}
        aria-label="Copy Article Link"
        className={`h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 shadow-2xs hover:scale-105 active:scale-95 ${
          copied
            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        {copied ? (
          <>
            <Check className="size-3.5 text-emerald-500" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="size-3.5" />
            <span>Copy Link</span>
          </>
        )}
      </button>
    </div>
  );
}
