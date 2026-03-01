# syntax=docker/dockerfile:1
FROM denoland/deno:alpine-2.6.10

WORKDIR /app

COPY deno.json deno.lock main.ts ./
COPY src/ ./src/

# BuildKit inline cache: persists the Deno module store across builds so
# re-runs of deno cache skip network downloads when deps haven't changed.
RUN --mount=type=cache,target=/root/.cache/deno deno cache main.ts

VOLUME ["/data"]

EXPOSE 8003

ENTRYPOINT ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "main.ts"]
CMD ["/data"]
