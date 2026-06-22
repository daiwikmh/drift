# DRIFT relay — the public rendezvous hub (WebSocket mesh + HTTP /providers +
# /infer proxy). Deploy this once; agents and the web connect to it.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Railway/Render inject $PORT; the relay binds it (falls back to 8787).
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "dist/cli.js", "relay"]
