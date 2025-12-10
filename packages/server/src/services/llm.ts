// @ts-nocheck - TODO: Fix type assertions
/**
 * LLM Service using node-llama-cpp + TinyLlama
 */

import { getLlama, LlamaModel, LlamaContext, LlamaChatSession } from 'node-llama-cpp';
import { injectable, singleton } from 'tsyringe';
import { join } from 'path';
import { existsSync } from 'fs';
import { getLogger } from '../utils/logger.js';

interface TitleGenerationOptions {
  temperature?: number;
  maxTokens?: number;
}

@singleton()
@injectable()
export class LlmService {
  private llama: Awaited<ReturnType<typeof getLlama>> | null = null;
  private model: LlamaModel | null = null;
  private context: LlamaContext | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  private readonly MODEL_FILENAME = 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';

  /**
   * Initialize the LLM model
   */
  async initialize(modelPath: string): Promise<void> {
    // If already initialized, return
    if (this.initialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this._initialize(modelPath);
    await this.initializationPromise;
  }

  private async _initialize(modelPath: string): Promise<void> {
    const logger = getLogger();

    try {
      const modelFile = join(modelPath, this.MODEL_FILENAME);

      // Check if model file exists
      if (!existsSync(modelFile)) {
        logger.warn(
          `LLM model not found at ${modelFile}. Title generation will be disabled.`
        );
        logger.info(
          'Run the model download script or use the offline package variant to enable title generation.'
        );
        return;
      }

      logger.info('Loading LLM model: TinyLlama 1.1B (Q4_K_M quantized, ~637MB)...');

      // Get Llama instance (v3.x API)
      this.llama = await getLlama();

      // Load the model (v3.x API)
      this.model = await this.llama.loadModel({
        modelPath: modelFile,
        gpuLayers: 0, // CPU only (GPU would be faster but requires CUDA/Metal)
      });

      // Create context (v3.x API)
      this.context = await this.model.createContext({
        contextSize: 2048, // Tokens
        batchSize: 512,
      });

      this.initialized = true;
      logger.info('LLM model loaded successfully');
    } catch (error) {
      const logger = getLogger();
      logger.error(error, 'Failed to load LLM model');
      logger.warn('Title generation will be disabled');
      // Don't throw - gracefully degrade
    }
  }

  /**
   * Generate a title for memory content
   */
  async generateTitle(
    content: string,
    memoryType: string,
    tags?: string[],
    options: TitleGenerationOptions = {}
  ): Promise<string | null> {
    // Check if model is available
    if (!this.initialized || !this.context || !this.llama) {
      const logger = getLogger();
      logger.debug('LLM not initialized, skipping title generation');
      return null;
    }

    try {
      const prompt = this.createTitlePrompt(content, memoryType, tags);

      // Create chat session (v3.x API)
      const session = new LlamaChatSession({
        contextSequence: this.context.getSequence(),
      });

      // Create grammar for JSON schema (v3.x API for structured output)
      const grammar = await this.llama.createGrammarForJsonSchema({
        type: 'object',
        properties: {
          title: { type: 'string' },
        },
        required: ['title'],
      });

      // Generate response with JSON grammar
      const response = await session.prompt(prompt, {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 100,
        grammar,
      });

      // Parse JSON response using grammar
      try {
        const parsed = grammar.parse(response);
        if (parsed && parsed.title && typeof parsed.title === 'string') {
          return parsed.title.substring(0, 80); // Max 80 chars
        }
      } catch (parseError) {
        // Fallback: try manual JSON parse
        try {
          const parsed = JSON.parse(response);
          if (parsed.title && typeof parsed.title === 'string') {
            return parsed.title.substring(0, 80);
          }
        } catch {
          // If JSON parsing fails, try to extract title from response
          const titleMatch = response.match(/"title"\s*:\s*"([^"]+)"/);
          if (titleMatch && titleMatch[1]) {
            return titleMatch[1].substring(0, 80);
          }

          // Last resort: use first line of response
          const firstLine = response.split('\n')[0].trim();
          if (firstLine && firstLine.length > 0) {
            return firstLine.substring(0, 80);
          }
        }
      }

      return null;
    } catch (error) {
      const logger = getLogger();
      logger.error(error, 'Failed to generate title');
      return null;
    }
  }

  /**
   * Create prompt for title generation
   */
  private createTitlePrompt(content: string, type: string, tags?: string[]): string {
    const truncatedContent = content.substring(0, 2000); // Limit content length
    const tagStr = tags && tags.length > 0 ? tags.join(', ') : 'none';

    return `You are a helpful assistant that generates concise, descriptive titles for memory entries.

Type: ${type}
Content: ${truncatedContent}
Tags: ${tagStr}

Generate a short, descriptive title (max 80 characters) that summarizes the main idea of this content.

Respond in JSON format:
{ "title": "your title here" }`;
  }

  /**
   * Generate multiple titles in batch
   */
  async generateTitleBatch(
    items: Array<{
      content: string;
      memoryType: string;
      tags?: string[];
    }>,
    options: TitleGenerationOptions = {}
  ): Promise<Array<string | null>> {
    // Process sequentially to avoid overwhelming the model
    const results: Array<string | null> = [];

    for (const item of items) {
      const title = await this.generateTitle(
        item.content,
        item.memoryType,
        item.tags,
        options
      );
      results.push(title);
    }

    return results;
  }

  /**
   * Check if the service is initialized and ready
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get model information
   */
  getModelInfo(): { available: boolean; modelName: string; quantization: string } {
    return {
      available: this.initialized,
      modelName: 'TinyLlama-1.1B-Chat-v1.0',
      quantization: 'Q4_K_M',
    };
  }
}
