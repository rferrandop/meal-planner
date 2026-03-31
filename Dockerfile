# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server-build
RUN apk add --no-cache python3 make g++
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ ./
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app

# Install production dependencies for the server
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev && cd ..

# Remove build tools after native modules are compiled
RUN apk del python3 make g++

# Copy built server
COPY --from=server-build /app/server/dist ./server/dist

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create data directory for SQLite
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_DIR=/data

EXPOSE 3001

CMD ["node", "server/dist/index.js"]
