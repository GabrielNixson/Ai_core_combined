FROM node:20-alpine

WORKDIR /app

# 1. Setup and compile MCP Server
COPY MCP_Server /app/MCP_Server
WORKDIR /app/MCP_Server
RUN npm install && npm run build

# 2. Setup and run LangGraph Backend
WORKDIR /app/LangGraph_backend
COPY LangGraph_backend/package*.json ./
RUN npm install

COPY LangGraph_backend/src ./src
COPY LangGraph_backend/tsconfig.json ./

# Make sure env config can read local/remote Ollama host
ENV OLLAMA_BASE_URL=http://host.docker.internal:11434

EXPOSE 5100

CMD ["npx", "tsx", "src/index.ts"]
