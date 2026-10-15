# syntax=docker/dockerfile:1

FROM node:22.23.3-bookworm-slim AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,id=embers-p-npm,target=/root/.npm,sharing=locked \
    npm ci --ignore-scripts --no-audit --no-fund

FROM dependencies AS source
COPY index.html background.html vite.config.ts tsconfig*.json ./
COPY src/ ./src/
COPY types/ ./types/
COPY scripts/ ./scripts/
COPY public/ ./public/

FROM source AS tests
RUN npm test

FROM tests AS build
ARG VITE_ASSET_LOCATION
# An empty variable overrides the application's default /Library URL, so unset it.
RUN --mount=type=cache,id=embers-p-library,target=/app/public/Library,sharing=locked \
    if [ -z "$VITE_ASSET_LOCATION" ]; then unset VITE_ASSET_LOCATION; fi \
    && npm run assets:spells \
    && npm run build

# Export only the static site, without Node, dependencies, or application source.
FROM scratch AS artifact
COPY --from=build /app/dist/ /
