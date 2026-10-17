import NotFound from '@/src/components/shared/not-found';
import { generateMetadata } from '@/src/utils/generateMetaData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  ...generateMetadata(),
  title: '404 - Automation SaaS || Webfamily Tech Solutions',
};

export default function NotFoundPage() {
  return <NotFound />;
}
