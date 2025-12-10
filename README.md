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

## Installation

**For airgapped Windows machines** - single command installation:

**1. Download the bundled package:**
- Go to [Latest Release](https://github.com/Leon4s4/memorizer-ts/releases/latest)
- Download `leon4s4-memorizer-server-2.1.7.tgz` (~1.2GB - includes all models + Windows binaries)

**2. Transfer to your airgapped machine**

**3. Install:**
```bash
npm install -g ./leon4s4-memorizer-server-2.1.7.tgz
```

**4. Run:**
```bash
memorizer start
```

✅ **That's it!** No downloads, no certificate errors, no manual steps required.

### What's Included

- **nomic-embed-text** (547MB) - 768D embeddings for semantic search
- **TinyLlama 1.1B** (668MB) - AI-powered title generation
- **Windows x64 binaries** (7.7MB) - Pre-bundled sharp/libvips
- **Total size**: ~1.2GB
- **Works completely offline** after installation

## MCP Server Setup

Memorizer provides an MCP (Model Context Protocol) server for integration with Claude Desktop, Claude Code, and other MCP clients.

### Claude Code (CLI)

**1. Install the server globally:**
```bash
# Download and install from GitHub Release (see Installation section above)
npm install -g ./leon4s4-memorizer-server-2.1.7.tgz
```

**2. Configure MCP in `~/.claude/settings.json`:**
```json
{
  "mcpServers": {
    "memorizer": {
      "command": "memorizer",
      "args": ["mcp"],
      "env": {
        "MEMORIZER_DATA_PATH": "/Users/YOUR_USERNAME/.memorizer/data",
        "MEMORIZER_MODEL_PATH": "/Users/YOUR_USERNAME/.memorizer/models"
      }
    }
  }
}
```

**3. Restart Claude Code** - The MCP tools will be available automatically

**Available Tools:**
- `store_memory` - Save information to memory
- `search_memories` - Semantic search across memories
- `get_memory` - Retrieve memory by ID
- `update_memory` - Edit existing memory
- `delete_memory` - Remove memory
- `list_memories` - Browse all memories
- `get_memory_stats` - View statistics
- `create_relationship` - Link related memories

### Option 2: VS Code (Claude for VSCode Extension)

**1. Install the server globally:**
```bash
npm install -g @leon4s4/memorizer-server
```

**2. Open VS Code Settings (JSON):**
- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- Type "Preferences: Open User Settings (JSON)"
- Press Enter

**3. Add MCP server configuration:**
```json
{
  "claude.mcpServers": {
    "memorizer": {
      "command": "memorizer",
      "args": ["mcp"],
      "env": {
        "MEMORIZER_DATA_PATH": "/Users/YOUR_USERNAME/.memorizer/data",
        "MEMORIZER_MODEL_PATH": "/Users/YOUR_USERNAME/.memorizer/models"
      }
    }
  }
}
```

**4. Reload VS Code** - The MCP tools will appear in Claude's tool list

### Option 3: Claude Desktop

**1. Install the server globally:**
```bash
npm install -g @leon4s4/memorizer-server
```

**2. Configure in `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):**
```json
{
  "mcpServers": {
    "memorizer": {
      "command": "memorizer",
      "args": ["mcp"],
      "env": {
        "MEMORIZER_DATA_PATH": "/Users/YOUR_USERNAME/.memorizer/data",
        "MEMORIZER_MODEL_PATH": "/Users/YOUR_USERNAME/.memorizer/models"
      }
    }
  }
}
```

**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

**3. Restart Claude Desktop** - MCP tools will be available

### MCP Server Direct Usage

You can also run the MCP server directly for testing:

```bash
# Start MCP server (stdio mode)
memorizer mcp

# Test with MCP inspector
npx @modelcontextprotocol/inspector memorizer mcp
```

### Troubleshooting MCP Setup

**MCP tools not appearing:**
1. Verify installation: `which memorizer` (should show path)
2. Test server: `memorizer mcp` (should not error immediately)
3. Check logs in Claude/VS Code developer console
4. Ensure paths use absolute paths (no `~`)

**Models not found:**
1. Run `memorizer start` once to download models
2. Check `~/.memorizer/models/` directory exists
3. Verify `MEMORIZER_MODEL_PATH` in MCP config

**Connection issues:**
1. Restart the client application completely
2. Verify JSON syntax in config files
3. Check file permissions on `.memorizer` directory

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
- **Package name**: `@leon4s4/memorizer-server`
- **Size**: ~10MB
- **Models**: Downloaded on first install to `~/.memorizer/models/`

### Offline Variant
- **Package name**: `@leon4s4/memorizer-server-offline`
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
- `stdio` mode for Claude Desktop, Claude Code, VS Code
- Tools: store, search, get, update, delete, list, stats, relationships
- See [MCP Server Setup](#mcp-server-setup) section above

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
