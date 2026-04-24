import ReactMarkdown from "react-markdown";

export const markdownComponents = {
  h1: (props: React.ComponentProps<"h3">) => (
    <h3 className="mb-3 text-lg font-semibold text-white" {...props} />
  ),
  h2: (props: React.ComponentProps<"h4">) => (
    <h4
      className="mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-white/58"
      {...props}
    />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="mb-3 text-sm leading-7 text-white/62" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="mb-3 list-disc pl-5 text-white/62" {...props} />
  ),
  li: (props: React.ComponentProps<"li">) => <li className="mb-1" {...props} />,
  code: (props: React.ComponentProps<"code">) => (
    <code
      className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-xs text-white/86"
      {...props}
    />
  ),
};

type MarkdownContentProps = {
  content: string;
  className?: string;
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  );
}
