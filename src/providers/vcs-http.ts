// Shared VCS REST HTTP client.
//
// GitHub and Gitea expose the same REST shape, so their per-verb fetch helpers
// (get/post/postEmpty/patch/put) were byte-identical apart from the base URL,
// the auth/accept headers, and the "GitHub"/"Gitea" error-label prefix. One
// source of truth lives here; each provider owns only its base URL, headers,
// and label. Provider-specific requests (e.g. Gitea's bespoke merge) stay in
// their own file.

/** REST client for a single VCS host: shared error handling, per-verb helpers. */
export class VcsHttpClient {
  constructor(
    private readonly apiBase: string,
    private readonly headersFn: () => HeadersInit,
    private readonly label: string,
  ) {}

  private async parse(res: Response): Promise<unknown> {
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${this.label} API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  get(path: string): Promise<unknown> {
    return fetch(`${this.apiBase}${path}`, { headers: this.headersFn() })
      .then((res) => this.parse(res));
  }

  post(path: string, body: unknown): Promise<unknown> {
    return this.send("POST", path, body).then((res) => this.parse(res));
  }

  patch(path: string, body: unknown): Promise<unknown> {
    return this.send("PATCH", path, body).then((res) => this.parse(res));
  }

  put(path: string, body: unknown): Promise<unknown> {
    return this.send("PUT", path, body).then((res) => this.parse(res));
  }

  /** POST to endpoints that return 201/202/204 with no body. */
  async postEmpty(path: string, body?: unknown): Promise<void> {
    const res = await this.send("POST", path, body);
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${this.label} API error ${res.status}: ${text}`);
    }
    await res.body?.cancel();
  }

  private send(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    return fetch(`${this.apiBase}${path}`, {
      method,
      headers: { ...this.headersFn(), "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
}
