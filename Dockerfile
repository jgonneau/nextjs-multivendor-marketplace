# syntax=docker/dockerfile:1

# Pin a specific Node 24 Alpine image rather than a rolling tag, so builds
# are reproducible. Bump this deliberately when you want to upgrade Node.
ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
WORKDIR /app
# Prisma's query engine links against OpenSSL at runtime; musl-based Alpine
# doesn't ship it by default, and its absence shows up as a confusing
# PrismaClientInitializationError rather than a clear "missing lib" error.
RUN apk add --no-cache openssl
RUN corepack enable

# ---- deps: install dependencies with the project's actual package manager
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder: generate the Prisma client for THIS platform, then build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Must run here (Alpine/musl), not in a different base image and copied in,
# or the compiled query engine binary won't match the runtime's libc/OpenSSL.
RUN pnpm db:generate
RUN pnpm build

# ---- runner: minimal production image, no source/devDependencies/CLI
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Belt-and-suspenders: Next's output-file-tracing usually picks this up
# automatically since it's a regular imported path (not a node_modules
# package), but Prisma's native engine binary is a known tracing edge case.
COPY --from=builder --chown=nextjs:nodejs /app/prisma/generated ./prisma/generated

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
