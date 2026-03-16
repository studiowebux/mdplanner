import { marked, Renderer } from "marked";

const renderer = new Renderer();

renderer.image = ({ href, title, text }: {
  href: string;
  title?: string | null;
  text: string;
}) => {
  const titleAttr = title ? ` title="${title}"` : "";
  return `<img src="${href}"${titleAttr} alt="${text}" class="markdown-image">`;
};

renderer.link = ({ href, title, text }: {
  href: string;
  title?: string | null;
  text: string;
}) => {
  const titleAttr = title ? ` title="${title}"` : "";
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const langLabel = lang
    ? `<span class="code-language-label">${lang}</span>`
    : "";
  return `<div class="code-block">${langLabel}<button type="button" class="code-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.querySelector('code').textContent)">Copy</button><pre><code>${escaped}</code></pre></div>`;
};

marked.use({ renderer, gfm: true, breaks: true });

export function markdownToHtml(
  markdown: string | undefined | null,
): string {
  if (!markdown) return "";
  return marked.parse(markdown) as string;
}
