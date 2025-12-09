/**
 * REST API routes for Memorizer
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { StorageService } from '../services/storage.js';
import { EmbeddingService } from '../services/embedding.js';
import { LlmService } from '../services/llm.js';
import { DiffService } from '../services/diff.js';
import type {
  Memory,
  MemoryCreateInput,
  MemoryUpdateInput,
  SearchOptions,
  MemoryStats,
} from '@leon4s4/memorizer-shared';

interface CreateMemoryBody {
  type: string;
  content: Record<string, unknown>;
  text: string;
  source: string;
  tags?: string[];
  confidence?: number;
  title?: string;
}

interface UpdateMemoryBody {
  type?: string;
  content?: Record<string, unknown>;
  text?: string;
  source?: string;
  tags?: string[];
  confidence?: number;
  title?: string;
}

interface SearchBody {
  query: string;
  limit?: number;
  threshold?: number;
  types?: string[];
  tags?: string[];
  includeContent?: boolean;
}

interface ListMemoriesQuery {
  limit?: string;
  offset?: string;
  types?: string;
  tags?: string;
}

interface MemoryParams {
  id: string;
}

/**
 * Register all API routes
 */
export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  const storage = container.resolve(StorageService);
  const embedding = container.resolve(EmbeddingService);
  const llm = container.resolve(LlmService);
  const diff = container.resolve(DiffService);

  // Health check
  fastify.get('/healthz', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Get statistics
  fastify.get('/api/stats', async (request, reply) => {
    try {
      const stats = await storage.getStats();
      return stats;
    } catch (error) {
      fastify.log.error(error, 'Failed to get stats');
      reply.code(500).send({ error: 'Failed to get statistics' });
    }
  });

  // List memories
  fastify.get<{ Querystring: ListMemoriesQuery }>(
    '/api/memories',
    async (request, reply) => {
      try {
        const { limit, offset, types, tags } = request.query;

        const parsedLimit = limit ? parseInt(limit) : 100;
        const parsedOffset = offset ? parseInt(offset) : 0;
        const parsedTypes = types ? types.split(',') : undefined;
        const parsedTags = tags ? tags.split(',') : undefined;

        const memories = await storage.listMemories(
          parsedLimit,
          parsedOffset,
          parsedTypes,
          parsedTags
        );

        return { memories, count: memories.length };
      } catch (error) {
        fastify.log.error(error, 'Failed to list memories');
        reply.code(500).send({ error: 'Failed to list memories' });
      }
    }
  );

  // Get memory by ID
  fastify.get<{ Params: MemoryParams }>(
    '/api/memories/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const memory = await storage.getMemory(id);

        if (!memory) {
          return reply.code(404).send({ error: 'Memory not found' });
        }

        return memory;
      } catch (error) {
        fastify.log.error(error, 'Failed to get memory');
        reply.code(500).send({ error: 'Failed to get memory' });
      }
    }
  );

  // Create memory
  fastify.post<{ Body: CreateMemoryBody }>(
    '/api/memories',
    async (request, reply) => {
      try {
        const input: MemoryCreateInput = request.body;

        // Validate required fields
        if (!input.type || !input.content || !input.text || !input.source) {
          return reply.code(400).send({
            error: 'Missing required fields: type, content, text, source',
          });
        }

        // Generate embeddings using the EmbeddingService
        const contentEmbedding = await embedding.generateForContent(input.text);
        const metadataEmbedding = await embedding.generateForMetadata(
          input.title || '',
          input.tags || []
        );

        // Auto-generate title if not provided
        if (!input.title) {
          const generatedTitle = await llm.generateTitle(
            input.text,
            input.type,
            input.tags
          );
          if (generatedTitle) {
            input.title = generatedTitle;
          }
        }

        const memory = await storage.storeMemory(
          input,
          contentEmbedding,
          metadataEmbedding
        );

        reply.code(201).send(memory);
      } catch (error) {
        fastify.log.error(error, 'Failed to create memory');
        reply.code(500).send({ error: 'Failed to create memory' });
      }
    }
  );

  // Update memory
  fastify.put<{ Params: MemoryParams; Body: UpdateMemoryBody }>(
    '/api/memories/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const updates: MemoryUpdateInput = request.body;

        // Check if memory exists
        const existing = await storage.getMemory(id);
        if (!existing) {
          return reply.code(404).send({ error: 'Memory not found' });
        }

        // Generate new embeddings if text changed
        let contentEmbedding: number[] | undefined;
        let metadataEmbedding: number[] | undefined;

        if (updates.text !== undefined) {
          contentEmbedding = await embedding.generateForContent(updates.text);

          // Regenerate metadata embedding with updated values
          const title = updates.title !== undefined ? updates.title : existing.title;
          const tags = updates.tags !== undefined ? updates.tags : existing.tags;
          metadataEmbedding = await embedding.generateForMetadata(
            title || '',
            tags
          );
        } else if (updates.title !== undefined || updates.tags !== undefined) {
          // Only metadata changed, regenerate metadata embedding
          const title = updates.title !== undefined ? updates.title : existing.title;
          const tags = updates.tags !== undefined ? updates.tags : existing.tags;
          metadataEmbedding = await embedding.generateForMetadata(
            title || '',
            tags
          );
        }

        const memory = await storage.updateMemory(
          id,
          updates,
          contentEmbedding,
          metadataEmbedding
        );

        return memory;
      } catch (error) {
        fastify.log.error(error, 'Failed to update memory');
        reply.code(500).send({ error: 'Failed to update memory' });
      }
    }
  );

  // Delete memory
  fastify.delete<{ Params: MemoryParams }>(
    '/api/memories/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;

        const deleted = await storage.deleteMemory(id);

        if (!deleted) {
          return reply.code(404).send({ error: 'Memory not found' });
        }

        reply.code(204).send();
      } catch (error) {
        fastify.log.error(error, 'Failed to delete memory');
        reply.code(500).send({ error: 'Failed to delete memory' });
      }
    }
  );

  // Search memories
  fastify.post<{ Body: SearchBody }>('/api/search', async (request, reply) => {
    try {
      const options: SearchOptions = request.body;

      // Validate query
      if (!options.query) {
        return reply.code(400).send({ error: 'Missing required field: query' });
      }

      // Generate query embedding using the EmbeddingService
      const queryEmbedding = await embedding.generate(options.query);

      const results = await storage.search(options, queryEmbedding);

      return {
        results,
        count: results.length,
        query: options.query,
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to search memories');
      reply.code(500).send({ error: 'Failed to search memories' });
    }
  });

  // Get relationships for a memory
  fastify.get<{ Params: MemoryParams; Querystring: { direction?: string } }>(
    '/api/memories/:id/relationships',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { direction = 'both' } = request.query;

        // Verify memory exists
        const memory = await storage.getMemory(id);
        if (!memory) {
          return reply.code(404).send({ error: 'Memory not found' });
        }

        const relationships = await storage.getRelationships(
          id,
          direction as 'outgoing' | 'incoming' | 'both'
        );

        return { relationships, count: relationships.length };
      } catch (error) {
        fastify.log.error(error, 'Failed to get relationships');
        reply.code(500).send({ error: 'Failed to get relationships' });
      }
    }
  );

  // Create relationship
  fastify.post<{
    Body: { from_memory_id: string; to_memory_id: string; type: string; score?: number };
  }>('/api/relationships', async (request, reply) => {
    try {
      const { from_memory_id, to_memory_id, type, score } = request.body;

      // Validate required fields
      if (!from_memory_id || !to_memory_id || !type) {
        return reply.code(400).send({
          error: 'Missing required fields: from_memory_id, to_memory_id, type',
        });
      }

      // Verify both memories exist
      const [fromMemory, toMemory] = await Promise.all([
        storage.getMemory(from_memory_id),
        storage.getMemory(to_memory_id),
      ]);

      if (!fromMemory || !toMemory) {
        return reply.code(404).send({ error: 'One or both memories not found' });
      }

      const relationship = await storage.createRelationship({
        from_memory_id,
        to_memory_id,
        type,
        score,
      });

      reply.code(201).send(relationship);
    } catch (error) {
      fastify.log.error(error, 'Failed to create relationship');
      reply.code(500).send({ error: 'Failed to create relationship' });
    }
  });

  // Get version history for a memory
  fastify.get<{ Params: MemoryParams }>(
    '/api/memories/:id/versions',
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Verify memory exists
        const memory = await storage.getMemory(id);
        if (!memory) {
          return reply.code(404).send({ error: 'Memory not found' });
        }

        const versions = await storage.getVersionHistory(id);

        return { versions, count: versions.length };
      } catch (error) {
        fastify.log.error(error, 'Failed to get version history');
        reply.code(500).send({ error: 'Failed to get version history' });
      }
    }
  );

  // Revert memory to a specific version
  fastify.post<{ Params: MemoryParams; Body: { version_id: string } }>(
    '/api/memories/:id/revert',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { version_id } = request.body;

        if (!version_id) {
          return reply.code(400).send({ error: 'Missing required field: version_id' });
        }

        const memory = await storage.revertToVersion(id, version_id);

        if (!memory) {
          return reply.code(404).send({ error: 'Memory or version not found' });
        }

        return memory;
      } catch (error) {
        fastify.log.error(error, 'Failed to revert memory');
        reply.code(500).send({ error: 'Failed to revert memory' });
      }
    }
  );

  // Find similar memories
  fastify.get<{ Params: MemoryParams; Querystring: { limit?: string; threshold?: string } }>(
    '/api/memories/:id/similar',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { limit = '5', threshold = '0.7' } = request.query;

        // Verify memory exists
        const memory = await storage.getMemory(id);
        if (!memory) {
          return reply.code(404).send({ error: 'Memory not found' });
        }

        const parsedLimit = parseInt(limit);
        const parsedThreshold = parseFloat(threshold);

        const similar = await storage.findSimilarMemories(id, parsedLimit, parsedThreshold);

        return {
          similar: similar.map((s) => s.memory),
          count: similar.length,
        };
      } catch (error) {
        fastify.log.error(error, 'Failed to find similar memories');
        reply.code(500).send({ error: 'Failed to find similar memories' });
      }
    }
  );

  // Get events for a memory
  fastify.get<{ Params: MemoryParams }>(
    '/api/memories/:id/events',
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Verify memory exists
        const memory = await storage.getMemory(id);
        if (!memory) {
          return reply.code(404).send({ error: 'Memory not found' });
        }

        const events = await storage.getEvents(id);

        return { events, count: events.length };
      } catch (error) {
        fastify.log.error(error, 'Failed to get events');
        reply.code(500).send({ error: 'Failed to get events' });
      }
    }
  );

  // Get diff between versions
  fastify.get<{
    Params: MemoryParams;
    Querystring: { from_version?: string; to_version?: string };
  }>('/api/memories/:id/diff', async (request, reply) => {
    try {
      const { id } = request.params;
      const { from_version, to_version } = request.query;

      // Get current memory
      const current = await storage.getMemory(id);
      if (!current) {
        return reply.code(404).send({ error: 'Memory not found' });
      }

      let oldText: string;
      let newText: string;
      let oldVersion: number;
      let newVersion: number;

      // If no versions specified, compare latest version to current
      if (!from_version && !to_version) {
        const versions = await storage.getVersionHistory(id);
        if (versions.length === 0) {
          return reply.code(404).send({ error: 'No version history found' });
        }
        oldText = versions[0].text;
        newText = current.text;
        oldVersion = versions[0].version_number;
        newVersion = current.current_version;
      }
      // Compare two specific versions
      else if (from_version && to_version) {
        const fromVer = await storage.getVersion(from_version);
        const toVer = await storage.getVersion(to_version);

        if (!fromVer || !toVer) {
          return reply.code(404).send({ error: 'One or both versions not found' });
        }

        oldText = fromVer.text;
        newText = toVer.text;
        oldVersion = fromVer.version_number;
        newVersion = toVer.version_number;
      }
      // Compare version to current
      else if (from_version) {
        const fromVer = await storage.getVersion(from_version);
        if (!fromVer) {
          return reply.code(404).send({ error: 'Version not found' });
        }
        oldText = fromVer.text;
        newText = current.text;
        oldVersion = fromVer.version_number;
        newVersion = current.current_version;
      } else {
        return reply.code(400).send({ error: 'Invalid version parameters' });
      }

      const diffResult = diff.diff(oldText, newText);

      return {
        from_version: oldVersion,
        to_version: newVersion,
        diff: diffResult,
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to generate diff');
      reply.code(500).send({ error: 'Failed to generate diff' });
    }
  });

  fastify.log.info('API routes registered');
}
