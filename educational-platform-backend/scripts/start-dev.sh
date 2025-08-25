#!/bin/bash
echo "🚀 Starting Educational Platform Backend in Development Mode"

# Check dependencies
echo "📋 Checking dependencies..."
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required but not installed. Aborting." >&2; exit 1; }

# Start infrastructure
echo "🏗️ Starting infrastructure services..."
docker-compose up -d postgres redis mongodb elasticsearch rabbitmq

# Wait for services
echo "⏳ Waiting for services to be ready..."
./scripts/wait-for-it.sh localhost:5432 -- echo "✅ PostgreSQL is ready"
./scripts/wait-for-it.sh localhost:6379 -- echo "✅ Redis is ready"
./scripts/wait-for-it.sh localhost:27017 -- echo "✅ MongoDB is ready"
./scripts/wait-for-it.sh localhost:9200 -- echo "✅ Elasticsearch is ready"
./scripts/wait-for-it.sh localhost:5672 -- echo "✅ RabbitMQ is ready"

# Run migrations
echo "🗄️ Running database migrations..."
npm run prisma:migrate

# Start microservices
echo "🚀 Starting microservices..."
npm run dev

echo "✨ Educational Platform Backend is running!"
echo "📚 API Documentation: http://localhost:3000/api-docs"
echo "❤️ Health Check: http://localhost:3000/health"