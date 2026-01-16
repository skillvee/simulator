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
    <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 border-b-2 border-foreground pb-2">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-sm font-bold mb-1 mt-2 first:mt-0 uppercase tracking-wider">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-sm font-bold mb-1 mt-2 first:mt-0 uppercase tracking-wider text-muted-foreground">
      {children}
    </h6>
  ),

  // Paragraph
  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,

  // Lists - square bullets for brutalist style
  ul: ({ children }) => (
    <ul className="mb-3 ml-4 space-y-1 list-none">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-4 space-y-1 list-none counter-reset-list">{children}</ol>
  ),
  li: ({ children, ...props }) => {
    // Check if this is inside an ordered list by looking at parent
    const isOrdered = props.node?.position?.start.column === 1;
    return (
      <li className="relative pl-4 before:absolute before:left-0 before:content-['■'] before:text-secondary before:text-xs before:top-1.5">
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
      className="underline decoration-2 decoration-secondary underline-offset-2 hover:bg-secondary hover:text-secondary-foreground transition-none"
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
      <code className="font-mono text-sm bg-secondary/30 px-1.5 py-0.5 border border-foreground/20">
        {children}
      </code>
    );
  },

  // Code blocks - black background, white text, Space Mono
  pre: ({ children }) => (
    <pre className="mb-4 p-4 bg-foreground text-background font-mono text-sm overflow-x-auto border-2 border-foreground">
      {children}
    </pre>
  ),

  // Blockquote - left border with gold
  blockquote: ({ children }) => (
    <blockquote className="mb-3 pl-4 border-l-4 border-secondary italic text-muted-foreground">
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
      className="max-w-full h-auto border-2 border-foreground my-4"
    />
  ),

  // Tables - brutalist style
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
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
    <th className="px-4 py-2 text-left font-bold font-mono text-sm uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 border-r border-foreground/20 last:border-r-0">
      {children}
    </td>
  ),

  // Delete/Strikethrough
  del: ({ children }) => <del className="line-through opacity-60">{children}</del>,
};
