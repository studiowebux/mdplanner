// Shared error page component — used by app.notFound() and app.onError().

import type { FC } from "hono/jsx";

type Props = {
  status: number;
  title: string;
  message: string;
};

export const ErrorPage: FC<Props> = ({ status, title, message }) => (
  <div class="error-page">
    <span class="error-page__status">{status}</span>
    <h1 class="error-page__title">{title}</h1>
    <p class="error-page__message">{message}</p>
    <a href="/" class="error-page__link">Go Home</a>
  </div>
);
