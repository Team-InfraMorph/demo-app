FROM node:22-bookworm-slim AS base

ARG SOURCE_REVISION
LABEL org.opencontainers.image.title="InfraMorph demo-app"
LABEL org.opencontainers.image.revision="${SOURCE_REVISION}"
LABEL io.inframorph.target="aws"

ENV NODE_ENV=production \
    PORT=3000 \
    HOME=/home/node

WORKDIR /app

RUN DEBIAN_FRONTEND=noninteractive apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts --no-audit --no-fund \
    && npm install --no-save --package-lock=false --ignore-scripts --no-audit --no-fund prisma@6.19.3
RUN ./node_modules/.bin/prisma generate

FROM base AS runtime

COPY certs/ap-northeast-2-bundle.pem /etc/ssl/certs/aws-rds-ap-northeast-2-bundle.pem
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/aws-rds-ap-northeast-2-bundle.pem

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma/migrations ./prisma/migrations
COPY src ./src
RUN chown -R node:node /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "src/bootstrap.js"]
