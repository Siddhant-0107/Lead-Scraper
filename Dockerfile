FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
    libxkbcommon0 libxrandr2 xdg-utils && rm -rf /var/lib/apt/lists/*
RUN npm ci
COPY . .
ENV PUPPETEER_HEADLESS=true
EXPOSE 3000
CMD ["npm", "start"]
