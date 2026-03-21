import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { skillMarkdownSanitizeSchema } from "./skillMarkdownSchema";

type Props = {
  markdown: string;
};

/**
 * Renders trusted bundled markdown (agency-agents) with GFM, syntax highlighting, and sanitization.
 */
export function SkillMarkdownDoc({ markdown }: Props) {
  return (
    <div
      className="skill-markdown-doc prose prose-slate max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-pre:bg-slate-900 prose-pre:text-slate-100 dark:prose-pre:bg-slate-950"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeHighlight,
          [rehypeSanitize, skillMarkdownSanitizeSchema],
        ]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
