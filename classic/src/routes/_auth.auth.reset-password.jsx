import { createFileRoute } from '@tanstack/react-router';
import ResetPassword from '/src/views/Authentication/ResetPassword';
import { AnimatedRoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_auth/auth/reset-password')({
  component: () => <AnimatedRoutePage component={ResetPassword} path="/auth/reset-password" />,
});
