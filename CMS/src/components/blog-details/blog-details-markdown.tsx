import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { formatMarkdownWithSafeBreaks } from '@/lib/markdown';
import { safeMarkdownComponents } from '@/lib/safe-markdown-components';

interface BlogDetailsMarkdownProps {
  content: string;
}

const BlogDetailsMarkdown = ({ content }: BlogDetailsMarkdownProps) => {
  const processedContent = formatMarkdownWithSafeBreaks(content);
  return (
    <div className="blog-details-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={safeMarkdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default BlogDetailsMarkdown;
