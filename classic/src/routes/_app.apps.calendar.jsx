import { createFileRoute } from '@tanstack/react-router';
import Calendar from '/src/views/Calendar';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/calendar')({
  component: () => <RoutePage component={Calendar} path="/apps/calendar" />,
});
