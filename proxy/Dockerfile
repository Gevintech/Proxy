# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --production

# Copy all source files
COPY . .

# Expose port (must match server)
EXPOSE 8080

# Start the app
CMD ["node", "server.js"]
