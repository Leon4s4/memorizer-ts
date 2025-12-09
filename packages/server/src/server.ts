// @ts-nocheck - TODO: Fix error type handling
/**
 * Fastify server setup
 */

import 'reflect-metadata';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { container } from 'tsyringe';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { StorageService } from './services/storage.js';
import { QueueService } from './services/queue.js';
import { registerRoutes } from './api/routes.js';
import { registerAdminRoutes } from './api/admin.js';
import type { Config } from './utils/config.js';
import { createLogger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ServerContext {
  config: Config;
  storage: StorageService;
}

/**
 * Initialize services without starting HTTP server
 * Used by both HTTP server and MCP server
 * @returns true if queue service is available, false otherwise
 */
export async function initializeServices(config: Config): Promise<boolean> {
  // Create logger
  const logger = createLogger(config);

  // Initialize storage service (required)
  const storage = container.resolve(StorageService);
  await storage.initialize(config.dataPath);
  logger.info(`Storage initialized at ${config.dataPath}`);

  // Initialize queue service (optional - requires Redis)
  try {
    const queueService = container.resolve(QueueService);
    logger.info('Queue service initialized (Redis connected)');
    return true;
  } catch (error) {
    // Queue service is optional - server will work without background jobs
    logger.warn('Queue service not available - Redis not connected. Background jobs and admin features will be disabled.');
    logger.warn('To enable: Install Redis and ensure it is running on localhost:6379');
    return false;
  }
}

/**
 * Create and configure Fastify application
 */
export async function createServer(config: Config): Promise<FastifyInstance> {
  // Create logger
  const logger = createLogger(config);

  // Initialize services (returns true if queue is available)
  const queueAvailable = await initializeServices(config);

  // Create Fastify instance
  const fastify = Fastify({
    logger,
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
  });

  // Register CORS
  await fastify.register(fastifyCors, {
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Get queue service if available (for shutdown)
  let queueService: QueueService | null = null;
  if (queueAvailable) {
    try {
      queueService = container.resolve(QueueService);
    } catch (error) {
      // Queue became unavailable
      logger.warn('Queue service no longer available');
    }
  }

  // Register API routes
  await registerRoutes(fastify);
  await registerAdminRoutes(fastify);

  // Serve web UI if enabled
  if (config.enableUI) {
    // In production, serve built React app from dist/web
    // In development, the React app runs separately on Vite dev server
    const webDir = join(__dirname, '../../web');

    try {
      await fastify.register(fastifyStatic, {
        root: webDir,
        prefix: '/ui/',
      });

      // SPA fallback - serve index.html for all UI routes
      fastify.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/ui')) {
          reply.sendFile('index.html');
        } else {
          reply.code(404).send({ error: 'Not found' });
        }
      });

      logger.info('Web UI enabled at /ui/');
    } catch (error) {
      logger.warn('Web UI directory not found, UI will not be available');
    }
  }

  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);

    // Send appropriate error response
    const statusCode = error.statusCode || 500;
    reply.code(statusCode).send({
      error: error.message || 'Internal server error',
      statusCode,
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    try {
      // Shutdown queue service if it was initialized
      if (queueService) {
        await queueService.shutdown();
        logger.info('Queue service shut down');
      }
      await fastify.close();
      logger.info('Server closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error(error, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return fastify;
}

/**
 * Start the server
 */
export async function startServer(config: Config): Promise<FastifyInstance> {
  const fastify = await createServer(config);

  try {
    await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    const address = fastify.server.address();
    const port = typeof address === 'object' && address ? address.port : config.port;

    // Check if queue service is available for status message
    let queueStatus = '';
    try {
      container.resolve(QueueService);
      queueStatus = '⚡ Background jobs enabled (Redis connected)';
    } catch {
      queueStatus = '⚠️  Background jobs disabled (Redis not available)';
    }

    console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   Memorizer Server                            ║
║   Airgapped AI Memory Service                 ║
║                                               ║
╚═══════════════════════════════════════════════╝

🚀 Server listening on http://0.0.0.0:${port}
📊 API available at http://localhost:${port}/api
${config.enableUI ? `🎨 Web UI available at http://localhost:${port}/ui/` : ''}
💾 Data directory: ${config.dataPath}
🤖 Model directory: ${config.modelPath}
${queueStatus}

Press Ctrl+C to stop
`);

    return fastify;
  } catch (error) {
    fastify.log.error(error, 'Failed to start server');
    process.exit(1);
  }
}
