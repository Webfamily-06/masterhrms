import { createFileRoute } from '@tanstack/react-router';
import Signup from '/src/views/Authentication/SignUp/Signup';
import { AnimatedRoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_auth/auth/signup')({
  component: () => <AnimatedRoutePage component={Signup} path="/auth/signup" />,
});
