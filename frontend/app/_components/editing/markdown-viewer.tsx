"use client";

import { cn } from "@/lib/utils";
import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { InlineSvg } from "./inline-svg";
// import axios from "axios";

const imageCache = new Map<string, string>();

interface MarkdownViewerProps {
  markdown: string;
  repoUrl: string;
}

function rewriteGitHubUrlToLocalPreview(originalUrl: string, repoUrl: string) {
  const match = originalUrl.match(/https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/main\/([^?]+)\?raw=true$/);
  if (!match) return originalUrl;

  const token = localStorage.getItem("githubToken") || "";
  const pathAndFile = match[2];
  const lastSlashIndex = pathAndFile.lastIndexOf("/");
  const path = lastSlashIndex >= 0 ? pathAndFile.slice(0, lastSlashIndex) : "";
  const filename = pathAndFile.split("/").pop() || "";

  return `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/github/preview-image?repoUrl=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(path)}&filename=${encodeURIComponent(filename)}&token=${token}`;
}

export function MarkdownViewer({ markdown, repoUrl }: MarkdownViewerProps) {
  // const [processedMarkdown, setProcessedMarkdown] = React.useState(markdown);

  // const processedMarkdown = React.useMemo(() => {
  //   return markdown.replace(
  //     /<img\s+src="([^"]+)"\s*\/?>/g,
  //     (match, p1) => {
  //       const previewUrl = rewriteGitHubUrlToLocalPreview(p1, repoUrl);
  //       return match.replace(p1, previewUrl);
  //     }
  //   );
  // }, [markdown, repoUrl]);

  const components: Partial<Components> = React.useMemo(() => ({
    h1: ({ children, ...props }) => (
      <h1
        className="pb-3 mb-3 text-2xl font-semibold border-b border-border"
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2
        className="pb-3 mt-6 mb-3 text-xl font-semibold border-b border-border"
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="mt-6 mb-3 text-lg font-semibold" {...props}>
        {children}
      </h3>
    ),
    p: ({ children, ...props }) => (
      <p className="mb-4 leading-relaxed" {...props}>
        {children}
      </p>
    ),
    a: ({ href, children, ...props }) => {
      const fileName = children?.toString().match(/\[(.+?)\]/)?.[1] || children;
      return (
        <a
          href={href}
          className="text-primary hover:underline break-words"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            hyphens: "auto",
          }}
          {...props}
        >
          {fileName}
        </a>
      );
    },
    ul: ({ children, ...props }) => (
      <ul className="pl-6 mb-4 list-disc" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="pl-6 mb-4 list-decimal" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="mb-1" {...props}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="pl-4 pr-2 py-1 mb-4 border-l-4 border-border bg-muted/50"
        {...props}
      >
        {children}
      </blockquote>
    ),
    pre: ({ children, ...props }) => (
      <pre
        className="relative rounded bg-popover px-4 py-3 font-mono text-sm text-accent-foreground overflow-auto"
        {...props}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </pre>
    ),
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !match;
      return isInline ? (
        <code
          className="relative rounded bg-popover px-[0.3rem] py-[0.2rem] font-mono text-sm font-normal text-accent-foreground break-words"
          {...props}
        >
          {children}
        </code>
      ) : (
        <code
          className={cn(
            "relative rounded font-mono text-sm font-normal text-accent-foreground bg-popover",
            className
          )}
          {...props}
        >
          {children}
        </code>
      );
    },
    img: React.memo(function ImgComponent({ src = "", alt, ...props }) {
      const cachedSrc = React.useMemo(() => {
        if (!src) return "";
        if (imageCache.has(src)) {
          return imageCache.get(src)!;
        }
        if (src.endsWith(".svg") || src.endsWith(".svg?raw=true")) {
          return src;
        }
        const previewSrc = rewriteGitHubUrlToLocalPreview(src, repoUrl);
        imageCache.set(src, previewSrc);
        return previewSrc;
      }, [src, repoUrl]);

      if (src.endsWith(".svg") || src.endsWith(".svg?raw=true")) {
        return <InlineSvg src={cachedSrc} alt={alt} repoUrl={repoUrl} {...props} />;
      }

      return (
        <img
          src={cachedSrc}
          alt={alt || ""}
          {...props}
          loading="lazy"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      );
    }, (prev, next) => prev.src === next.src),
    th: ({ children, ...props }) => (
      <th className="px-6 py-3 text-left border border-border bg-muted" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="px-6 py-3 border border-border" {...props}>
        {children}
      </td>
    ),
    hr: (props) => <hr className="my-4 border-t border-border" {...props} />,
  }), [repoUrl]);

  return (
    <div className="h-full flex flex-col bg-card">
      {/* <h2 className="text-xl font-bold p-4 text-foreground bg-card border-b py-3">
        Markdown Preview
      </h2> */}
      <div className="flex-grow overflow-auto bg-background">
        <div className="h-full overflow-auto prose prose-invert max-w-none p-5
            [&::-webkit-scrollbar-track]:shadow-[inset_1px_0_0_hsl(var(--border)_/_0.5)]
            [&::-webkit-scrollbar]:w-[10px]
            [&::-webkit-scrollbar-thumb]:bg-secondary
            [&::-webkit-scrollbar-thumb]:transition-opacity
            [&::-webkit-scrollbar]:bg-card/5
            hover:[&::-webkit-scrollbar-thumb]:bg-secondary-foreground/30 break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={components}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
