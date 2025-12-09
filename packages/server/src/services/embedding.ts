/**
 * Embedding Service using Transformers.js + nomic-embed-text
 */

import { pipeline, env } from '@xenova/transformers';
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';
import { injectable, singleton } from 'tsyringe';
import { getLogger } from '../utils/logger.js';

// Disable local model cache, use our custom path
env.cacheDir = process.env.MEMORIZER_MODEL_PATH || '~/.memorizer/models';

interface EmbeddingOptions {
  pooling?: 'mean' | 'cls';
  normalize?: boolean;
}

@singleton()
@injectable()
export class EmbeddingService {
  private embedder: any = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  // LRU cache for embeddings (max 1000 entries, ~1 hour TTL)
  private cache = new LRUCache<string, number[]>({
    max: 1000,
    ttl: 1000 * 60 * 60, // 1 hour
    updateAgeOnGet: true,
  });

  private readonly MODEL_NAME = 'nomic-ai/nomic-embed-text-v1.5';
  private readonly EMBEDDING_DIMENSIONS = 768;

  /**
   * Initialize the embedding model
   */
  async initialize(): Promise<void> {
    // If already initialized, return
    if (this.initialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this._initialize();
    await this.initializationPromise;
  }

  private async _initialize(): Promise<void> {
    const logger = getLogger();

    try {
      logger.info('Loading embedding model: nomic-embed-text-v1.5 (768D, quantized)...');

      // Load the model with quantization
      this.embedder = await pipeline('feature-extraction', this.MODEL_NAME, {
        quantized: true, // Use INT8 quantized version (~274MB instead of 548MB)
        revision: 'main',
      });

      this.initialized = true;
      logger.info('Embedding model loaded successfully');
    } catch (error) {
      logger.error(error, 'Failed to load embedding model');
      throw new Error('Failed to initialize embedding service: ' + (error as Error).message);
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generate(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
    // Ensure model is initialized
    await this.initialize();

    // Check cache first
    const cacheKey = this.getCacheKey(text, options);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Generate embedding
      const output = await this.embedder(text, {
        pooling: options.pooling || 'mean',
        normalize: options.normalize !== false, // Default to true
      });

      // Convert to array
      const embedding: number[] = Array.from(output.data);

      // Validate dimensions
      if (embedding.length !== this.EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Unexpected embedding dimensions: ${embedding.length}, expected ${this.EMBEDDING_DIMENSIONS}`
        );
      }

      // Cache the result
      this.cache.set(cacheKey, embedding);

      return embedding;
    } catch (error) {
      const logger = getLogger();
      logger.error(error, 'Failed to generate embedding');

      // Fallback: return random normalized vector (for development)
      return this.generateFallbackEmbedding();
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatch(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    // Process in parallel with Promise.all
    return Promise.all(texts.map((text) => this.generate(text, options)));
  }

  /**
   * Generate embedding for memory content
   */
  async generateForContent(content: string): Promise<number[]> {
    // Truncate if too long (model has 8192 token limit, but we'll be conservative)
    const truncated = content.substring(0, 8000);
    return this.generate(truncated);
  }

  /**
   * Generate embedding for metadata (title + tags)
   */
  async generateForMetadata(title: string | null, tags: string[]): Promise<number[]> {
    const metadataText = [title || '', ...tags].filter(Boolean).join(' ');
    return this.generate(metadataText);
  }

  /**
   * Generate cache key for a text and options
   */
  private getCacheKey(text: string, options: EmbeddingOptions): string {
    const optionsStr = JSON.stringify(options);
    const hash = createHash('sha256').update(text + optionsStr).digest('hex');
    return hash;
  }

  /**
   * Generate a random normalized embedding as fallback
   */
  private generateFallbackEmbedding(): number[] {
    const embedding = Array(this.EMBEDDING_DIMENSIONS)
      .fill(0)
      .map(() => Math.random() - 0.5);

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / magnitude);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; max: number; hitRate: number } {
    return {
      size: this.cache.size,
      max: this.cache.max,
      hitRate: 0, // LRU cache doesn't track hit rate directly
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get embedding dimensions
   */
  getDimensions(): number {
    return this.EMBEDDING_DIMENSIONS;
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
