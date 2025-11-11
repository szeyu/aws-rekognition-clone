FROM node:20-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Use npm ci for faster, reproducible installs with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY tsconfig.json ./
COPY src ./src

# Download ONNX models directly during build
RUN mkdir -p models \
  && curl -L -o models/arcface.onnx https://huggingface.co/onnxmodelzoo/arcfaceresnet100-8/resolve/main/arcfaceresnet100-8.onnx \
  && curl -L -o models/scrfd.onnx https://huggingface.co/crj/dl-ws/resolve/main/scrfd_2.5g.onnx

RUN npm run build

FROM node:20-slim

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/models ./models
COPY package*.json ./

# Use npm ci --only=production with cache mount for faster installs
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

ENV DATABASE_URL=postgres://postgres:postgres@db:5432/face_db

EXPOSE 3000

CMD ["node", "dist/server.js"]
