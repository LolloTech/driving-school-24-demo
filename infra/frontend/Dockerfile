FROM docker.io/library/node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html backoffice.html ./
COPY scripts/environment.mjs scripts/environment.d.mts ./scripts/
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=$VITE_BASE_PATH
COPY src ./src
RUN npm run build

FROM scratch
COPY --from=build /app/dist /dist
