"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

/** Markdown 富文本渲染 (含 GFM 表格 / 数学公式 KaTeX / 代码块) */
export function MarkdownView({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("md-view text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: (p) => <h1 className="text-base font-bold mt-3 mb-2 border-b pb-1" {...p} />,
          h2: (p) => <h2 className="text-[15px] font-bold mt-3 mb-1.5" {...p} />,
          h3: (p) => <h3 className="text-[14px] font-semibold mt-2.5 mb-1.5 text-primary" {...p} />,
          h4: (p) => <h4 className="text-[13px] font-semibold mt-2 mb-1" {...p} />,
          p:  (p) => <p className="my-1.5" {...p} />,
          ul: (p) => <ul className="list-disc pl-5 my-1.5 space-y-1" {...p} />,
          ol: (p) => <ol className="list-decimal pl-5 my-1.5 space-y-1" {...p} />,
          li: (p) => <li className="leading-relaxed" {...p} />,
          strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
          em: (p) => <em className="italic" {...p} />,
          a: ({ href, ...rest }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className="text-primary underline underline-offset-2 hover:opacity-80" {...rest} />
          ),
          blockquote: (p) => <blockquote className="border-l-2 border-primary/50 bg-muted/40 pl-3 py-1 my-2 text-muted-foreground italic" {...p} />,
          hr: () => <hr className="my-3 border-border/60" />,
          code: ({ children, className, ...rest }: any) => {
            const isInline = !className?.includes("language-");
            if (isInline) {
              return <code className="rounded bg-muted/70 px-1.5 py-0.5 text-[12.5px] font-mono text-primary" {...rest}>{children}</code>;
            }
            return <code className={cn(className, "block")} {...rest}>{children}</code>;
          },
          pre: (p) => (
            <pre className="my-2 overflow-x-auto rounded-md bg-muted/70 border p-3 text-[12.5px] font-mono whitespace-pre" {...p} />
          ),
          table: (p) => (
            <div className="my-2 overflow-x-auto">
              <table className="text-xs border-collapse" {...p} />
            </div>
          ),
          th: (p) => <th className="border px-2 py-1 bg-muted/60 font-semibold text-left" {...p} />,
          td: (p) => <td className="border px-2 py-1" {...p} />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
