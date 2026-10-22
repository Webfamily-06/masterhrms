import { createFileRoute } from '@tanstack/react-router';
import Error503 from '/src/views/Authentication/Error503/Error503';
import { AnimatedRoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_auth/auth/error-503')({
  component: () => <AnimatedRoutePage component={Error503} path="/auth/error-503" />,
});
