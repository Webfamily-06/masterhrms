import { createFileRoute } from '@tanstack/react-router';
import AddNewPost from '/src/views/Blog/AddNewPost';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/blog/add-new-post')({
  component: () => <RoutePage component={AddNewPost} path="/apps/blog/add-new-post" />,
});
