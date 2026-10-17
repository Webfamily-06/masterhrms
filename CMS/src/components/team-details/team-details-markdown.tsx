import RevealAnimation from '@/src/components/animation/reveal-animation';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';

interface TeamDetailsMarkdownProps {
  content: string;
}

const TeamDetailsMarkdown = ({ content }: TeamDetailsMarkdownProps) => {
  return (
    <RevealAnimation delay={0.1}>
      <div className="team-details-markdown">
        <ReactMarkdown rehypePlugins={[rehypeSlug]}>{content}</ReactMarkdown>
      </div>
    </RevealAnimation>
  );
};

export default TeamDetailsMarkdown;
