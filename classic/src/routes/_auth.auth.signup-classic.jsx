import { createFileRoute } from '@tanstack/react-router';
import SignupClassic from '/src/views/Authentication/SignUp/SignupClassic';
import { AnimatedRoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_auth/auth/signup-classic')({
  component: () => <AnimatedRoutePage component={SignupClassic} path="/auth/signup-classic" />,
});
