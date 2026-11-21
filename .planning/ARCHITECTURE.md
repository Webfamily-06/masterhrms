# Architecture Overview: MasterHRMS Enterprise

## System Architecture
- **Web Frontend**: React 19, TanStack Router & Query, Tailwind CSS, Vite.
- **CMS Frontend**: Next.js 14 App Router, Tailwind CSS, Lucide icons.
- **Backend API Server**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL.
- **Mobile Client**: React Native / Expo, TanStack Query, Secure Storage.
- **Worker & Crons**: Node-cron scheduled workers with tenant concurrency isolation.
- **Add-on Engine**: Dynamic registry with runtime entitlement validation.
