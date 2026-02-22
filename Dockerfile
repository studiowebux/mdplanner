FROM denoland/deno:2-alpine

WORKDIR /app

COPY deno.json deno.lock main.ts ./
COPY src/ ./src/

RUN deno cache main.ts

VOLUME ["/data"]

EXPOSE 8003

CMD ["run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "main.ts", "/data"]
