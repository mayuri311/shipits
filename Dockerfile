# Use Node.js 20 Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY shipits/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY shipits/ ./

# Build the client
WORKDIR /app/client
RUN npm ci && npm run build

# Go back to root
WORKDIR /app

# Build the server
RUN npm run build

# Expose port
EXPOSE 3555

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]