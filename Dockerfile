FROM node:18-alpine

# Install n8n globally
RUN npm install -g n8n

# Set working directory
WORKDIR /app

# Set environment variables
ENV N8N_PORT=10000
ENV N8N_HOST=0.0.0.0

# Expose port
EXPOSE 10000

# Start n8n
CMD ["n8n", "start"]
