// Render a Hono JSX component to an HTML string.
// Hono JSX returns HtmlEscapedString (Promise<string>).
export async function renderToHtml(jsx: unknown): Promise<string> {
  return await (jsx as Promise<string>);
}
