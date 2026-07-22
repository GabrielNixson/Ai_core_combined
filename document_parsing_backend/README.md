# Document Processing & RAG Agent Framework

Production-grade, highly resilient Document Ingestion, Parsing, Semantic Search, and RAG Agent framework built with Node.js, TypeScript, Express, BullMQ, Redis, MongoDB, and Qdrant.

---

## 🏗️ Architecture

```
                    Client
                      │
                      ▼
              API Gateway (Future)
                      │
                      ▼
                Express Server
                      │
      ┌───────────────┼────────────────┐
      ▼               ▼                ▼
 Document APIs    Agent APIs      Health APIs
      │
      ▼
 Business Services
      │
      ▼
Repositories / Workers / Queues
      │
      ▼
MongoDB / Redis / Qdrant / LLM
```

- **API Layer**: Express.js server providing endpoints for uploading documents, starting ingestion pipelines, doing semantic search (RAG), checking agent status, and triggering health/metrics probes.
- **Asynchronous Queue Layer**: Powered by BullMQ and backed by Redis. Split into three serial queues for document chunking, embedding generation, and vector database synchronization.
- **Worker Layer**: Resilient, concurrent background workers that pop tasks from Redis, write progress state to MongoDB, and push down-chain processing jobs.
- **Datastores**:
  - **MongoDB**: Stores document metadata, processing status, extracted text chunks, and conversational agent memory.
  - **Redis**: Functions as the fast message-broker for BullMQ and the store backend for distributed HTTP rate limiting.
  - **Qdrant**: High-performance vector database used to store floating-point embeddings and perform semantic vector searches.
  - **OpenAI (LLM)**: Handles embedding vector generation (text-embedding-3-small) and RAG/Agent reasoning (gpt-4o-mini).

---

## ⚙️ Environment Variables Reference

A centralized validation module runs on startup and crashes the application if required keys are missing or invalid. Configure the following variables in a `.env` file:

### App & Server
* `NODE_ENV`: Application mode (`development` | `production` | `test`). Defaults to `development`.
* `PORT`: Server port. Defaults to `3000`.
* `CORS_ORIGIN`: CORS allowed origins. Defaults to `*`.
* `RATE_LIMIT_WINDOW_MS`: Rate limiting window size. Defaults to `900000` (15 mins).
* `RATE_LIMIT_MAX`: Max requests allowed per window per IP. Defaults to `100`.
* `REQUEST_SIZE_LIMIT`: Max size limit for HTTP payload. Defaults to `50mb`.

### MongoDB
* `MONGODB_URI`: MongoDB connection string. Defaults to `mongodb://127.0.0.1:27017/document_processor`.
* `ENABLE_TRANSACTIONS`: Set to `true` to wrap repository database writes in transactions. Defaults to `false`.

### Redis & Queues
* `REDIS_HOST`: Redis host. Defaults to `127.0.0.1`.
* `REDIS_PORT`: Redis port. Defaults to `6379`.
* `REDIS_PASSWORD`: Redis connection password (optional).
* `WORKER_CONCURRENCY`: Degree of task parallelism per worker thread. Defaults to `1`.
* `MAX_RETRIES`: Number of attempts before marking jobs as failed. Defaults to `3`.
* `RETRY_DELAY`: Milliseconds between retry backoffs. Defaults to `5000`.
* `QUEUE_PREFIX`: Namespace prefix for BullMQ queues. Defaults to `doc_processing`.

### OpenAI / LLM & Embeddings
* `OPENAI_API_KEY`: API key for OpenAI (required).
* `EMBEDDING_PROVIDER`: Ingestion vectorizer provider. Defaults to `openai`.
* `EMBEDDING_MODEL`: Embedding generator model. Defaults to `text-embedding-3-small`.
* `EMBEDDING_BATCH_SIZE`: Ingestion batching chunks limit. Defaults to `100`.
* `EMBEDDING_REQUEST_TIMEOUT`: Timeout for OpenAI calls in ms. Defaults to `30000`.

### Qdrant Vector DB
* `QDRANT_HOST`: Qdrant REST host address. Defaults to `http://localhost:6333`.
* `QDRANT_API_KEY`: Api key authentication for Qdrant (optional).
* `QDRANT_COLLECTION_NAME`: Collection storage name. Defaults to `documents`.
* `QDRANT_VECTOR_DIMENSIONS`: Dimension size of vectors. Defaults to `1536`.
* `QDRANT_DISTANCE_METRIC`: Metric algorithm (`Cosine` | `Euclidean` | `Dot`). Defaults to `Cosine`.

### Logging & Observability
* `LOG_LEVEL`: Logs granularity (`fatal` | `error` | `warn` | `info` | `debug` | `trace`). Defaults to `info`.
* `LOG_FORMAT`: Format style (`json` | `pretty`). Set to `json` in production to output structured logs.

---

## 🛠️ Queues & Workers Ingestion Pipeline

