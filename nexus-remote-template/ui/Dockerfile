# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

# npm cache must live somewhere writable in CI/rootless builders.
ENV npm_config_cache=/tmp/.npm

COPY package.json package-lock.json* ./
RUN npm ci --cache /tmp/.npm || npm install --cache /tmp/.npm

COPY . .

# CRITICAL: absolute publicPath for this remote's origin, or lazy chunks 404 in the host.
# Pass at build time, e.g.:
#   docker build --build-arg PUBLIC_PATH=https://ca-demo-myapp-ui.<suffix>…/ .
ARG PUBLIC_PATH=auto
ARG API_SCOPE
ARG API_BASE
ENV PUBLIC_PATH=$PUBLIC_PATH \
    API_SCOPE=$API_SCOPE \
    API_BASE=$API_BASE

RUN npm run build

# ── Runtime stage (nginx, CORS-enabled) ──────────────────────────────────────
FROM nginx:1.27-alpine

# R6 — CORS Access-Control-Allow-Origin is scoped at RUNTIME via ALLOWED_ORIGIN.
# The nginx image's built-in entrypoint runs envsubst over /etc/nginx/templates/*.template
# and writes the result to /etc/nginx/conf.d/. Default "*" is DEV-ONLY; production
# deploys MUST override this with the NEXUS host origin (see deployment/containerapp.bicep).
ARG ALLOWED_ORIGIN="*"
ENV ALLOWED_ORIGIN=$ALLOWED_ORIGIN
# Restrict envsubst to ONLY our variable so nginx's own $ directives survive.
ENV NGINX_ENVSUBST_FILTER="ALLOWED_ORIGIN"

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Container Apps expects the app to listen on 8080.
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
