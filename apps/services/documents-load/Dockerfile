FROM node:24-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /workspace
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm nx run @accounterbro/documents-service:build

ENV NODE_ENV="production"

CMD ["node", "apps/services/documents/dist/main.js"]
