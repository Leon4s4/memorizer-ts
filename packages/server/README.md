# @memorizer/server

Backend server for Memorizer - Airgapped AI memory service.

## Features

- **LanceDB Storage**: Embedded vector database for memories
- **REST API**: Full CRUD operations for memories
- **Semantic Search**: Vector similarity search (embeddings in Phase 2)
- **Versioning**: Automatic version snapshots on updates
- **Relationships**: Knowledge graph connections between memories
- **MCP Server**: Model Context Protocol integration (Phase 5)

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Server will start at http://localhost:5000
```

### Production

```bash
# Build
npm run build

# Start
npm start

# Or run directly
node dist/cli.js start
```

## API Endpoints

### Health Check
- `GET /healthz` - Health check

### Statistics
- `GET /api/stats` - Get database statistics

### Memories
- `GET /api/memories` - List memories
  - Query params: `limit`, `offset`, `types`, `tags`
- `POST /api/memories` - Create memory
- `GET /api/memories/:id` - Get memory by ID
- `PUT /api/memories/:id` - Update memory
- `DELETE /api/memories/:id` - Delete memory

### Search
- `POST /api/search` - Semantic search
  - Body: `{ query, limit?, threshold?, types?, tags?, includeContent? }`

### Relationships
- `GET /api/memories/:id/relationships` - Get relationships
  - Query params: `direction` (outgoing, incoming, both)
- `POST /api/relationships` - Create relationship
  - Body: `{ from_memory_id, to_memory_id, type, score? }`

## CLI Commands

```bash
# Start server
memorizer start [options]

Options:
  -p, --port <port>        Port to listen on (default: 5000)
  -d, --data <path>        Data directory path
  -m, --models <path>      Models directory path
  --no-ui                  Disable web UI
  --log-level <level>      Log level (debug, info, warn, error)

# Export data (Phase 3)
memorizer export -o memories.json

# Import data (Phase 3)
memorizer import -i memories.json

# Backup (Phase 3)
memorizer backup -o backup.zip

# Admin commands (Phase 4)
memorizer admin title-gen
memorizer admin rebuild-index
memorizer admin purge-versions --keep 50
```

## Configuration

Environment variables:

```bash
MEMORIZER_PORT=5000
MEMORIZER_DATA_PATH=~/.memorizer/data
MEMORIZER_MODEL_PATH=~/.memorizer/models
MEMORIZER_CACHE_PATH=~/.memorizer/cache
MEMORIZER_ENABLE_UI=true
MEMORIZER_CORS_ORIGINS=http://localhost:5173
MEMORIZER_LOG_LEVEL=info
```

## Directory Structure

```
~/.memorizer/
├── data/           # LanceDB database files
├── models/         # AI models (Phase 2)
└── cache/          # Temporary files
```

## Testing

### Manual API Testing

```bash
# Create a memory
curl -X POST http://localhost:5000/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "type": "note",
    "content": {"text": "Hello World"},
    "text": "Hello World",
    "source": "test",
    "tags": ["test"]
  }'

# List memories
curl http://localhost:5000/api/memories

# Search (returns all for now, embeddings in Phase 2)
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "hello", "limit": 10}'

# Get stats
curl http://localhost:5000/api/stats
```

## Architecture

### Dependency Injection

Uses TSyringe for dependency injection:

```typescript
import { container } from 'tsyringe';
import { StorageService } from './services/storage.js';

const storage = container.resolve(StorageService);
```

### Storage Service

The StorageService is a singleton that handles all database operations:

- Memory CRUD
- Vector search
- Versioning
- Relationships
- Events

### Logging

Uses Pino for structured logging with pretty printing in development.

## Development

### Project Structure

```
src/
├── api/
│   └── routes.ts           # REST API routes
├── services/
│   └── storage.ts          # LanceDB storage service
├── utils/
│   ├── config.ts           # Configuration management
│   └── logger.ts           # Logging setup
├── server.ts               # Fastify server setup
└── cli.ts                  # CLI entry point
```

### Adding New Routes

```typescript
// In src/api/routes.ts
export async function registerRoutes(fastify: FastifyInstance) {
  const storage = container.resolve(StorageService);

  fastify.get('/api/my-route', async (request, reply) => {
    // Your handler
  });
}
```

## License

MIT
