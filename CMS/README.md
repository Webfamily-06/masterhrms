# AI KW Generator - Nexsas Template

A modern, production-ready Next.js 16 marketing template built around AI-powered keyword discovery and growth content. It includes a dedicated **Generate Smart Keyword** experience, blog and team sections, auth and pricing pages, and reusable UI—built with React 19, TypeScript, Tailwind CSS 4, and common animation and content tooling.

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)
![React](https://img.shields.io/badge/React-19.2.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0-blue)
![GSAP](https://img.shields.io/badge/GSAP-3.14.2-green)
![Lenis](https://img.shields.io/badge/Lenis-1.3.17-orange)

## 📦 What's Included

- ✅ **Complete Source Code** - Full Next.js 16 project with App Router
- ✅ **10+ Pages** - Home, Generate Smart Keyword, About, Blog, Team, Contact, Login, Signup, Pricing (plus dynamic blog and team detail routes)
- ✅ **90+ Components** - Reusable React components with TypeScript
- ✅ **Markdown Content** - Blog posts and team profiles with gray-matter
- ✅ **Responsive Design** - Mobile-first layout
- ✅ **SEO** - Shared metadata helpers and Open Graph defaults

### ⚡ **Performance & Developer Experience**

- **Next.js 16**: App Router and modern defaults
- **TypeScript**: Type-safe components and data
- **Component Architecture** - Modular sections under `src/components/`
- **Code Quality** - ESLint 9 and Prettier (with Tailwind class sorting)
- **Maps** - Contact page map via Leaflet and react-leaflet

## 🛠️ Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5.x
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **Animations**: GSAP 3.14, Lenis 1.3.17
- **Icons**: Custom icon font system
- **Carousels**: Swiper
- **Marquee**: react-fast-marquee
- **Maps**: Leaflet, react-leaflet
- **Markdown**: react-markdown, gray-matter, rehype-slug

## 📋 Prerequisites

- **Node.js** 20.0.0 or higher
- **npm**, **yarn**, **pnpm**, or **bun**
- **Git** for version control

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 2. Start Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
ai-kw-generator-ns-next/
├── public/                     # Static assets
│   └── images/                 # Images and icons
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── about/              # About page
│   │   ├── blog/               # Blog listing and [slug] posts
│   │   ├── contact/            # Contact page (incl. map)
│   │   ├── generate-smart-keyword/  # Keyword generator marketing page
│   │   ├── login/              # Login page
│   │   ├── pricing/            # Pricing page
│   │   ├── signup/             # Signup page
│   │   ├── team/               # Team listing and [slug] profiles
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   └── page.tsx            # Homepage
│   ├── components/             # Page and shared UI (~90+ TSX files)
│   │   ├── about/
│   │   ├── animation/
│   │   ├── auth/
│   │   ├── blog/
│   │   ├── blog-details/
│   │   ├── contact/
│   │   ├── generate-smart-keyword/
│   │   ├── home/
│   │   ├── not-found/
│   │   ├── pricing/
│   │   ├── shared/             # Layout, footer, navbar, shared UI
│   │   └── team/
│   ├── context/
│   │   └── MobileMenuContext.tsx
│   ├── data/                   # Static data and Markdown
│   │   ├── blog/               # Blog posts (.md)
│   │   ├── team/               # Team profiles (.md)
│   │   ├── mobile-meu.ts       # Navigation / mobile menu data
│   │   ├── footer.ts
│   │   ├── pricing.ts
│   │   └── team.ts
│   ├── hooks/                  # Custom hooks
│   ├── interface/              # Shared TypeScript types
│   ├── styles/                 # CSS variables, typography, icons
│   └── utils/                  # cn, fonts, Markdown loaders, metadata, TOC
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── README.md
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
```

### Code Quality Tools

- **ESLint 9** with eslint-config-next
- **Prettier 3** with prettier-plugin-tailwindcss

## 🎨 Customization

### Theme

1. **Colors** - `src/styles/variable.css`
2. **Typography** - `src/utils/font.ts`
3. **Components** - `src/components/`
4. **Tailwind** - PostCSS / Tailwind v4 setup in project config

### Content

| Content Type | Location                 | Description        |
| ------------ | ------------------------ | ------------------ |
| Blog posts   | `src/data/blog/`         | Markdown + front matter |
| Team         | `src/data/team/`         | Markdown profiles  |
| Team index   | `src/data/team.ts`       | Listing metadata   |
| Pricing      | `src/data/pricing.ts`    | Plans and copy       |
| Navigation   | `src/data/mobile-meu.ts` | Nav / mobile menu  |
| Footer       | `src/data/footer.ts`     | Footer links       |

### Adding a New Page

1. Add a folder under `src/app/<route>/` with `page.tsx`
2. Add sections under `src/components/<feature>/` as needed
3. Extend `src/data/mobile-meu.ts` if the route should appear in navigation

Example:

```tsx
// src/app/new-page/page.tsx
import NewPageComponent from '@/src/components/new-page/NewPageComponent';
import { generateMetadata as buildMetadata } from '@/src/utils/generateMetaData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  ...buildMetadata(
    'New Page - AI KW Generator',
    'Short description for SEO and social previews.'
  ),
};

const NewPage = () => {
  return (
    <main>
      <NewPageComponent />
    </main>
  );
};

export default NewPage;
```

## 🏗️ Building for Production

```bash
npm run build
npm run start
```

Build output benefits from Next.js image handling, route-based splitting, and static generation where configured.

## 🚀 Deployment

### Vercel (recommended)

```bash
npm i -g vercel
vercel
```

The template also deploys to Netlify, Railway, DigitalOcean, AWS Amplify, or any Node host that supports Next.js.

Typical steps: run `npm run build` locally, set environment variables if you add any, then connect the repo to your host.

## 🔍 Browser Support

- Chrome, Firefox, Safari, Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📧 Support

For support and questions:

- **Email**: [hello@pixel71.com](mailto:hello@pixel71.com)
- **Response Time**: Within 24 hours on business days

---

**Made with ❤️ by [Pixel71](mailto:hello@pixel71.com)**

_Happy coding!_
