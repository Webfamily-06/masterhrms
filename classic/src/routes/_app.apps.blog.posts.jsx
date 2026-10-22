import { createFileRoute } from '@tanstack/react-router';
import Posts from '/src/views/Blog/Posts';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/blog/posts')({
  component: () => <RoutePage component={Posts} path="/apps/blog/posts" />,
});
