# Memorizer TypeScript - Airgapped AI Memory Service

A fully self-contained AI-powered memory service with embedded models, designed to run completely offline after installation.

## Features

- 🔒 **Fully Airgapped**: No internet calls after installation
- 🧠 **Embedded AI Models**: Bundled nomic-embed-text (768D embeddings) + TinyLlama (1.1B LLM)
- 💾 **Self-Contained Database**: LanceDB embedded vector database
- 🎨 **Modern UI**: React with light/dark theme support
- 🔍 **Semantic Search**: Vector similarity search with metadata filtering
- 📝 **Auto-Title Generation**: AI-powered title suggestions
- 🕒 **Full Versioning**: Complete audit trail with diff support
- 🔗 **Knowledge Graph**: Memory relationships and connections
- 🤖 **MCP Integration**: Model Context Protocol server for AI agents

## Quick Start

```bash
# Install and run
npx @memorizer/server start

# Or install globally
npm install -g @memorizer/server
memorizer start
```

On first run, models (~920MB) will be downloaded to `~/.memorizer/models/`.

## Development

```bash
# Clone and install dependencies
git clone <repository>
cd memorizer-ts
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Project Structure

```
memorizer-ts/
├── packages/
│   ├── server/          # Backend (Fastify + LanceDB + AI models)
│   ├── web/             # Frontend (React + Vite)
│   └── shared/          # Shared TypeScript types
├── scripts/             # Build and migration scripts
└── turbo.json           # Monorepo build configuration
```

## Technology Stack

### Backend
- **Fastify** - Fast HTTP server
- **LanceDB** - Embedded vector database
- **Transformers.js** - Embedding model inference
- **node-llama-cpp** - LLM inference
- **BullMQ** - Background job processing
- **@modelcontextprotocol/sdk** - MCP server

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Zustand** - State management
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling

## Package Variants

### Online Variant (Default)
- **Package name**: `@memorizer/server`
- **Size**: ~10MB
- **Models**: Downloaded on first install to `~/.memorizer/models/`

### Offline Variant
- **Package name**: `@memorizer/server-offline`
- **Size**: ~1.4GB
- **Models**: Bundled in package (truly airgapped)

## CLI Commands

```bash
# Start server
memorizer start [--port 5000] [--data ~/.memorizer/data]

# Export data
memorizer export --output memories.json

# Import data
memorizer import --input memories.json

# Backup
memorizer backup --output backup.zip

# Admin operations
memorizer admin title-gen          # Generate missing titles
memorizer admin rebuild-index      # Rebuild vector indexes
```

## API Endpoints

### REST API
- `GET /api/memories` - List memories
- `POST /api/memories` - Create memory
- `GET /api/memories/:id` - Get memory by ID
- `PUT /api/memories/:id` - Update memory
- `DELETE /api/memories/:id` - Delete memory
- `POST /api/search` - Semantic search

### Web UI
- `http://localhost:5000/ui` - Web interface

### MCP Server
- Available via stdio or HTTP transport
- Compatible with Claude Desktop, Claude Code, and other MCP clients

## Configuration

Configuration is stored in `~/.memorizer/config.json` or via environment variables:

```bash
# Server
MEMORIZER_PORT=5000
MEMORIZER_DATA_PATH=~/.memorizer/data

# Models
MEMORIZER_MODEL_PATH=~/.memorizer/models
```

## Performance

- **Embedding generation**: <100ms per 512 tokens
- **Vector search**: <50ms for 10k memories
- **Title generation**: <10s per memory
- **Memory footprint**: ~2GB (models + runtime)

## Migration from v1 (.NET/PostgreSQL)

See [MIGRATION.md](./MIGRATION.md) for detailed migration guide from the .NET version.

## License

MIT

## Credits

Built with:
- [LanceDB](https://lancedb.com/) - Embedded vector database
- [Transformers.js](https://huggingface.co/docs/transformers.js) - ML models in JS
- [node-llama-cpp](https://withcatai.github.io/node-llama-cpp/) - LLM inference
- [Model Context Protocol](https://modelcontextprotocol.io/) - AI agent integration
