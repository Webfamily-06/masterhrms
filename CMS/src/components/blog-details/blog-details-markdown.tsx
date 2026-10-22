import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';

interface BlogDetailsMarkdownProps {
  content: string;
}

const BlogDetailsMarkdown = ({ content }: BlogDetailsMarkdownProps) => {
  return (
    <div className="blog-details-markdown">
      <ReactMarkdown rehypePlugins={[rehypeSlug]}>{content}</ReactMarkdown>
    </div>
  );
};

export default BlogDetailsMarkdown;