The platform splits document ingestion into three stages to prevent memory exhaustion and enable horizontal scaling:

```
Upload API 
   │
   ▼
[Document Queue] ────► DocumentWorker (Extracts text and generates chunks)
   │
   ▼
[Embedding Queue] ───► EmbeddingWorker (Generates floating-point vector embeddings)
   │
   ▼
[Vector Sync Queue] ─► VectorSyncWorker (Upserts vectors and metadata to Qdrant)
```

- **Document Processing**: Validates file types (strict PDF checks) and writes to disk. A job is enqueued in the `Document Queue`. The `DocumentWorker` extracts the text (with OCR fallback) and splits it into logical chunks.
- **Embedding Generation**: The `EmbeddingWorker` batches chunks, calls the OpenAI embedding model, and saves the resulting float array back to MongoDB.
- **Vector Synchronization**: The `VectorSyncWorker` batches vectors and synchronizes them to Qdrant. The document status is updated to `INDEXED` (100% progress), making it searchable.

### Queue Resilience & Recovery
- **Graceful Shutdown**: The worker manager handles `SIGTERM` and `SIGINT` signals, pausing the queues first, completing in-progress jobs, closing MongoDB/Redis pools cleanly, and exiting without losing state.
- **Exponential Backoff**: Jobs failed due to rate limits or intermittent API network glitches automatically retry based on `RETRY_DELAY` with exponential backoffs.

---

## 🤖 RAG & LangGraph Workflows

### Retrieval Engine & RAG
- Queries submitted to `/rag/ask` are vectorized and compared against Qdrant collection embeddings.
- Retainer features include top-K filtering, similarity threshold checks, and context chunk parsing.
- The retrieved context is formatted into a RAG template prompt, and gpt-4o-mini generates the final response.

### LangGraph AI Orchestration
- The AI Agent compiles a state graph containing nodes: `startNode`, `intentNode`, `planningNode`, `toolSelectionNode`, `toolExecutionNode`, `contextValidationNode`, `llmNode`, `responseNode`, and `endNode`.
- Uses custom conversation memory providers to persist conversation history in MongoDB across thread executions.

---

## 🔍 Request Correlation & Structured Logging

### Structured Logging
All logs are structured using Winston. When `LOG_FORMAT=json` is active:
- Logs are output as standardized JSON lines.
- Contain `timestamp`, log `level`, execution `service`, and context fields.
- Include execution times (`executionTimeMs`) and full stack traces for errors.

### Request Correlation
- Incoming REST API queries are intercepted by the `correlationMiddleware`.
- A unique `requestId` and `correlationId` are extracted from incoming headers (`x-request-id`, `x-correlation-id`) or generated as a fresh UUID.
- These IDs are stored inside Node.js `AsyncLocalStorage`.
- When logging, the Winston formatter retrieves the active context IDs and appends them to the JSON output.
- When jobs are added to BullMQ, the correlation IDs are stored in the job payload, allowing workers to recreate the context and maintain log traces across system boundaries.

---

## 🚀 Deployment

### Local/Development Run
1. Configure environment variables in `.env`.
2. Start the local database dependencies (MongoDB, Redis, Qdrant).
3. Run the development server (automatically compiles and watches files):
   ```bash
   npm run dev
   ```

### Production Deployment via Docker Compose
Run the entire production stack instantly with pre-configured container configurations:
```bash
docker-compose up --build -d
```
This starts:
- **Express Backend Application** (Node container serving HTTP on port 3000 and executing workers)
- **MongoDB** (Persisting document collections)
- **Redis** (Message-broker queuing and rate limiter datastore)
- **Qdrant** (Vector indexing engine)

---

## 🩺 Monitoring, Metrics & Swagger Docs

- **Liveness Probe**: `GET /health/live` (Quick check if the Express container is up).
- **Readiness Probe**: `GET /health/ready` (Detailed health report validating active connections to MongoDB, Redis, Qdrant, and worker service loops).
- **System Metrics**: `GET /health/metrics` (Realtime JSON report containing process memory, system load, queue size lengths, latency charts, and pipeline successes).
- **Interactive Swagger Documentation**: Open `http://localhost:3000/api-docs` in a browser to review, test, and authenticate API schemas.

---

## ❓ Troubleshooting

### Connection Refused (Qdrant or Redis)
- Verify that Qdrant/Redis are running (`docker ps`).
- Check host configurations in `.env`. If running backend code outside Docker but databases inside Docker, use `127.0.0.1` instead of `mongodb` or `qdrant`.

### BullMQ: `maxRetriesPerRequest` Error
- BullMQ requires that standard `ioredis` instances do not have `maxRetriesPerRequest` configured as a number. Ensure it is explicitly set to `null` in the Redis options wrapper.

### Process Crashes on Startup
- Review console errors. The application will immediately exit on startup if env validators fail (e.g. invalid port formats or empty database endpoints). Check the `Zod` output stack.
