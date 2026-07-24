# Stage 1: Build static assets
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

ARG VITE_API_URL
ARG VITE_API_BASE_URL
ARG VITE_SOCKET_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

COPY . .
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]