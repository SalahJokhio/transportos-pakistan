# ── Build stage ─────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Runtime stage ───────────────────────────────────────────────────
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# devDeps are needed for the ts-node migration runner at boot; keep them.
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/libs ./libs
COPY --from=build /app/apps ./apps
COPY --from=build /app/tsconfig*.json ./
RUN mkdir -p uploads
EXPOSE 3000
# Apply pending migrations, then serve.
CMD ["sh", "-c", "npm run migration:run && npm run start:prod"]
