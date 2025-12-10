# Memorizer TypeScript - AI Coding Agent Instructions

**Project**: Airgapped AI memory service with embedded models, semantic search, and MCP integration
**Architecture**: Monorepo (Turbo) with 3 packages: `server`, `web`, `shared`
**Tech Stack**: TypeScript, Fastify, React/Vite, LanceDB, Transformers.js, node-llama-cpp

## 🏗 Architecture Overview

### Core Components

- **Server** (`packages/server`) - Node.js + Fastify backend
  - API routes: memory CRUD, search, stats
  - Services: embedding (nomic-embed-text 768D), LLM (TinyLlama 1.1B), storage (LanceDB), diff tracking, optional BullMQ queue
  - MCP server: Model Context Protocol tools for Claude integration
  - CLI: entry point for server + MCP modes
  
- **Web** (`packages/web`) - React + Vite frontend
  - Pages: Index (list), Create, Search, View, Edit, Stats, Admin
  - Zustand stores for state, React Router for navigation
  - Tailwind CSS + Radix UI components
  
- **Shared** (`packages/shared`) - TypeScript types
  - Memory, SearchOptions, MCP tool types
  - MemoryVersion, MemoryEvent, MemoryRelationship types

### Data Flow

1. **User creates memory** → Server validates → Embedding service generates 768D vector → LanceDB stores
2. **User searches** → Semantic search via vector similarity → LanceDB returns results with metadata filtering
3. **User edits** → Diff service tracks changes → LanceDB stores new version + creates MemoryEvent audit trail
4. **Background jobs** (optional Redis) → BullMQ processes async title generation via TinyLlama LLM
5. **MCP tools** → Claude/LLM agents call memory tools directly for agent-driven operations

### Key Design Patterns

- **Singleton/DI**: Services use tsyringe for dependency injection (`@singleton() @injectable()`)
- **Vector search**: LanceDB supports semantic + metadata filtering in single query
- **Versioning**: Every edit creates immutable version record + MemoryEvent for audit trail
- **Graceful degradation**: Redis/BullMQ optional; server works without for core features
- **Airgapped**: All models bundled (348MB data), no runtime downloads except optional Redis

## 🔑 Critical Developer Workflows

### Development Setup

```bash
# Install dependencies (npm workspaces handle all packages)
npm install

# Start backend (Terminal 1)
cd packages/server && npm run dev    # Starts on http://localhost:5000

# Start frontend (Terminal 2)
cd packages/web && npm run dev       # Starts on http://localhost:5173, proxies API to :5000

# Build production
npm run build                        # Builds all packages via Turbo
```

### Key Commands

| Command | Effect |
|---------|--------|
| `npm run build` | Compiles all packages (Turbo orchestrates) |
| `npm run dev` | Parallel dev mode with hot reload |
| `npm run lint` | ESLint across all packages |
| `npm run test` | Run vitest (currently minimal test coverage) |
| `npm run download-models` | Downloads nomic-embed-text + TinyLlama (one-time) |

### Testing & Debugging

- **No dedicated test suites** - this is Phase 1/2 codebase (see STATUS.md)
- Test manually via UI or REST API
- Backend logs use Pino; check `createLogger()` in `packages/server/src/utils/logger.ts`
- Enable debug: `MEMORIZER_LOG_LEVEL=debug npm run dev`

### Build Pipeline

1. TypeScript → esbuild bundles (marks native modules external: lancedb, transformers, llama-cpp, ioredis, fastify)
2. Server: `dist/cli.js` + `dist/server.js` (esbuild with `--minify`, shebang added)
3. Web: Vite build → `dist/` (CSS inlining, asset optimization)
4. Output: `node_modules` postinstall runs if Redis/models missing

## 🎯 Project-Specific Patterns

### Memory Core Type Pattern

