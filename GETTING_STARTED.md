# Getting Started with Memorizer TypeScript

Welcome to Memorizer! This guide will help you get the application up and running.

## Prerequisites

- **Node.js 18+** (check with `node --version`)
- **npm 9+** (check with `npm --version`)

## Installation

### 1. Install Dependencies

From the root of the project:

```bash
cd /Users/Git/memorizer-ts
npm install
```

This will install all dependencies for all packages (server, web, shared) using npm workspaces.

### 2. Build the Project

```bash
npm run build
```

This will:
- Build the shared types package
- Build the server (TypeScript compilation + esbuild bundle)
- Build the React web app (Vite production build)

## Running the Application

### Development Mode (Recommended for Phase 1)

Run both server and web UI in development mode with hot reload:

#### Terminal 1: Start the Backend Server

```bash
cd packages/server
npm run dev
```

The server will start at **http://localhost:5000**

You should see:
```
╔═══════════════════════════════════════════════╗
║                                               ║
║   Memorizer Server                            ║
║   Airgapped AI Memory Service                 ║
║                                               ║
╚═══════════════════════════════════════════════╝

🚀 Server listening on http://0.0.0.0:5000
📊 API available at http://localhost:5000/api
💾 Data directory: /Users/<you>/.memorizer/data
🤖 Model directory: /Users/<you>/.memorizer/models
```

#### Terminal 2: Start the React Frontend

```bash
cd packages/web
npm run dev
```

The web UI will start at **http://localhost:5173**

Vite will automatically proxy API requests to the backend server.

### Production Mode

```bash
# Build everything
npm run build

# Start the server (serves both API and built web UI)
cd packages/server
npm start
```

Then visit **http://localhost:5000/ui/**

## Testing the Application

### 1. Health Check

```bash
curl http://localhost:5000/healthz
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-08T..."
}
```

### 2. Create a Memory via API

```bash
curl -X POST http://localhost:5000/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "type": "note",
    "content": {"text": "My first memory!"},
    "text": "My first memory!",
    "source": "test",
    "tags": ["test", "first"]
  }'
```

### 3. List Memories

```bash
curl http://localhost:5000/api/memories
```

### 4. Get Statistics

```bash
curl http://localhost:5000/api/stats
```

### 5. Search (returns all memories for now, embeddings coming in Phase 2)

```bash
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "memory", "limit": 10}'
```

## Using the Web UI

1. **Open your browser** to http://localhost:5173 (dev) or http://localhost:5000/ui/ (prod)

2. **Create a Memory**
   - Click "Create Memory" button
   - Fill in the form:
     - Type: note, fact, idea, task, or question
     - Title (optional)
     - Content (required)
     - Tags (comma-separated)
   - Click "Create Memory"

3. **View Memories**
   - See all memories on the home page
   - Click "View" to see full details
   - Click "Edit" to modify
   - Click "Delete" to remove

4. **View Statistics**
   - Click "Stats" in the navigation
   - See memory counts, types, tags, etc.

## CLI Commands

The server package provides a CLI:

```bash
# Start server with options
npx memorizer start --port 3000 --data ./my-data

# Available options:
#   -p, --port <port>        Port to listen on (default: 5000)
#   -d, --data <path>        Data directory path
#   -m, --models <path>      Models directory path
#   --no-ui                  Disable web UI
#   --log-level <level>      Log level (debug, info, warn, error)

# Other commands (coming in later phases):
npx memorizer export -o memories.json
npx memorizer import -i memories.json
npx memorizer backup -o backup.zip
npx memorizer admin title-gen
npx memorizer admin rebuild-index
```

## Data Directory

Memorizer stores all data in `~/.memorizer/` by default:

```
~/.memorizer/
├── data/           # LanceDB database files
│   ├── memories.lance
│   ├── memory_versions.lance
│   ├── memory_events.lance
│   └── memory_relationships.lance
├── models/         # AI models (Phase 2+)
└── cache/          # Temporary files
```

## Configuration

Environment variables:

```bash
# Server
export MEMORIZER_PORT=5000
export MEMORIZER_DATA_PATH=~/.memorizer/data
export MEMORIZER_MODEL_PATH=~/.memorizer/models
export MEMORIZER_ENABLE_UI=true
export MEMORIZER_LOG_LEVEL=info

# CORS (for development)
export MEMORIZER_CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Troubleshooting

### Port Already in Use

If port 5000 is taken:

```bash
# Server
cd packages/server
npm run dev -- --port 3000

# Or set environment variable
MEMORIZER_PORT=3000 npm run dev
```

### Dependencies Installation Issues

If you encounter installation issues:

```bash
# Clear everything and reinstall
npm run clean
rm -rf node_modules package-lock.json
npm install
```

### Web UI Can't Connect to API

Make sure:
1. Backend server is running on port 5000
2. Check Vite proxy configuration in `packages/web/vite.config.ts`
3. CORS is properly configured in server

### LanceDB Errors

LanceDB is a native module. If you see compilation errors:

**macOS:**
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

**Linux:**
```bash
# Install build essentials
sudo apt-get install build-essential
```

**Windows:**
- Use WSL2 for best compatibility
- Or install Visual Studio Build Tools

## Next Steps

### Phase 1 Remaining
- [ ] Create PostgreSQL export script (.NET)
- [ ] Create LanceDB import script (TypeScript)

### Phase 2 (Weeks 3-4)
- [ ] Integrate Transformers.js + nomic-embed-text
- [ ] Implement semantic search with real embeddings
- [ ] Integrate TinyLlama for auto-title generation

### Phase 3 (Week 5)
- [ ] Version history UI
- [ ] Memory relationships UI
- [ ] Diff viewer

### Phase 4 (Week 6)
- [ ] Background jobs with BullMQ
- [ ] Admin dashboard
- [ ] Progress streaming via SSE

### Phase 5 (Week 7)
- [ ] MCP server integration
- [ ] All MCP tools implemented

### Phase 6 (Week 8)
- [ ] NPM package publication
- [ ] Model download scripts
- [ ] Offline variant

## Useful Commands

```bash
# Development
npm run dev           # Start all packages in dev mode
npm run build         # Build all packages
npm run lint          # Lint all packages
npm run clean         # Clean build artifacts

# Server only
cd packages/server
npm run dev           # Dev mode with hot reload
npm run build         # Build for production
npm start             # Run production build

# Web only
cd packages/web
npm run dev           # Vite dev server
npm run build         # Production build
npm run preview       # Preview production build

# Shared types
cd packages/shared
npm run build         # Compile TypeScript
npm run dev           # Watch mode
```

## Need Help?

- **Documentation**: See README.md and package-specific READMEs
- **Issues**: Report at https://github.com/your-org/memorizer-ts/issues
- **Migration Plan**: See `/Users/leonardosantana/.claude/plans/soft-orbiting-axolotl.md`
- **Status**: See `STATUS.md` for current progress

Enjoy using Memorizer! 🚀
