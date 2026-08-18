#!/bin/bash
set -e

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}Starting MedChain Full Stack System${NC}"
echo -e "${BLUE}=======================================${NC}"

# Check for virtual environment
if [ ! -d ".venv" ]; then
    echo "Virtual environment (.venv) not found. Please run setup first."
    exit 1
fi

echo -e "${GREEN}Starting FastAPI Backend on port 8000...${NC}"
# Run backend in the background
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

echo -e "${GREEN}Starting Next.js Frontend on port 3000...${NC}"
# Run frontend in the background
cd frontend
npm run dev &
FRONTEND_PID=$!

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}System is running!${NC}"
echo -e "Backend: http://localhost:8000 (Docs: http://localhost:8000/docs)"
echo -e "Frontend: http://localhost:3000"
echo -e "${BLUE}Press Ctrl+C to stop both servers.${NC}"
echo -e "${BLUE}=======================================${NC}"

# Trap Ctrl+C to kill background processes
trap "echo -e '\nStopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit 0" SIGINT SIGTERM

# Wait indefinitely until interrupted
wait
