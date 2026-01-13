FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies and reinstall only production dependencies
RUN npm prune --production && npm cache clean --force

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads

# Copy and make startup script executable
COPY start.sh ./
RUN chmod +x start.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application using the startup script
CMD ["./start.sh"]

