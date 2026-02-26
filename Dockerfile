FROM denoland/deno:alpine-2.6.10

WORKDIR /app

COPY deno.json deno.lock main.ts ./
COPY src/ ./src/

RUN deno cache main.ts

VOLUME ["/data"]

EXPOSE 8003

ENTRYPOINT ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "main.ts"]
CMD ["/data"]
