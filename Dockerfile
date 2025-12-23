FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY server.js ./
COPY src ./src
COPY public ./public

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Set environment variable for database path
ENV DB_PATH=/app/data/retirement.db

# Start the application
CMD ["npm", "start"]
