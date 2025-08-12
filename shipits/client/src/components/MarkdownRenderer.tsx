import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
// Import a default highlight.js theme
import "highlight.js/styles/github.css";

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

// Extend sanitize schema to allow className on code/pre for syntax highlighting
// and support data: URIs for inline images inserted via the editor while preserving
// any default relative URL allowances from the base schema
const defaultSrcProtocols = ((defaultSchema as any).protocols && (defaultSchema as any).protocols.src) || [];
const sanitizeSchema: any = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema as any).attributes,
    code: [
      ...(((defaultSchema as any).attributes?.code as any[]) || []),
      ["className"]
    ],
    pre: [
      ...(((defaultSchema as any).attributes?.pre as any[]) || []),
      ["className"]
    ],
    span: [
      ...(((defaultSchema as any).attributes?.span as any[]) || []),
      ["className"]
    ],
    a: [
      ...(((defaultSchema as any).attributes?.a as any[]) || []),
      ["target"],
      ["rel"]
    ],
    img: [
      ...(((defaultSchema as any).attributes?.img as any[]) || []),
      ["loading"],
      ["decoding"],
      ["referrerPolicy"]
    ]
  },
  protocols: {
    ...((defaultSchema as any).protocols || {}),
    // Merge in data: while keeping whatever the base schema already allowed (including relative)
    src: Array.from(new Set([...(defaultSrcProtocols as any[]), "data"])),
    href: ["http", "https", "mailto", "tel"]
  }
};

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeHighlight]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          img: ({ node, ...props }) => {
            const src = (props as any).src as string | undefined;
            let normalizedSrc = src;
            if (src && !/^https?:\/\//i.test(src) && !/^data:/i.test(src)) {
              // If it's a root-relative path, keep it; if it's a bare filename or relative path, prefix with /uploads/
              normalizedSrc = src.startsWith('/') ? src : `/uploads/${src}`;
            }
            return (
              <img
                {...props}
                src={normalizedSrc}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                style={{ maxWidth: "100%", height: "auto" }}
              />
            );
          }
        }}
      >
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;

