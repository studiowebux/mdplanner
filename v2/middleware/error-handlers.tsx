// SSR error handlers — app.notFound() and app.onError() with HTML rendering.

import type { ErrorHandler, NotFoundHandler } from "hono";
import { MainLayout } from "../components/layout/main.tsx";
import { ErrorPage } from "../views/components/error-page.tsx";
import { viewProps } from "./view-props.ts";
import { log } from "../singletons/logger.ts";
import type { AppVariables } from "../types/app.ts";

type Env = { Variables: AppVariables };

function wantsHtml(accept: string): boolean {
  return accept.includes("text/html");
}

const ERROR_STYLES = ["/css/views/error.css"];

export const notFoundHandler: NotFoundHandler<Env> = (c) => {
  const accept = c.req.header("Accept") ?? "";
  if (wantsHtml(accept)) {
    return c.html(
      <MainLayout
        title="Not Found"
        {...viewProps(c)}
        styles={ERROR_STYLES}
      >
        <ErrorPage
          status={404}
          title="Page Not Found"
          message="The page you're looking for doesn't exist or has been moved."
        />
      </MainLayout>,
      404,
    );
  }
  return c.json({ error: "NOT_FOUND", message: "Not found" }, 404);
};

export const errorHandler: ErrorHandler<Env> = (err, c) => {
  log.error(err.message, err);
  const accept = c.req.header("Accept") ?? "";
  if (wantsHtml(accept)) {
    return c.html(
      <MainLayout
        title="Error"
        {...viewProps(c)}
        styles={ERROR_STYLES}
      >
        <ErrorPage
          status={500}
          title="Something Went Wrong"
          message="An unexpected error occurred. Please try again later."
        />
      </MainLayout>,
      500,
    );
  }
  return c.json(
    { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    500,
  );
};
