#!/bin/bash

# Create .env file
cat > .env << EOL
# Application port
PORT=3000

# MongoDB connection - update if using a different MongoDB instance
MONGODB_URI=mongodb://localhost:27017/buenro-data
EOL

echo "Created .env file. No AWS credentials required since the bucket is public."
echo ""
echo "Starting MongoDB using Docker..."
docker-compose up -d mongo

echo ""
echo "MongoDB is running. Now start the application with:"
echo "npm run start:dev" 