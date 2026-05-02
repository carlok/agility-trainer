# syntax=docker/dockerfile:1.6
# Podman/Docker BuildKit: bind-mount build context at RUN time (no COPY of app sources).
# Runtime image is vanilla nginx — mount the project at run: see README.

FROM docker.io/node:22-alpine AS test
RUN --mount=type=bind,source=.,target=/src,readonly \
    --mount=type=tmpfs,target=/tmp/build \
    set -eux; \
    cd /tmp/build; \
    cp /src/package.json /src/package-lock.json /src/vitest.config.js .; \
    cp -r /src/js ./js; \
    cp -r /src/tests ./tests; \
    npm ci --ignore-scripts; \
    npm test; \
    npm run test:coverage

FROM docker.io/nginx:1.27-alpine AS runtime
EXPOSE 80
