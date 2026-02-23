FROM python:3.11-slim

# Build tools needed by pkuseg (Cython extension)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh

WORKDIR /app

# Use python3 directly (deps are pip-installed globally).
# Override with PYTHON_EXEC="uv run python" for local dev outside Docker.
ENV PYTHON_EXEC=python3

# ── Python dependencies ──────────────────────────────────────────────────────
# Step 1: numpy + setuptools first — pkuseg requires numpy at build time
RUN pip install --no-cache-dir numpy setuptools

# Step 2: PyTorch with CUDA 12.1 support
#   On a machine without an NVIDIA GPU (macOS, CPU-only Linux) torch will still
#   install but device detection in voice_synthesizer.py falls back to CPU.
#   To build without CUDA (smaller image), replace this line with:
#     RUN pip install --no-cache-dir torch torchaudio
RUN pip install --no-cache-dir torch torchaudio \
    --index-url https://download.pytorch.org/whl/cu121

# Step 3: remaining dependencies
RUN pip install --no-cache-dir "chatterbox-tts>=0.1.3" "pkuseg==0.0.25"

# ── App files ─────────────────────────────────────────────────────────────────
COPY deno.json server.ts voice_synthesizer.py main.py ./

# Pre-warm Deno module cache so startup is instant
RUN deno cache server.ts

# references/ is mounted at runtime from docker-compose (voice WAV files)
# output/ is used as a temp dir for generated audio
RUN mkdir -p references output

EXPOSE 8001

CMD ["deno", "run", "-A", "server.ts"]
