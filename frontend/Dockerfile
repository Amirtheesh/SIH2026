FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy application files
COPY . .

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED 1

# Expose the port Next.js runs on
EXPOSE 3000

# Default command for development
CMD ["npm", "run", "dev"]
