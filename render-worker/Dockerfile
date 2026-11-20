# syntax=docker/dockerfile:1
# MF-12D self-contained local render worker, never GitHub Actions.
FROM node:22-bookworm-slim
ENV DEBIAN_FRONTEND=noninteractive \
    CHROME_BIN=/usr/bin/chromium \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium ffmpeg python3 python3-pip python3-pil ca-certificates fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . /app
RUN cd studio && npm install --no-audit --no-fund \
    && cd ../render-worker && npm install --no-audit --no-fund
ENTRYPOINT ["node", "tools/studio-render.mjs"]
