# Redis - Optional Dependency

Redis is **optional** for Memorizer. The server will start and work without Redis, but some features require it.

## ✅ Works WITHOUT Redis

All core functionality works perfectly without Redis:

- ✅ **Memory Storage** - Store, retrieve, update, delete memories
- ✅ **Semantic Search** - Vector similarity search with embeddings
- ✅ **Versioning** - Full version history and revert capabilities
- ✅ **Relationships** - Create and query memory relationships
- ✅ **MCP Server** - Model Context Protocol tools for LLMs
- ✅ **REST API** - All CRUD operations
- ✅ **Web UI** - Browse, search, create, edit memories
- ✅ **Embeddings** - Automatic embedding generation with Transformers.js
- ✅ **Title Generation** - LLM-based title generation (synchronous)

## ⚠️ Requires Redis

Background job features require Redis:

- ❌ **Background Title Generation** - Batch title generation jobs
- ❌ **Background Embedding Regeneration** - Bulk embedding updates
- ❌ **Job Progress Tracking** - Real-time SSE progress updates
- ❌ **Admin Dashboard** - Queue statistics and job management

## Server Behavior

### Without Redis

When Redis is not available, the server:

1. **Starts normally** with a warning message
2. **All API routes work** except `/api/admin/*`
3. **Admin routes return 503** with helpful error messages
4. **Console shows**: `⚠️  Background jobs disabled (Redis not available)`

### With Redis

When Redis is available, the server:

1. **Starts normally** with confirmation message
2. **All features enabled** including admin dashboard
3. **Console shows**: `⚡ Background jobs enabled (Redis connected)`

## Installing Redis (Optional)

If you want background job features, install Redis:

### macOS

```bash
brew install redis
brew services start redis
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### Docker

```bash
docker run -d --name redis -p 6379:6379 redis:latest
```

### Verify Installation

```bash
redis-cli ping
# Should return: PONG
```

## Configuration

By default, Memorizer connects to Redis on `localhost:6379`.

### Custom Redis Host/Port

Set environment variables:

```bash
export REDIS_HOST=your-redis-host
export REDIS_PORT=6379
```

Or when starting:

```bash
REDIS_HOST=your-redis-host REDIS_PORT=6379 memorizer start
```

## API Responses

When Redis is not available, admin endpoints return:

**Status Code**: 503 Service Unavailable

**Response**:
```json
{
  "error": "Queue service not available",
  "message": "Redis is not connected. Background jobs are disabled.",
  "hint": "Install and start Redis to enable background jobs (brew install redis && brew services start redis)"
}
```

## Use Cases

### Without Redis (Lightweight/Airgapped)

Perfect for:
- Personal knowledge management
- Fully airgapped deployments
- Docker containers without Redis
- Development/testing
- Minimal dependencies
- MCP server usage only

### With Redis (Full Features)

Recommended for:
- Batch operations on many memories
- Background processing requirements
- Admin dashboard usage
- Production deployments with monitoring

## FAQ

### Q: Will the server crash without Redis?

**A:** No. The server starts normally and all core features work. Only admin/background job features are unavailable.

### Q: Can I add Redis later?

**A:** Yes. Just install and start Redis, then restart Memorizer. No configuration changes needed.

### Q: Does MCP mode need Redis?

**A:** No. The MCP server works perfectly without Redis. It doesn't use background jobs.

### Q: How do I check if Redis is connected?

**A:** Look at the startup message:
- ✅ `⚡ Background jobs enabled (Redis connected)`
- ⚠️ `⚠️  Background jobs disabled (Redis not available)`

Or check the admin dashboard: if it loads, Redis is connected.

### Q: What happens to queued jobs if Redis goes down?

**A:** Jobs are persisted in Redis. When Redis comes back, jobs will resume from where they left off.

### Q: Can I use a remote Redis server?

**A:** Yes. Set `REDIS_HOST` and `REDIS_PORT` environment variables.

## Troubleshooting

### Redis connection refused

```
Queue service not available - Redis not connected
```

**Solutions**:
1. Install Redis: `brew install redis` (macOS) or `apt-get install redis-server` (Linux)
2. Start Redis: `brew services start redis` or `systemctl start redis`
3. Check Redis is running: `redis-cli ping`

### Redis installed but not connecting

Check if Redis is running:

```bash
# macOS
brew services list | grep redis

# Linux
systemctl status redis

# Check port
lsof -i :6379
```

Restart Redis:

```bash
# macOS
brew services restart redis

# Linux
sudo systemctl restart redis
```

### Custom Redis configuration

If Redis is on a different host/port:

```bash
export REDIS_HOST=192.168.1.100
export REDIS_PORT=6380
memorizer start
```

## Architecture

The optional Redis integration follows this pattern:

```
Server Startup
  ↓
initializeServices()
  ├─ Initialize StorageService (REQUIRED)
  ├─ Try initialize QueueService
  │   ├─ Success → Background jobs enabled
  │   └─ Fail → Log warning, continue without jobs
  └─ Return success/failure status
  ↓
HTTP Server Starts (always)
  ├─ Core routes: Always available
  └─ Admin routes: Return 503 if queue unavailable
```

This ensures:
- ✅ Server always starts
- ✅ Core functionality always works
- ✅ Graceful degradation for optional features
- ✅ Clear error messages when features unavailable

## Summary

**Redis is optional**. Memorizer works great without it for core memory management and MCP integration. Add Redis only if you need background job processing and the admin dashboard.

**Truly airgapped operation** is possible without Redis - all AI models, vector search, and memory storage work without any external services.
