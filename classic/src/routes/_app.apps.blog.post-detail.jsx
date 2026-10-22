import { createFileRoute } from '@tanstack/react-router';
import PostDetail from '/src/views/Blog/PostDetails';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/blog/post-detail')({
  component: () => <RoutePage component={PostDetail} path="/apps/blog/post-detail" />,
});
