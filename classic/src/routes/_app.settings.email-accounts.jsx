import { createFileRoute } from '@tanstack/react-router';
import EmailAccountsSettings from '/src/views/Settings/EmailAccounts';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/settings/email-accounts')({
  component: () => <RoutePage component={EmailAccountsSettings} path="/settings/email-accounts" />,
});
