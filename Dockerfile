# syntax=docker/dockerfile:1

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
ARG NEXT_PUBLIC_BACKEND_URL=https://api.lynxglobal.com.ng
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
