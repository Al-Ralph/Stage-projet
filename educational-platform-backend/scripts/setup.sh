#!/bin/bash
echo "🎯 Setting up Educational Platform Backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create .env if not exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

# Install service dependencies
services=("api-gateway" "auth-service" "user-service" "course-service" "recommendation-service" "progress-service" "social-service" "notification-service")

for service in "${services[@]}"; do
    echo -e "${YELLOW}Installing dependencies for $service...${NC}"
    cd $service && npm install && cd ..
done

# Setup database
echo -e "${YELLOW}Setting up database...${NC}"
npm run prisma:generate
npm run prisma:migrate

# Create necessary directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p logs
mkdir -p uploads
mkdir -p models

echo -e "${GREEN}✨ Setup complete!${NC}"
echo -e "Run ${YELLOW}npm run dev${NC} to start the development server"