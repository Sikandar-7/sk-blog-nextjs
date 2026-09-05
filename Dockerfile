# Two stages: build the site with Node, ship it with nginx.
#
# Dokploy's "static" build type does not build anything — it generates a
# Dockerfile that copies an existing ./dist into nginx, which only works if the
# built output is committed to the repo. It isn't, and shouldn't be. So the
# build lives here instead, where it is explicit and reproducible.
#
# The final image carries nginx and static files only: no Node, no node_modules,
# no source. That is the whole point of the split.

FROM node:22-slim AS build
WORKDIR /app

# Dependencies first, so a content-only change reuses this layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Astro bakes PUBLIC_* into the output at build time — they are read here, not
# at runtime, so they have to arrive as build args. A container that starts
# fine with these missing is the failure mode to watch for: the pages render,
# and only the Supabase islands (login, comments, likes, editor) are dead.
ARG PUBLIC_SITE_URL
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_KEY
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL \
    PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL \
    PUBLIC_SUPABASE_KEY=$PUBLIC_SUPABASE_KEY

# Debian rather than Alpine for this stage: the OG-image step pulls in
# canvaskit-wasm and fetches fonts over the network, and glibc keeps that
# boring. The build image is thrown away, so its size does not matter.
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
