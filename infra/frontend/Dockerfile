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

FROM docker.io/library/nginx:1.28-alpine
COPY --from=build /app/dist /dist
COPY infra/frontend/nginx.conf.template /etc/nginx/frontend.conf.template
USER nginx
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "envsubst '$APP_BASE_PATH' < /etc/nginx/frontend.conf.template > /tmp/nginx.conf && exec nginx -c /tmp/nginx.conf -g 'daemon off;'"]
