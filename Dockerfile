# syntax=docker/dockerfile:1
FROM denoland/deno:alpine-2.6.10

RUN addgroup -S mdplanner && adduser -S mdplanner -G mdplanner \
    && mkdir -p /data /backups \
    && chown mdplanner:mdplanner /data /backups

WORKDIR /app

COPY deno.json deno.lock ./
COPY v2/ ./v2/

# BuildKit inline cache: persists the Deno module store across builds so
# re-runs of deno cache skip network downloads when deps haven't changed.
RUN --mount=type=cache,target=/home/mdplanner/.cache/deno \
    DENO_DIR=/home/mdplanner/.cache/deno deno cache v2/bin.ts

USER mdplanner

VOLUME ["/data"]

EXPOSE 8003

ENTRYPOINT ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "v2/bin.ts"]
CMD ["/data"]
