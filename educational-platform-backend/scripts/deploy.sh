#!/bin/bash
echo "🚀 Deploying Educational Platform to Production"

# Check environment
if [ "$1" != "production" ]; then
    echo "❌ Please confirm production deployment: ./deploy.sh production"
    exit 1
fi

# Run tests
echo "🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Aborting deployment."
    exit 1
fi

# Build services
echo "🏗️ Building services..."
docker-compose -f docker-compose.prod.yml build

# Push to registry
echo "📦 Pushing to registry..."
docker-compose -f docker-compose.prod.yml push

# Deploy to Kubernetes
echo "☸️ Deploying to Kubernetes..."
kubectl apply -f kubernetes/

# Wait for rollout
echo "⏳ Waiting for rollout..."
kubectl rollout status deployment/api-gateway -n production

# Run health checks
echo "❤️ Running health checks..."
./scripts/health-check.sh

echo "✅ Deployment complete!"