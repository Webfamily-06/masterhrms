import { createFileRoute } from '@tanstack/react-router';
import Login from '/src/views/Authentication/LogIn/Login/Login';
import { AnimatedRoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_auth/auth/login')({
  component: () => <AnimatedRoutePage component={Login} path="/auth/login" />,
});
