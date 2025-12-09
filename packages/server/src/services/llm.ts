/**
 * LLM Service - Lite Version (No AI Model)
 * Generates simple titles from content truncation
 */

import { injectable, singleton } from 'tsyringe';
import { getLogger } from '../utils/logger.js';

interface TitleGenerationOptions {
  temperature?: number;
  maxTokens?: number;
}

@singleton()
@injectable()
export class LlmService {
  private initialized = true; // Always initialized (no model to load)

  /**
   * Initialize the LLM service (no-op for lite version)
   */
  async initialize(_modelPath: string): Promise<void> {
    const logger = getLogger();
    logger.info('LLM Service: Using lite mode (simple title generation from content)');
    this.initialized = true;
  }

  /**
   * Generate a title from content (simple truncation)
   */
  async generateTitle(
    content: string,
    _memoryType: string,
    tags?: string[],
    _options: TitleGenerationOptions = {}
  ): Promise<string | null> {
    if (!content || content.trim().length === 0) {
      return null;
    }

    try {
      // Clean the content (remove extra whitespace, newlines)
      const cleaned = content.replace(/\s+/g, ' ').trim();

      // Try to extract first sentence or first 80 chars
      const firstSentence = cleaned.match(/^[^.!?]+[.!?]/);
      if (firstSentence && firstSentence[0].length <= 80) {
        return firstSentence[0].trim();
      }

      // Fallback: truncate to 80 chars at word boundary
      if (cleaned.length <= 80) {
        return cleaned;
      }

      // Find last space before 80 chars
      const truncated = cleaned.substring(0, 80);
      const lastSpace = truncated.lastIndexOf(' ');

      if (lastSpace > 40) {
        // If we found a space after char 40, use it
        return truncated.substring(0, lastSpace) + '...';
      }

      // Otherwise just hard truncate
      return truncated + '...';
    } catch (error) {
      const logger = getLogger();
      logger.error(error, 'Failed to generate title');
      return null;
    }
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
    return Promise.all(
      items.map((item) =>
        this.generateTitle(item.content, item.memoryType, item.tags, options)
      )
    );
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
      available: true,
      modelName: 'Simple Text Truncation (Lite Mode)',
      quantization: 'N/A',
    };
  }
}
