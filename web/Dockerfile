# Production web image (dev runs `pnpm dev` on the host). Node matches the dev host's major.
FROM node:26-slim AS build
RUN npm install -g pnpm@12.4.2
WORKDIR /web
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Inlined at build: NEXT_PUBLIC_* and the rewrites in next.config.ts
ARG BUILD_ID
ARG NEXT_PUBLIC_IMG_BASE=/img
ARG API_URL=http://api:8000
ARG AGENT_URL=http://agent:8001
ARG SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_IMG_BASE=$NEXT_PUBLIC_IMG_BASE API_URL=$API_URL AGENT_URL=$AGENT_URL SITE_URL=$SITE_URL
RUN BUILD_ID=${BUILD_ID:-$(date +%s)} pnpm build

FROM node:26-slim
WORKDIR /web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build /web/.next/standalone ./
COPY --from=build /web/.next/static ./.next/static
COPY --from=build /web/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
