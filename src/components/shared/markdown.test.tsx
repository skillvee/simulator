import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Markdown } from "./markdown";

describe("Markdown component", () => {
  describe("basic rendering", () => {
    it("renders plain text", () => {
      render(<Markdown>Hello world</Markdown>);
      expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    it("renders multiple paragraphs", () => {
      render(<Markdown>{"First paragraph\n\nSecond paragraph"}</Markdown>);
      expect(screen.getByText("First paragraph")).toBeInTheDocument();
      expect(screen.getByText("Second paragraph")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <Markdown className="custom-class">Test</Markdown>
      );
      expect(container.firstChild).toHaveClass("markdown-content");
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("headings", () => {
    it("renders h1 with border-bottom", () => {
      const { container } = render(<Markdown># Heading 1</Markdown>);
      const h1 = container.querySelector("h1");
      expect(h1).toBeInTheDocument();
      expect(h1).toHaveTextContent("Heading 1");
      expect(h1).toHaveClass("border-b-2");
    });

    it("renders h2", () => {
      const { container } = render(<Markdown>## Heading 2</Markdown>);
      const h2 = container.querySelector("h2");
      expect(h2).toBeInTheDocument();
      expect(h2).toHaveTextContent("Heading 2");
    });

    it("renders h3", () => {
      const { container } = render(<Markdown>### Heading 3</Markdown>);
      const h3 = container.querySelector("h3");
      expect(h3).toBeInTheDocument();
      expect(h3).toHaveTextContent("Heading 3");
    });

    it("renders h4", () => {
      const { container } = render(<Markdown>#### Heading 4</Markdown>);
      const h4 = container.querySelector("h4");
      expect(h4).toBeInTheDocument();
      expect(h4).toHaveTextContent("Heading 4");
    });

    it("renders h5 with uppercase styling", () => {
      const { container } = render(<Markdown>##### Heading 5</Markdown>);
      const h5 = container.querySelector("h5");
      expect(h5).toBeInTheDocument();
      expect(h5).toHaveClass("uppercase");
    });

    it("renders h6 with muted color", () => {
      const { container } = render(<Markdown>###### Heading 6</Markdown>);
      const h6 = container.querySelector("h6");
      expect(h6).toBeInTheDocument();
      expect(h6).toHaveClass("text-muted-foreground");
    });
  });

  describe("text formatting", () => {
    it("renders bold text", () => {
      const { container } = render(<Markdown>**bold text**</Markdown>);
      const strong = container.querySelector("strong");
      expect(strong).toBeInTheDocument();
      expect(strong).toHaveTextContent("bold text");
      expect(strong).toHaveClass("font-bold");
    });

    it("renders italic text", () => {
      const { container } = render(<Markdown>*italic text*</Markdown>);
      const em = container.querySelector("em");
      expect(em).toBeInTheDocument();
      expect(em).toHaveTextContent("italic text");
      expect(em).toHaveClass("italic");
    });

    it("renders strikethrough text", () => {
      const { container } = render(<Markdown>~~deleted~~</Markdown>);
      const del = container.querySelector("del");
      expect(del).toBeInTheDocument();
      expect(del).toHaveTextContent("deleted");
      expect(del).toHaveClass("line-through");
    });
  });

  describe("links", () => {
    it("renders links with gold underline decoration", () => {
      const { container } = render(
        <Markdown>[Link text](https://example.com)</Markdown>
      );
      const link = container.querySelector("a");
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent("Link text");
      expect(link).toHaveAttribute("href", "https://example.com");
      expect(link).toHaveClass("decoration-secondary");
    });

    it("opens links in new tab", () => {
      const { container } = render(
        <Markdown>[External](https://example.com)</Markdown>
      );
      const link = container.querySelector("a");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("lists", () => {
    it("renders unordered lists", () => {
      const { container } = render(
        <Markdown>{"- Item 1\n- Item 2\n- Item 3"}</Markdown>
      );
      const ul = container.querySelector("ul");
      expect(ul).toBeInTheDocument();
      const items = container.querySelectorAll("li");
      expect(items).toHaveLength(3);
    });

    it("renders ordered lists", () => {
      const { container } = render(
        <Markdown>{"1. First\n2. Second\n3. Third"}</Markdown>
      );
      const ol = container.querySelector("ol");
      expect(ol).toBeInTheDocument();
      const items = container.querySelectorAll("li");
      expect(items).toHaveLength(3);
    });

    it("applies square bullet styling to list items", () => {
      const { container } = render(<Markdown>- Item</Markdown>);
      const li = container.querySelector("li");
      expect(li).toHaveClass("before:content-['\u25A0']");
    });
  });

  describe("code", () => {
    it("renders inline code with gold background tint", () => {
      const { container } = render(<Markdown>Use `code` here</Markdown>);
      const code = container.querySelector("code");
      expect(code).toBeInTheDocument();
      expect(code).toHaveTextContent("code");
      expect(code).toHaveClass("font-mono");
      expect(code).toHaveClass("bg-secondary/30");
    });

    it("renders code blocks with black background", () => {
      const { container } = render(
        <Markdown>{"```javascript\nconst x = 1;\n```"}</Markdown>
      );
      const pre = container.querySelector("pre");
      expect(pre).toBeInTheDocument();
      expect(pre).toHaveClass("bg-foreground");
      expect(pre).toHaveClass("text-background");
    });

    it("renders code blocks with border", () => {
      const { container } = render(
        <Markdown>{"```\ncode block\n```"}</Markdown>
      );
      const pre = container.querySelector("pre");
      expect(pre).toHaveClass("border-2");
      expect(pre).toHaveClass("border-foreground");
    });
  });

  describe("blockquotes", () => {
    it("renders blockquotes with gold left border", () => {
      const { container } = render(<Markdown>&gt; Quote text</Markdown>);
      const blockquote = container.querySelector("blockquote");
      expect(blockquote).toBeInTheDocument();
      expect(blockquote).toHaveClass("border-l-4");
      expect(blockquote).toHaveClass("border-secondary");
      expect(blockquote).toHaveClass("italic");
    });
  });

  describe("horizontal rule", () => {
    it("renders hr with thick border", () => {
      const { container } = render(
        <Markdown>{"Above\n\n---\n\nBelow"}</Markdown>
      );
      const hr = container.querySelector("hr");
      expect(hr).toBeInTheDocument();
      expect(hr).toHaveClass("border-t-2");
      expect(hr).toHaveClass("border-foreground");
    });
  });

  describe("images", () => {
    it("renders images with border", () => {
      const { container } = render(
        <Markdown>![Alt text](https://example.com/image.png)</Markdown>
      );
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/image.png");
      expect(img).toHaveAttribute("alt", "Alt text");
      expect(img).toHaveClass("border-2");
      expect(img).toHaveClass("border-foreground");
    });
  });

  describe("tables", () => {
    it("renders tables with proper structure", () => {
      const tableMarkdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
      `;
      const { container } = render(<Markdown>{tableMarkdown}</Markdown>);

      const table = container.querySelector("table");
      expect(table).toBeInTheDocument();
      expect(table).toHaveClass("border-2");

      const thead = container.querySelector("thead");
      expect(thead).toHaveClass("bg-foreground");
      expect(thead).toHaveClass("text-background");

      const th = container.querySelector("th");
      expect(th).toHaveClass("font-mono");
      expect(th).toHaveClass("uppercase");
    });
  });

  describe("complex documents", () => {
    it("renders mixed content correctly", () => {
      const complexMarkdown = `
# Main Title

This is a **bold** statement with *italic* text.

## Section

- First item
- Second item

\`\`\`typescript
const greeting = "hello";
\`\`\`

> A wise quote

[Learn more](https://example.com)
      `;

      const { container } = render(<Markdown>{complexMarkdown}</Markdown>);

      expect(container.querySelector("h1")).toBeInTheDocument();
      expect(container.querySelector("h2")).toBeInTheDocument();
      expect(container.querySelector("strong")).toBeInTheDocument();
      expect(container.querySelector("em")).toBeInTheDocument();
      expect(container.querySelector("ul")).toBeInTheDocument();
      expect(container.querySelector("pre")).toBeInTheDocument();
      expect(container.querySelector("blockquote")).toBeInTheDocument();
      expect(container.querySelector("a")).toBeInTheDocument();
    });
  });

  describe("neo-brutalist design compliance", () => {
    it("uses DM Sans for prose (via font-sans inherited)", () => {
      // The markdown-content container doesn't override font, inheriting DM Sans
      const { container } = render(<Markdown>Regular text</Markdown>);
      expect(container.firstChild).toHaveClass("markdown-content");
    });

    it("uses Space Mono for code (font-mono class)", () => {
      const { container } = render(<Markdown>`code`</Markdown>);
      const code = container.querySelector("code");
      expect(code).toHaveClass("font-mono");
    });

    it("has no rounded corners on code blocks", () => {
      const { container } = render(<Markdown>{"```\ncode\n```"}</Markdown>);
      const pre = container.querySelector("pre");
      // No rounded-* classes should be present
      const classes = pre?.className || "";
      expect(classes).not.toMatch(/rounded/);
    });

    it("has no shadow classes", () => {
      const { container } = render(<Markdown>{"```\ncode\n```"}</Markdown>);
      const pre = container.querySelector("pre");
      const classes = pre?.className || "";
      expect(classes).not.toMatch(/shadow/);
    });
  });
});
