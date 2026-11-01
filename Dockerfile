# syntax=docker/dockerfile:1
# Tecken: one Node process serving the app, the media and the API.
# Base images are pinned by multi-arch index digest (amd64 + arm64).

FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS build
WORKDIR /src
COPY . .
# Install exactly the lockfile, build every workspace through Lerna (nx
# runs underneath it), then bundle the server to one ESM file and prebuild
# the validated content index next to it.
RUN npm ci \
    && npx nx --version \
    && npx lerna run build --skip-nx-cache \
    && npm run bundle --workspace services/api

FROM node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS runtime
LABEL org.opencontainers.image.title="tecken" \
      org.opencontainers.image.description="Recorded Swedish Sign Language for everyday phrases, with provenance shown before play." \
      org.opencontainers.image.source="https://github.com/ludvigalden/tecken-demo" \
      org.opencontainers.image.licenses="MIT AND CC-BY-4.0 AND CC-BY-SA-3.0 AND CC-BY-3.0"
ENV NODE_ENV=production \
    TECKEN_ROOT=/app
WORKDIR /app
# Only what the server serves, plus every licence notice and the REUSE
# annotations, so each redistributed copy carries its licences.
COPY --from=build /src/services/api/dist/server.mjs /src/services/api/dist/content-index.json dist/
COPY --from=build /src/apps/web/dist apps/web/dist
COPY --from=build /src/apps/storybook/storybook-static apps/storybook/storybook-static
COPY --from=build /src/content/media content/media
COPY --from=build /src/LICENSES LICENSES
COPY --from=build /src/REUSE.toml REUSE.toml
# Warm V8's compile cache at build time, owned by the runtime user: the
# server's first 200 after spawn drops from a 265 ms to a 223 ms median
# (measured 2026-10-31, docs/performance/README.md).
ENV NODE_COMPILE_CACHE=/app/.node-compile-cache
RUN mkdir -p /app/.node-compile-cache && chown 1000:1000 /app/.node-compile-cache
# The image's unprivileged `node` user, by uid:gid (hadolint DL3066).
USER 1000:1000
RUN node --input-type=module -e "import('/app/dist/server.mjs').then(async () => { (await import('node:module')).flushCompileCache(); process.exit(0); })"
EXPOSE 8080
CMD ["node", "dist/server.mjs"]
