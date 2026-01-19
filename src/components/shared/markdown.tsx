"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Neo-brutalist styled Markdown renderer.
 *
 * Uses DM Sans for prose and Space Mono for code.
 * Sharp corners, no shadows, high contrast.
 */
export function Markdown({ children, className = "" }: MarkdownProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

const components: Components = {
  // Headings - bold, DM Sans, no margins on first heading
  h1: ({ children }) => (
    <h1 className="mb-4 mt-6 border-b-2 border-foreground pb-2 text-2xl font-bold first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-5 text-xl font-bold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-lg font-bold first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="mb-1 mt-2 text-sm font-bold uppercase tracking-wider first:mt-0">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="mb-1 mt-2 text-sm font-bold uppercase tracking-wider text-muted-foreground first:mt-0">
      {children}
    </h6>
  ),

  // Paragraph
  p: ({ children }) => (
    <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
  ),

  // Lists - square bullets for brutalist style
  ul: ({ children }) => (
    <ul className="mb-3 ml-4 list-none space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="counter-reset-list mb-3 ml-4 list-none space-y-1">
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => {
    // Check if this is inside an ordered list by looking at parent
    const _isOrdered = props.node?.position?.start.column === 1;
    return (
      <li className="relative pl-4 before:absolute before:left-0 before:top-1.5 before:text-xs before:text-secondary before:content-['■']">
        {children}
      </li>
    );
  },

  // Links - gold underline on hover
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-secondary decoration-2 underline-offset-2 transition-none hover:bg-secondary hover:text-secondary-foreground"
    >
      {children}
    </a>
  ),

  // Strong/Bold
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,

  // Emphasis/Italic
  em: ({ children }) => <em className="italic">{children}</em>,

  // Inline code - Space Mono, gold background
  code: ({ className, children, ...props }) => {
    // Check if this is a code block (has language class) or inline code
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className={`${className} font-mono text-sm`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="bg-secondary/30 border-foreground/20 border px-1.5 py-0.5 font-mono text-sm">
        {children}
      </code>
    );
  },

  // Code blocks - black background, white text, Space Mono
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto border-2 border-foreground bg-foreground p-4 font-mono text-sm text-background">
      {children}
    </pre>
  ),

  // Blockquote - left border with gold
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-4 border-secondary pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className="my-6 border-t-2 border-foreground" />,

  // Images - sharp corners, border
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt || ""}
      className="my-4 h-auto max-w-full border-2 border-foreground"
    />
  ),

  // Tables - brutalist style
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-2 border-foreground">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-foreground text-background">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-foreground last:border-b-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2 text-left font-mono text-sm font-bold uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-foreground/20 border-r px-4 py-2 last:border-r-0">
      {children}
    </td>
  ),

  // Delete/Strikethrough
  del: ({ children }) => (
    <del className="line-through opacity-60">{children}</del>
  ),
};
