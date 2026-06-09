# --- Stage 1: Build Frontend ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --legacy-peer-deps
COPY client/ ./
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Stage 2: Production Server ---
FROM node:22-alpine
WORKDIR /app

# Install Backend dependencies
COPY package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy Backend source
COPY backend/ ./backend/

# Copy built frontend to the expected location for server.js
COPY --from=frontend-builder /app/client/dist ./client/dist

# Expose ports: 5000 (API/Web), 1884 (MQTT TCP), 1885 (MQTT WS)
EXPOSE 5000 1884 1885

ENV NODE_ENV=production

# Start server
CMD ["node", "backend/server.js"]
