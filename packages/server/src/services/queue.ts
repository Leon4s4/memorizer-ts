// @ts-nocheck - TODO: Fix logger type
/**
 * Job Queue Service using BullMQ
 *
 * Manages background jobs for:
 * - Title generation
 * - Embedding regeneration
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { singleton, injectable, container } from 'tsyringe';
import Redis from 'ioredis';
import { getLogger } from '../utils/logger.js';
import { StorageService } from './storage.js';
import { LlmService } from './llm.js';
import { EmbeddingService } from './embedding.js';

const logger = getLogger();

// Job data types
export interface TitleGenerationJobData {
  memoryId: string;
  text: string;
  type: string;
  tags?: string[];
}

export interface EmbeddingRegenerationJobData {
  memoryId: string;
  text: string;
  title?: string;
  tags?: string[];
}

export interface BulkEmbeddingRegenerationJobData {
  memoryIds?: string[]; // If not provided, regenerate all
}

// Job progress events
export interface JobProgress {
  jobId: string;
  jobType: string;
  progress: number; // 0-100
  status: 'active' | 'completed' | 'failed' | 'waiting';
  result?: unknown;
  error?: string;
  timestamp: Date;
}

@singleton()
@injectable()
export class QueueService {
  private connection: Redis;
  private titleQueue: Queue;
  private embeddingQueue: Queue;
  private titleWorker: Worker;
  private embeddingWorker: Worker;
  private titleEvents: QueueEvents;
  private embeddingEvents: QueueEvents;
  private progressListeners: Map<string, (progress: JobProgress) => void> = new Map();

  constructor() {
    // Create Redis connection (embedded or external)
    // Set a short connection timeout to fail fast if Redis is unavailable
    this.connection = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 2000, // Fail fast if Redis is not available
      retryStrategy: (times) => {
        // Stop retrying after a few attempts
        if (times > 2) {
          return null;
        }
        return 200;
      },
    });

    // Add error handler to prevent unhandled rejections
    this.connection.on('error', (error) => {
      // Silently handle - errors will be caught when operations are attempted
      logger.debug('Redis connection error:', error.message);
    });

    // Create queues
    this.titleQueue = new Queue('title-generation', { connection: this.connection });
    this.embeddingQueue = new Queue('embedding-regeneration', {
      connection: this.connection,
    });

    // Create workers
    this.titleWorker = new Worker(
      'title-generation',
      async (job) => this.processTitleGeneration(job),
      { connection: this.connection.duplicate() }
    );

    this.embeddingWorker = new Worker(
      'embedding-regeneration',
      async (job) => this.processEmbeddingRegeneration(job),
      { connection: this.connection.duplicate(), concurrency: 5 }
    );

    // Create queue events for progress tracking
    this.titleEvents = new QueueEvents('title-generation', {
      connection: this.connection.duplicate(),
    });
    this.embeddingEvents = new QueueEvents('embedding-regeneration', {
      connection: this.connection.duplicate(),
    });

    // Set up event listeners
    this.setupEventListeners();

    logger.info('Queue service initialized');
  }

  /**
   * Set up event listeners for progress tracking
   */
  private setupEventListeners(): void {
    // Title generation events
    this.titleEvents.on('progress', ({ jobId, data }) => {
      this.emitProgress(jobId, 'title-generation', 'active', data as number);
    });

    this.titleEvents.on('completed', ({ jobId, returnvalue }) => {
      this.emitProgress(jobId, 'title-generation', 'completed', 100, returnvalue);
    });

    this.titleEvents.on('failed', ({ jobId, failedReason }) => {
      this.emitProgress(jobId, 'title-generation', 'failed', 0, undefined, failedReason);
    });

    // Embedding regeneration events
    this.embeddingEvents.on('progress', ({ jobId, data }) => {
      this.emitProgress(jobId, 'embedding-regeneration', 'active', data as number);
    });

    this.embeddingEvents.on('completed', ({ jobId, returnvalue }) => {
      this.emitProgress(jobId, 'embedding-regeneration', 'completed', 100, returnvalue);
    });

    this.embeddingEvents.on('failed', ({ jobId, failedReason }) => {
      this.emitProgress(jobId, 'embedding-regeneration', 'failed', 0, undefined, failedReason);
    });
  }

  /**
   * Emit progress event to listeners
   */
  private emitProgress(
    jobId: string,
    jobType: string,
    status: JobProgress['status'],
    progress: number,
    result?: unknown,
    error?: string
  ): void {
    const listener = this.progressListeners.get(jobId);
    if (listener) {
      listener({
        jobId,
        jobType,
        progress,
        status,
        result,
        error,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Add a progress listener for a specific job
   */
  addProgressListener(jobId: string, callback: (progress: JobProgress) => void): void {
    this.progressListeners.set(jobId, callback);
  }

  /**
   * Remove a progress listener
   */
  removeProgressListener(jobId: string): void {
    this.progressListeners.delete(jobId);
  }

  /**
   * Queue a title generation job
   */
  async queueTitleGeneration(data: TitleGenerationJobData): Promise<string> {
    const job = await this.titleQueue.add('generate-title', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    logger.info({ jobId: job.id, memoryId: data.memoryId }, 'Queued title generation job');
    return job.id!;
  }

  /**
   * Queue an embedding regeneration job for a single memory
   */
  async queueEmbeddingRegeneration(data: EmbeddingRegenerationJobData): Promise<string> {
    const job = await this.embeddingQueue.add('regenerate-embedding', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    logger.info({ jobId: job.id, memoryId: data.memoryId }, 'Queued embedding regeneration job');
    return job.id!;
  }

  /**
   * Queue bulk embedding regeneration
   */
  async queueBulkEmbeddingRegeneration(
    data: BulkEmbeddingRegenerationJobData
  ): Promise<string> {
    const job = await this.embeddingQueue.add('bulk-regenerate-embeddings', data, {
      attempts: 1,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    logger.info(
      { jobId: job.id, memoryCount: data.memoryIds?.length || 'all' },
      'Queued bulk embedding regeneration job'
    );
    return job.id!;
  }

  /**
   * Process title generation job
   */
  private async processTitleGeneration(
    job: Job<TitleGenerationJobData>
  ): Promise<{ title: string | null }> {
    const { memoryId, text, type, tags } = job.data;

    logger.info({ jobId: job.id, memoryId }, 'Processing title generation job');

    try {
      await job.updateProgress(10);

      const storage = container.resolve(StorageService);
      const llm = container.resolve(LlmService);

      // Get current memory
      const memory = await storage.getMemory(memoryId);
      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`);
      }

      await job.updateProgress(30);

      // Generate title
      const title = await llm.generateTitle(text, type, tags);

      await job.updateProgress(70);

      // Update memory with generated title
      if (title) {
        await storage.updateMemory(memoryId, { title });
        logger.info({ memoryId, title }, 'Title generated and saved');
      }

      await job.updateProgress(100);

      return { title };
    } catch (error) {
      logger.error({ error, jobId: job.id, memoryId }, 'Title generation job failed');
      throw error;
    }
  }

  /**
   * Process embedding regeneration job
   */
  private async processEmbeddingRegeneration(
    job: Job<EmbeddingRegenerationJobData | BulkEmbeddingRegenerationJobData>
  ): Promise<{ count: number }> {
    if ('memoryId' in job.data) {
      // Single memory regeneration
      return this.processSingleEmbeddingRegeneration(
        job as Job<EmbeddingRegenerationJobData>
      );
    } else {
      // Bulk regeneration
      return this.processBulkEmbeddingRegeneration(
        job as Job<BulkEmbeddingRegenerationJobData>
      );
    }
  }

  /**
   * Process single embedding regeneration
   */
  private async processSingleEmbeddingRegeneration(
    job: Job<EmbeddingRegenerationJobData>
  ): Promise<{ count: number }> {
    const { memoryId, text, title, tags } = job.data;

    logger.info({ jobId: job.id, memoryId }, 'Processing embedding regeneration job');

    try {
      await job.updateProgress(10);

      const storage = container.resolve(StorageService);
      const embeddingService = container.resolve(EmbeddingService);

      // Get current memory
      const memory = await storage.getMemory(memoryId, true);
      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`);
      }

      await job.updateProgress(30);

      // Generate new embeddings
      const contentEmbedding = await embeddingService.generateForContent(text);

      await job.updateProgress(60);

      const metadataEmbedding = await embeddingService.generateForMetadata(
        title || memory.title || '',
        tags || memory.tags
      );

      await job.updateProgress(80);

      // Update memory with new embeddings (without creating a new version)
      await storage.memoryTable.delete(`id = '${memoryId}'`);
      await storage.memoryTable.add([
        {
          ...memory,
          embedding: contentEmbedding,
          embedding_metadata: metadataEmbedding,
          created_at: memory.created_at.toISOString(),
          updated_at: memory.updated_at.toISOString(),
        },
      ]);

      await job.updateProgress(100);

      logger.info({ memoryId }, 'Embeddings regenerated');

      return { count: 1 };
    } catch (error) {
      logger.error({ error, jobId: job.id, memoryId: job.data.memoryId }, 'Embedding regeneration job failed');
      throw error;
    }
  }

  /**
   * Process bulk embedding regeneration
   */
  private async processBulkEmbeddingRegeneration(
    job: Job<BulkEmbeddingRegenerationJobData>
  ): Promise<{ count: number }> {
    const { memoryIds } = job.data;

    logger.info({ jobId: job.id, count: memoryIds?.length || 'all' }, 'Processing bulk embedding regeneration');

    try {
      const storage = container.resolve(StorageService);
      const embeddingService = container.resolve(EmbeddingService);

      // Get memories to process
      let memories;
      if (memoryIds && memoryIds.length > 0) {
        memories = await Promise.all(
          memoryIds.map((id) => storage.getMemory(id, true))
        );
        memories = memories.filter((m) => m !== null);
      } else {
        // Get all memories
        memories = await storage.listMemories(100000);
      }

      const total = memories.length;
      let processed = 0;

      for (const memory of memories) {
        if (!memory) continue;

        try {
          // Generate embeddings
          const contentEmbedding = await embeddingService.generateForContent(memory.text);
          const metadataEmbedding = await embeddingService.generateForMetadata(
            memory.title || '',
            memory.tags
          );

          // Update memory
          await storage.memoryTable.delete(`id = '${memory.id}'`);
          await storage.memoryTable.add([
            {
              ...memory,
              embedding: contentEmbedding,
              embedding_metadata: metadataEmbedding,
              created_at: memory.created_at.toISOString(),
              updated_at: memory.updated_at.toISOString(),
            },
          ]);

          processed++;
          const progress = Math.floor((processed / total) * 100);
          await job.updateProgress(progress);

          logger.debug({ memoryId: memory.id, progress: `${processed}/${total}` }, 'Regenerated embedding');
        } catch (error) {
          logger.error({ error, memoryId: memory.id }, 'Failed to regenerate embedding for memory');
          // Continue with next memory
        }
      }

      logger.info({ processed, total }, 'Bulk embedding regeneration complete');

      return { count: processed };
    } catch (error) {
      logger.error({ error, jobId: job.id }, 'Bulk embedding regeneration job failed');
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string, queueName: 'title-generation' | 'embedding-regeneration'): Promise<any> {
    const queue = queueName === 'title-generation' ? this.titleQueue : this.embeddingQueue;
    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress,
      state,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  /**
   * Get queue stats
   */
  async getQueueStats(): Promise<{
    titleQueue: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
    embeddingQueue: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
  }> {
    const [titleCounts, embeddingCounts] = await Promise.all([
      this.titleQueue.getJobCounts(),
      this.embeddingQueue.getJobCounts(),
    ]);

    return {
      titleQueue: {
        waiting: titleCounts.waiting || 0,
        active: titleCounts.active || 0,
        completed: titleCounts.completed || 0,
        failed: titleCounts.failed || 0,
      },
      embeddingQueue: {
        waiting: embeddingCounts.waiting || 0,
        active: embeddingCounts.active || 0,
        completed: embeddingCounts.completed || 0,
        failed: embeddingCounts.failed || 0,
      },
    };
  }

  /**
   * Clean up completed jobs
   */
  async cleanJobs(maxAge: number = 86400000): Promise<void> {
    // 24 hours default
    await Promise.all([
      this.titleQueue.clean(maxAge, 100, 'completed'),
      this.titleQueue.clean(maxAge, 100, 'failed'),
      this.embeddingQueue.clean(maxAge, 100, 'completed'),
      this.embeddingQueue.clean(maxAge, 100, 'failed'),
    ]);

    logger.info({ maxAge }, 'Cleaned old jobs');
  }

  /**
   * Shutdown the queue service
   */
  async shutdown(): Promise<void> {
    await Promise.all([
      this.titleWorker.close(),
      this.embeddingWorker.close(),
      this.titleQueue.close(),
      this.embeddingQueue.close(),
      this.titleEvents.close(),
      this.embeddingEvents.close(),
      this.connection.quit(),
    ]);

    logger.info('Queue service shutdown');
  }
}
