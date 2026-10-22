import { createFileRoute } from '@tanstack/react-router';
import Account from '/src/views/Profiles/Account';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/pages/account')({
  component: () => <RoutePage component={Account} path="/pages/account" />,
});
