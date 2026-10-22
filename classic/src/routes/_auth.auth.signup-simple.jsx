import { createFileRoute } from '@tanstack/react-router';
import SignUpSimple from '/src/views/Authentication/SignUp/SignupSimple';
import { AnimatedRoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_auth/auth/signup-simple')({
  component: () => <AnimatedRoutePage component={SignUpSimple} path="/auth/signup-simple" />,
});
