import Login from '@/src/components/auth/login';
import { generateMetadata } from '@/src/utils/generateMetaData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  ...generateMetadata(),
  title: 'Login - Automation SaaS || Nexsas',
};

const LoginPage = () => {
  return <Login />;
};

export default LoginPage;
