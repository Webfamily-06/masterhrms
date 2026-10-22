import { createFileRoute } from '@tanstack/react-router';
import LoginClassic from '/src/views/Authentication/LogIn/LoginClassic';
import { AnimatedRoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_auth/auth/login-classic')({
  component: () => <AnimatedRoutePage component={LoginClassic} path="/auth/login-classic" />,
});
