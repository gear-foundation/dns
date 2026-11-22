FROM node:24.22.3-alpine3.24@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build \
 && npm prune --omit=dev


FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:6abfcb367ebc291572c774c1592a986be2ab26a2486f73093401327495a5962a

ENV NODE_ENV=production

WORKDIR /app

COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 4000
CMD ["dist/main.js"]
