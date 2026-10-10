FROM node:22-alpine AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

ARG VITE_USE_MOCK=false
ARG VITE_API_URL=
ENV VITE_USE_MOCK=${VITE_USE_MOCK} \
    VITE_API_URL=${VITE_API_URL}

RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/vite.config.ts ./vite.config.ts

ENV BACKEND_URL=http://backend:8000

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
