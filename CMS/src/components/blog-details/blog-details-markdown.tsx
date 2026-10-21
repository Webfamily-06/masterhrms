import RevealAnimation from '@/src/components/animation/reveal-animation';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';

interface BlogDetailsMarkdownProps {
  content: string;
}

const BlogDetailsMarkdown = ({ content }: BlogDetailsMarkdownProps) => {
  return (
    <RevealAnimation delay={0.1}>
      <div className="blog-details-markdown">
        <ReactMarkdown rehypePlugins={[rehypeSlug]}>{content}</ReactMarkdown>
      </div>
    </RevealAnimation>
  );
};

export default BlogDetailsMarkdown;
