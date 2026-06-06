// Markdown → JSX. Uses marked.lexer to produce a JSX tree so Hono JSX
// handles all escaping. Raw HTML tokens are dropped (XSS vector).

import type { Child } from "hono/jsx";
import { marked } from "marked";
import type { Token, Tokens } from "marked";

function blocks(tokens: Token[]): Child[] {
  return tokens.map(block);
}

function block(t: Token): Child {
  switch (t.type) {
    case "space":
      return null;
    case "paragraph":
      return <p>{inlines((t as Tokens.Paragraph).tokens)}</p>;
    case "heading": {
      const h = t as Tokens.Heading;
      const c = inlines(h.tokens);
      if (h.depth === 1) return <h1>{c}</h1>;
      if (h.depth === 2) return <h2>{c}</h2>;
      if (h.depth === 3) return <h3>{c}</h3>;
      if (h.depth === 4) return <h4>{c}</h4>;
      if (h.depth === 5) return <h5>{c}</h5>;
      return <h6>{c}</h6>;
    }
    case "blockquote":
      return <blockquote>{blocks((t as Tokens.Blockquote).tokens)}</blockquote>;
    case "hr":
      return <hr />;
    case "code": {
      const c = t as Tokens.Code;
      return (
        <div class="code-block">
          <div class="code-block__header">
            {c.lang && <span class="code-block__lang">{c.lang}</span>}
            <button
              type="button"
              class="code-block__copy"
              data-action="copy-code"
            >
              Copy
            </button>
          </div>
          <pre class="note-detail__code">
            <code class={c.lang ? `language-${c.lang}` : undefined}>
              {c.text}
            </code>
          </pre>
        </div>
      );
    }
    case "list": {
      const l = t as Tokens.List;
      const items = l.items.map((item, i) => (
        <li key={i}>{blocks(item.tokens)}</li>
      ));
      return l.ordered
        ? <ol start={l.start || undefined}>{items}</ol>
        : <ul>{items}</ul>;
    }
    case "table": {
      const tb = t as Tokens.Table;
      return (
        <table>
          <thead>
            <tr>
              {tb.header.map((cell, i) => (
                <th key={i} scope="col">{inlines(cell.tokens)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tb.rows.map((row) => (
              <tr>
                {row.map((cell, ci) => <td key={ci}>{inlines(cell.tokens)}
                </td>)}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "text": {
      const tx = t as Tokens.Text;
      return tx.tokens ? <>{inlines(tx.tokens)}</> : tx.text;
    }
    case "html":
      return null;
    default:
      return null;
  }
}

function inlines(tokens: Token[]): Child[] {
  return tokens.map(inline);
}

function inline(t: Token): Child {
  switch (t.type) {
    case "text": {
      const tx = t as Tokens.Text;
      return tx.tokens ? <>{inlines(tx.tokens)}</> : tx.text;
    }
    case "escape":
      return (t as Tokens.Escape).text;
    case "strong":
      return <strong>{inlines((t as Tokens.Strong).tokens)}</strong>;
    case "em":
      return <em>{inlines((t as Tokens.Em).tokens)}</em>;
    case "del":
      return <del>{inlines((t as Tokens.Del).tokens)}</del>;
    case "codespan":
      return <code>{(t as Tokens.Codespan).text}</code>;
    case "br":
      return <br />;
    case "link": {
      const l = t as Tokens.Link;
      return (
        <a
          href={l.href}
          title={l.title ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
        >
          {inlines(l.tokens)}
        </a>
      );
    }
    case "image": {
      const img = t as Tokens.Image;
      return (
        <img
          src={img.href}
          alt={img.text}
          title={img.title ?? undefined}
          class="markdown-image"
        />
      );
    }
    case "html":
      return null;
    default:
      return "text" in t ? String((t as { text: string }).text) : null;
  }
}

type MarkdownJsxProps = {
  markdown?: string | null;
  class?: string;
  /** Render children only, no wrapper div. */
  bare?: boolean;
};

/** Render markdown inline as hono/jsx nodes (no dangerouslySetInnerHTML); bare omits the wrapper element. */
export function MarkdownJsx({ markdown, class: cls, bare }: MarkdownJsxProps) {
  if (!markdown) return null;
  const children = blocks(marked.lexer(markdown));
  if (bare) return <>{children}</>;
  return <div class={cls ?? "markdown-body"}>{children}</div>;
}

/** Extract plain text from markdown (for card excerpts). */
export function markdownToText(markdown: string | undefined | null): string {
  if (!markdown) return "";
  function extract(tokens: Token[]): string {
    return tokens.map((t) => {
      if ("tokens" in t && Array.isArray((t as { tokens?: Token[] }).tokens)) {
        return extract((t as { tokens: Token[] }).tokens);
      }
      if (t.type === "br") return " ";
      return "text" in t ? String((t as { text: string }).text) : "";
    }).join("");
  }
  return extract(marked.lexer(markdown));
}
