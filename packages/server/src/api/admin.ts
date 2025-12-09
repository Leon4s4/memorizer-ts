/**
 * Admin API routes for background jobs and system management
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { QueueService } from '../services/queue.js';
import { StorageService } from '../services/storage.js';

interface StartTitleGenJobBody {
  memoryIds?: string[]; // If not provided, generate for all memories without titles
}

interface StartEmbeddingRegenBody {
  memoryIds?: string[]; // If not provided, regenerate all
}

interface JobParams {
  jobId: string;
}

/**
 * Helper to check if queue service is available
 */
function getQueueService(): QueueService | null {
  try {
    return container.resolve(QueueService);
  } catch {
    return null;
  }
}

/**
 * Register admin API routes
 */
export async function registerAdminRoutes(fastify: FastifyInstance): Promise<void> {
  const storage = container.resolve(StorageService);

  // Get queue statistics
  fastify.get('/api/admin/stats', async (request, reply) => {
    const queue = getQueueService();
    if (!queue) {
      return reply.code(503).send({
        error: 'Queue service not available',
        message: 'Redis is not connected. Background jobs are disabled.',
        hint: 'Install and start Redis to enable background jobs (brew install redis && brew services start redis)',
      });
    }

    try {
      const stats = await queue.getQueueStats();
      return stats;
    } catch (error) {
      fastify.log.error(error, 'Failed to get queue stats');
      reply.code(500).send({ error: 'Failed to get queue stats' });
    }
  });

  // Start bulk title generation job
  fastify.post<{ Body: StartTitleGenJobBody }>(
    '/api/admin/jobs/title-generation',
    async (request, reply) => {
      const queue = getQueueService();
      if (!queue) {
        return reply.code(503).send({
          error: 'Queue service not available',
          message: 'Redis is not connected. Background jobs are disabled.',
        });
      }

      try {
        const { memoryIds } = request.body;

        let targetMemories;
        if (memoryIds && memoryIds.length > 0) {
          // Queue for specific memories
          targetMemories = memoryIds;
        } else {
          // Find all memories without titles
          const allMemories = await storage.listMemories(100000);
          targetMemories = allMemories
            .filter((m) => !m.title)
            .map((m) => m.id);
        }

        if (targetMemories.length === 0) {
          return {
            message: 'No memories need title generation',
            count: 0,
          };
        }

        // Queue jobs for each memory
        const jobIds = [];
        for (const memoryId of targetMemories) {
          const memory = await storage.getMemory(memoryId);
          if (memory) {
            const jobId = await queue.queueTitleGeneration({
              memoryId: memory.id,
              text: memory.text,
              type: memory.type,
              tags: memory.tags,
            });
            jobIds.push(jobId);
          }
        }

        reply.code(202).send({
          message: 'Title generation jobs queued',
          count: jobIds.length,
          jobIds,
        });
      } catch (error) {
        fastify.log.error(error, 'Failed to start title generation jobs');
        reply.code(500).send({ error: 'Failed to start title generation jobs' });
      }
    }
  );

  // Start bulk embedding regeneration job
  fastify.post<{ Body: StartEmbeddingRegenBody }>(
    '/api/admin/jobs/embedding-regeneration',
    async (request, reply) => {
      const queue = getQueueService();
      if (!queue) {
        return reply.code(503).send({
          error: 'Queue service not available',
          message: 'Redis is not connected. Background jobs are disabled.',
        });
      }

      try {
        const { memoryIds } = request.body;

        const jobId = await queue.queueBulkEmbeddingRegeneration({
          memoryIds,
        });

        reply.code(202).send({
          message: 'Embedding regeneration job queued',
          jobId,
        });
      } catch (error) {
        fastify.log.error(error, 'Failed to start embedding regeneration job');
        reply.code(500).send({ error: 'Failed to start embedding regeneration job' });
      }
    }
  );

  // Get job status
  fastify.get<{ Params: JobParams; Querystring: { queue: string } }>(
    '/api/admin/jobs/:jobId',
    async (request, reply) => {
      const queue = getQueueService();
      if (!queue) {
        return reply.code(503).send({
          error: 'Queue service not available',
          message: 'Redis is not connected. Background jobs are disabled.',
        });
      }

      try {
        const { jobId } = request.params;
        const { queue: queueName } = request.query;

        if (queueName !== 'title-generation' && queueName !== 'embedding-regeneration') {
          return reply.code(400).send({ error: 'Invalid queue name' });
        }

        const status = await queue.getJobStatus(
          jobId,
          queueName as 'title-generation' | 'embedding-regeneration'
        );

        if (!status) {
          return reply.code(404).send({ error: 'Job not found' });
        }

        return status;
      } catch (error) {
        fastify.log.error(error, 'Failed to get job status');
        reply.code(500).send({ error: 'Failed to get job status' });
      }
    }
  );

  // Server-Sent Events endpoint for job progress
  fastify.get<{ Params: JobParams; Querystring: { queue: string } }>(
    '/api/admin/jobs/:jobId/progress',
    async (request, reply) => {
      const queue = getQueueService();
      if (!queue) {
        return reply.code(503).send({
          error: 'Queue service not available',
          message: 'Redis is not connected. Background jobs are disabled.',
        });
      }

      const { jobId } = request.params;
      const { queue: queueName } = request.query;

      // Set up SSE
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      // Send initial connection message
      reply.raw.write(`data: ${JSON.stringify({ type: 'connected', jobId })}\n\n`);

      // Set up progress listener
      queue.addProgressListener(jobId, (progress) => {
        const data = JSON.stringify({
          type: 'progress',
          ...progress,
        });
        reply.raw.write(`data: ${data}\n\n`);

        // Close connection when job is completed or failed
        if (progress.status === 'completed' || progress.status === 'failed') {
          setTimeout(() => {
            reply.raw.end();
          }, 1000);
        }
      });

      // Handle client disconnect
      request.raw.on('close', () => {
        queue.removeProgressListener(jobId);
        reply.raw.end();
      });

      // Send periodic keep-alive
      const keepAliveInterval = setInterval(() => {
        if (reply.raw.destroyed) {
          clearInterval(keepAliveInterval);
          return;
        }
        reply.raw.write(': keep-alive\n\n');
      }, 15000);

      // Clean up on close
      reply.raw.on('close', () => {
        clearInterval(keepAliveInterval);
        queue.removeProgressListener(jobId);
      });
    }
  );

  // Clean old jobs
  fastify.post('/api/admin/jobs/clean', async (request, reply) => {
    const queue = getQueueService();
    if (!queue) {
      return reply.code(503).send({
        error: 'Queue service not available',
        message: 'Redis is not connected. Background jobs are disabled.',
      });
    }

    try {
      await queue.cleanJobs();
      return { message: 'Jobs cleaned successfully' };
    } catch (error) {
      fastify.log.error(error, 'Failed to clean jobs');
      reply.code(500).send({ error: 'Failed to clean jobs' });
    }
  });

  fastify.log.info('Admin routes registered');
}
