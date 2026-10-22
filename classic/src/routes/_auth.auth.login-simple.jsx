import { createFileRoute } from '@tanstack/react-router';
import LoginSimple from '/src/views/Authentication/LogIn/LoginSimple';
import { AnimatedRoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_auth/auth/login-simple')({
  component: () => <AnimatedRoutePage component={LoginSimple} path="/auth/login-simple" />,
});
