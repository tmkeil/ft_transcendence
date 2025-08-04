# services/frontend/Dockerfile

# stage1: builder
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json ./

RUN npm install

COPY src/ ./src/

COPY public/ ./public/

COPY src/db_web_api.js db_web_api.js

RUN npm run build

# stage2: production / serving
FROM nginx:stable-alpine

COPY --from=builder /app/dist/ /usr/share/nginx/html/

EXPOSE 80