FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for ts-node)
RUN npm install

# Copy all source files
COPY . .

# Expose the port
EXPOSE 3000

# Start the server using ts-node
CMD ["npx", "ts-node", "server.ts"]
