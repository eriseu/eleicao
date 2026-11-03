FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --engine-strict=false

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Recebe os argumentos do Compose
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_R2_URL
ARG R2_ACCOUNT_ID
ARG R2_ACCESS_KEY_ID
ARG R2_SECRET_ACCESS_KEY
ARG R2_BUCKET
ARG R2_ENDPOINT

# Define como variáveis de ambiente para o build
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_R2_URL=${NEXT_PUBLIC_R2_URL}
ENV R2_ACCOUNT_ID=${R2_ACCOUNT_ID}
ENV R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
ENV R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
ENV R2_BUCKET=${R2_BUCKET}
ENV R2_ENDPOINT=${R2_ENDPOINT}

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