```typescript
// packages/shared/src/types/memory.ts
interface Memory {
  id: string;
  type: string;              // User-defined classification (e.g., "conversation", "document")
  content: Record<string, unknown>; // Arbitrary JSON metadata
  text: string;              // Main content (used for embedding)
  source: string;            // Origin (e.g., "claude-desktop", "web-ui")
  tags: string[];            // Categorical filtering
  confidence: number;        // 0-1 trust metric
  title: string | null;      // Auto-generated or user-provided
  
  // Vector embeddings (768D from nomic-embed-text)
  embedding: number[];       // Text embedding
  embedding_metadata: number[]; // Metadata embedding (experimental)
  
  // Audit
  current_version: number;
  created_at: Date;
  updated_at: Date;
}
```

Use this everywhere—storage layer validates these fields.

### Service Initialization Pattern

```typescript
// Example: EmbeddingService (packages/server/src/services/embedding.ts)
@singleton() @injectable()
export class EmbeddingService {
  private embedder = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) return this.initializationPromise;
    
    this.initializationPromise = this._initialize();
    await this.initializationPromise;
  }
  
  // ... implementation
}
```

**Pattern**: Lazy init with double-check locking to avoid concurrent initialization. Use in LlmService, EmbeddingService, StorageService.

### API Response Pattern

```typescript
// Successful responses: return memory/array directly
fastify.get('/api/memories/:id', async (request, reply) => {
  const memory = await storage.getMemory(request.params.id);
  return memory;  // Auto-serializes to JSON
});

// Errors: use reply.code().send() with error object
if (!memory) {
  reply.code(404).send({ error: 'Memory not found' });
}
```

### Storage Layer Pattern (LanceDB)

```typescript
// packages/server/src/services/storage.ts
// Query with vector search + metadata filtering
const results = await this.memoryTable
  .search(embedding)
  .limit(limit)
  .where(`confidence >= ${threshold}`)  // Metadata filter
  .toArray();

// No SQL; LanceDB uses Lance's query API
// Always search by embedding first, then filter
```

## 🔗 Integration Points & Dependencies

### External Dependencies

| Package | Role | Critical |
|---------|------|----------|
| `@xenova/transformers` | Embedding model loading (nomic-embed-text) | ✅ YES |
| `node-llama-cpp` | LLM inference (TinyLlama) | Optional (title generation) |
| `@lancedb/lancedb` | Vector DB (embedded, no server) | ✅ YES |
| `@modelcontextprotocol/sdk` | MCP server implementation | ✅ YES (for Claude integration) |
| `fastify` + plugins | HTTP server (CORS, static files) | ✅ YES |
| `ioredis` + `bullmq` | Optional async job queue | Optional (requires Redis) |
| `@fastify/static` | Serves React `dist/` as SPA | ✅ YES (production) |

### Cross-Package Communication

- **server** imports from **shared** for types (`@leon4s4/memorizer-shared`)
- **web** imports from **shared** for types
- No circular dependencies

### MCP Integration

- **MCP Server**: `packages/server/src/mcp/server.ts` exposes tools via stdio transport
- **Claude Desktop config**: Points `memorizer mcp` command → CLI mode in `cli.ts`
- **Tools defined**: `packages/server/src/mcp/tools.ts` (store_memory, search_memories, etc.)
- **No authentication**: Assumes running locally; TODO: add API key validation

### Configuration

All config via environment variables (no `.env` file in repo):

```bash
MEMORIZER_PORT=5000                  # Server port
MEMORIZER_DATA_PATH=~/.memorizer/data     # LanceDB location
MEMORIZER_MODEL_PATH=~/.memorizer/models  # Model files
MEMORIZER_CORS_ORIGINS=http://localhost:5173  # CORS
MEMORIZER_LOG_LEVEL=info             # Pino log level
REDIS_HOST / REDIS_PORT              # Optional: for BullMQ
```

See `packages/server/src/utils/config.ts` for defaults.

## ⚠️ Important Gotchas & Conventions

