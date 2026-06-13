// Markdown → JSX. Uses marked.lexer to produce a JSX tree so Hono JSX
// handles all escaping. Raw HTML tokens are dropped (XSS vector).

import type { Child } from "hono/jsx";
import { marked } from "marked";
import type { Token, Tokens } from "marked";

/**
 * Optional transform applied to prose text leaves (not code/codespan) so
 * callers can linkify @mentions, task ids, commit hashes, etc. inside the
 * rendered markdown. Undefined = emit the raw string (default behaviour).
 */
type TextRender = (text: string) => Child;

function applyText(text: string, render?: TextRender): Child {
  return render ? render(text) : text;
}

function blocks(tokens: Token[], render?: TextRender): Child[] {
  return tokens.map((t) => block(t, render));
}

function headingBlock(h: Tokens.Heading, render?: TextRender): Child {
  const c = inlines(h.tokens, render);
  if (h.depth === 1) return <h1>{c}</h1>;
  if (h.depth === 2) return <h2>{c}</h2>;
  if (h.depth === 3) return <h3>{c}</h3>;
  if (h.depth === 4) return <h4>{c}</h4>;
  if (h.depth === 5) return <h5>{c}</h5>;
  return <h6>{c}</h6>;
}

function codeBlock(c: Tokens.Code): Child {
  return (
    <div class="code-block">
      <div class="code-block__header">
        {c.lang && <span class="code-block__lang">{c.lang}</span>}
        <button type="button" class="code-block__copy" data-action="copy-code">
          Copy
        </button>
      </div>
      <pre class="note-detail__code">
        <code class={c.lang ? `language-${c.lang}` : undefined}>{c.text}</code>
      </pre>
    </div>
  );
}

function listBlock(l: Tokens.List, render?: TextRender): Child {
  const items = l.items.map((item, i) => (
    <li key={i}>{blocks(item.tokens, render)}</li>
  ));
  return l.ordered
    ? <ol start={l.start || undefined}>{items}</ol>
    : <ul>{items}</ul>;
}

function tableBlock(tb: Tokens.Table, render?: TextRender): Child {
  return (
    <table>
      <thead>
        <tr>
          {tb.header.map((cell, i) => (
            <th key={i} scope="col">{inlines(cell.tokens, render)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tb.rows.map((row) => (
          <tr>
            {row.map((cell, ci) => (
              <td key={ci}>{inlines(cell.tokens, render)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function block(t: Token, render?: TextRender): Child {
  switch (t.type) {
    case "space":
      return null;
    case "paragraph":
      return <p>{inlines((t as Tokens.Paragraph).tokens, render)}</p>;
    case "heading":
      return headingBlock(t as Tokens.Heading, render);
    case "blockquote":
      return (
        <blockquote>
          {blocks((t as Tokens.Blockquote).tokens, render)}
        </blockquote>
      );
    case "hr":
      return <hr />;
    case "code":
      return codeBlock(t as Tokens.Code);
    case "list":
      return listBlock(t as Tokens.List, render);
    case "table":
      return tableBlock(t as Tokens.Table, render);
    case "text": {
      const tx = t as Tokens.Text;
      return tx.tokens
        ? <>{inlines(tx.tokens, render)}</>
        : applyText(tx.text, render);
    }
    case "html":
      return null;
    default:
      return null;
  }
}

function inlines(tokens: Token[], render?: TextRender): Child[] {
  return tokens.map((t) => inline(t, render));
}

function inline(t: Token, render?: TextRender): Child {
  switch (t.type) {
    case "text": {
      const tx = t as Tokens.Text;
      return tx.tokens
        ? <>{inlines(tx.tokens, render)}</>
        : applyText(tx.text, render);
    }
    case "escape":
      return (t as Tokens.Escape).text;
    case "strong":
      return <strong>{inlines((t as Tokens.Strong).tokens, render)}</strong>;
    case "em":
      return <em>{inlines((t as Tokens.Em).tokens, render)}</em>;
    case "del":
      return <del>{inlines((t as Tokens.Del).tokens, render)}</del>;
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
          {inlines(l.tokens, render)}
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
  /** Transform prose text leaves (e.g. linkify @mentions/task ids). */
  renderText?: TextRender;
};

/**
 * Convert literal escaped newline sequences (`\n`, `\r\n` as backslash-n text)
 * into real newlines. Some content was stored with escaped newlines instead of
 * real ones (e.g. a description written as a single line `"a.\n\n## B"`), which
 * makes marked treat headings/lists as inline prose and renders a garbled run.
 * Scoped to newline escapes only — the observed failing construct.
 */
export function normalizeEscapedNewlines(s: string): string {
  return s.replace(/\\r\\n|\\n/g, "\n");
}

/** Render markdown inline as hono/jsx nodes (no dangerouslySetInnerHTML); bare omits the wrapper element. */
export function MarkdownJsx(
  { markdown, class: cls, bare, renderText }: MarkdownJsxProps,
) {
  if (!markdown) return null;
  const children = blocks(marked.lexer(markdown), renderText);
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
