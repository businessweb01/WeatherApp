FROM n8nio/n8n:latest

# Copy any custom configurations if needed
# COPY ./n8n-config /home/node/.n8n

EXPOSE 5678

CMD ["n8n", "start"]