### 1. **Embedding Dimension: 768D (not 384D)**
   - nomic-embed-text produces 768D vectors
   - LanceDB schema requires exact dimension at table creation
   - If adding new embeddings, ensure all are 768D

### 2. **Search Always via Vector First**
   - Never filter metadata then search embeddings
   - Always: search by embedding → filter results by metadata
   - LanceDB search returns IDs, then fetch full records for consistency

### 3. **Native Module Externals in Build**
   - `build.js` marks certain modules external: transformers, lancedb, llama-cpp, ioredis
   - If adding new native module, add to `external` array in esbuild config
   - Otherwise, bundle size explodes or platform-specific binaries break

### 4. **React Routing: Nested Outlet Pattern**
   - `Layout` component wraps all routes with `<Outlet />`
   - All pages render inside Layout (nav, header, etc.)
   - See `packages/web/src/App.tsx` for route structure

### 5. **No Test Suites**
   - This is early-stage project; vitest installed but no `*.test.ts` files
   - Manual testing via UI/API required
   - Tests should follow `npm run test` → vitest pattern when added

### 6. **Optional Redis Warning**
   - Server logs `warn` if Redis unavailable
   - Admin features + background jobs disabled without Redis
   - Core functionality (search, create, edit) works without it

### 7. **Tsyringe Container Registration**
   - Services auto-registered via decorators: `@singleton() @injectable()`
   - Resolve in routes/CLI via: `const service = container.resolve(ServiceName)`
   - Don't manually instantiate services; use container

## 📚 Key Files to Know

| File | Purpose |
|------|---------|
| `packages/server/src/server.ts` | Fastify setup, service initialization, middleware |
| `packages/server/src/api/routes.ts` | All REST endpoints (CRUD, search, stats) |
| `packages/server/src/mcp/server.ts` | MCP protocol handler + tool routing |
| `packages/server/src/mcp/tools.ts` | Tool implementations (store, search, edit, etc.) |
| `packages/server/src/services/storage.ts` | LanceDB queries + Memory CRUD (1020 lines, core logic) |
| `packages/server/src/services/embedding.ts` | Embedding model wrapper + LRU caching |
| `packages/server/src/services/llm.ts` | TinyLlama title generation |
| `packages/server/src/utils/config.ts` | Config loading + env var defaults |
| `packages/web/src/App.tsx` | React Router setup |
| `packages/web/src/pages/*.tsx` | Core UI pages |
| `packages/shared/src/types/*.ts` | Shared TypeScript definitions |
| `packages/server/build.js` | esbuild production bundle config |
| `turbo.json` | Task orchestration config |

## 🚨 Known Issues & TODOs

- **esbuild dependency vulnerability** (GHSA-67mh-4wv8-2f99) - dev-only, but should update
- **CORS credentials**: Review if `credentials: true` necessary in production
- **No rate limiting**: Add `@fastify/rate-limit` for production
- **Limited test coverage**: Manual testing only
- **MCP no auth**: Assumes local-only; add API key validation for remote deployment
- **Type errors suppressed**: `// @ts-nocheck` in server.ts, llm.ts—fix error handling types

## 🔒 Security Notes

- ✅ No hardcoded secrets
- ✅ Input validation on all API endpoints
- ✅ No SQL injection (LanceDB parameterized)
- ⚠️ CORS allows credentials—review for production
- ⚠️ No rate limiting—add before production
- See `SECURITY_AUDIT.md` for full report

## 📖 Documentation References

- **GETTING_STARTED.md**: Dev setup + running instructions
- **SOLUTION.md**: Architecture decisions (ONNX Runtime vs Transformers.js)
- **MIGRATION.md**: v1 (.NET) → v2 (TypeScript) changes
- **README.md**: User-facing features + MCP setup
- **SECURITY_AUDIT.md**: Detailed security findings

---

**Last Updated**: December 2025 | **Version**: 2.1.7
