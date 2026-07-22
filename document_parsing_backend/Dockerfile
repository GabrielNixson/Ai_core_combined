# Stage 1: Build TypeScript compiler output
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create upload directories and set non-root ownership permissions
RUN mkdir -p uploads/original && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "dist/server.js"]
