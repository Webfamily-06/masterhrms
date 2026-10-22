import { createFileRoute } from '@tanstack/react-router';
import LockScreen from '/src/views/Authentication/LockScreen';
import { AnimatedRoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_auth/auth/lock-screen')({
  component: () => <AnimatedRoutePage component={LockScreen} path="/auth/lock-screen" />,
});
