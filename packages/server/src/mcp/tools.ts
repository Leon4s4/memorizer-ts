// @ts-nocheck - TODO: Fix API signature mismatches
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorageService } from '../services/storage.js';
import type { Memory } from '@memorizer/shared';

/**
 * MCP Tools for Memory Operations
 *
 * Provides a comprehensive set of tools for LLMs to interact with memory storage.
 * All changes are versioned and can be reverted.
 */
export class MemoryTools {
  constructor(private storage: StorageService) {}

  /**
   * Get all tool definitions for MCP
   */
  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'store',
        description:
          'Store a new memory in the database, optionally creating a relationship to another memory. Use this to save reference material, how-to guides, coding standards, or any information you (the LLM) may want to refer to when completing tasks. Include as much context as possible, such as markdown, code samples, and detailed explanations. Create relationships to link related reference materials or examples.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description:
                'The type of memory (e.g., \'conversation\', \'document\', \'reference\', \'how-to\', \'todo-list\', etc.). Use \'reference\' or \'how-to\' for reusable knowledge.',
            },
            text: {
              type: 'string',
              description:
                'Plain text (markdown, code, prose, etc.) to store. Include as much context as possible.',
            },
            source: {
              type: 'string',
              description:
                'The source of the memory (e.g., \'user\', \'system\', \'LLM\', etc.). Use \'LLM\' if you are storing knowledge for your own future use.',
            },
            title: {
              type: 'string',
              description: 'Title for the memory. Should be descriptive and searchable.',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Optional tags to categorize the memory. Use tags like \'coding-standard\', \'unit-test\', \'reference\', \'how-to\', \'todo\', etc. to make retrieval easier.',
            },
            confidence: {
              type: 'number',
              description: 'Confidence score for the memory (0.0 to 1.0)',
              default: 1.0,
            },
            relatedTo: {
              type: 'string',
              description:
                'Optionally, the ID of a related memory. Use this to link related reference materials, how-tos, or examples.',
            },
            relationshipType: {
              type: 'string',
              description:
                'Optionally, the type of relationship to create (e.g., \'example-of\', \'explains\', \'related-to\'). Use relationships to connect related knowledge.',
            },
          },
          required: ['type', 'text', 'source', 'title'],
        },
      },
      {
        name: 'edit',
        description:
          'Edit an existing memory using find-and-replace. Ideal for checking off to-do items, updating sections, or fixing typos. IMPORTANT: The edit will FAIL if old_text is not found exactly - always use Get first to see current content and copy the exact text to replace. All changes are versioned and can be reverted.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The ID of the memory to edit.',
            },
            old_text: {
              type: 'string',
              description:
                'The exact text to find and replace. Must match exactly (case-sensitive). For multi-line replacements, include the full text including newlines.',
            },
            new_text: {
              type: 'string',
              description: 'The text to replace it with. Can be different length than old_text.',
            },
            replace_all: {
              type: 'boolean',
              description:
                'If true, replaces ALL occurrences of old_text. If false (default), only replaces the first occurrence. Use false for safety when editing unique content.',
              default: false,
            },
          },
          required: ['id', 'old_text', 'new_text'],
        },
      },
      {
        name: 'update_metadata',
        description:
          'Update a memory\'s metadata (title, type, tags, confidence) without changing the content or regenerating embeddings. Use Edit tool for content changes. All changes are versioned and can be reverted.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The ID of the memory to update.',
            },
            title: {
              type: 'string',
              description: 'Optional: New title for the memory. Pass null to keep existing.',
            },
            type: {
              type: 'string',
              description: 'Optional: New type for the memory. Pass null to keep existing.',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Optional: New tags for the memory. Pass null to keep existing, pass empty array to clear tags.',
            },
            confidence: {
              type: 'number',
              description: 'Optional: New confidence score (0.0 to 1.0). Pass null to keep existing.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_memories',
        description:
          'Search for memories similar to the provided text. Use this to retrieve reference material, how-tos, or examples relevant to the current task. Filtering by tags can help narrow down to specific types of knowledge.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'The text to search for similar memories. Use natural language queries to find relevant reference or how-to information.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
              default: 10,
            },
            minSimilarity: {
              type: 'number',
              description: 'Minimum similarity threshold (0.0 to 1.0)',
              default: 0.7,
            },
            filterTags: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Optional tags to filter memories (e.g., \'reference\', \'how-to\', \'coding-standard\')',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get',
        description:
          'Retrieve a specific memory by ID. Use this to fetch a particular reference, how-to, or example by its unique identifier. Optionally include version history or retrieve a specific past version.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description:
                'The ID of the memory to retrieve. Use this to fetch a specific piece of reference or how-to information.',
            },
            includeVersionHistory: {
              type: 'boolean',
              description:
                'Optional: If true, includes version history summary in the response (recent versions, change count).',
              default: false,
            },
            versionNumber: {
              type: 'number',
              description:
                'Optional: Specific version number to retrieve. If provided, returns that version\'s content instead of current.',
            },
            versionLimit: {
              type: 'number',
              description: 'Optional: Maximum number of versions to include in history (default: 5, max: 20).',
              default: 5,
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete',
        description:
          'Delete a memory by ID. This permanently removes the memory including all version history. Use this to remove outdated or incorrect reference or how-to information.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The ID of the memory to delete. Use this to remove a specific piece of knowledge.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_many',
        description:
          'Fetch multiple memories by their IDs. Use this to retrieve a set of related reference materials, how-tos, or examples.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description:
                'The list of memory IDs to fetch. Use this to retrieve multiple related pieces of knowledge at once.',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'create_relationship',
        description:
          'Create a relationship between two memories. Use this to link related reference materials, how-tos, or examples (e.g., \'example-of\', \'explains\', \'related-to\'). Relationships help organize knowledge for easier retrieval and understanding.',
        inputSchema: {
          type: 'object',
          properties: {
            fromId: {
              type: 'string',
              description:
                'The ID of the source memory (e.g., the reference or how-to that is providing context)',
            },
            toId: {
              type: 'string',
              description: 'The ID of the target memory (e.g., the example or related reference)',
            },
            type: {
              type: 'string',
              description:
                'The type of relationship (e.g., \'example-of\', \'explains\', \'related-to\'). Use relationships to connect and organize knowledge.',
            },
          },
          required: ['fromId', 'toId', 'type'],
        },
      },
      {
        name: 'revert_to_version',
        description:
          'Revert a memory to a previous version. Restores all content and metadata (title, type, tags, confidence) from the specified version. Creates a new version recording the revert operation and regenerates embeddings. Use Get with includeVersionHistory=true to see available versions first.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The ID of the memory to revert.',
            },
            versionNumber: {
              type: 'number',
              description:
                'The version number to revert to. Use Get with includeVersionHistory=true to see available versions.',
            },
            changedBy: {
              type: 'string',
              description:
                'Optional: Identifier of who is requesting the revert (e.g., \'user\', \'LLM\', \'system\').',
            },
          },
          required: ['id', 'versionNumber'],
        },
      },
    ];
  }

  /**
   * Execute a tool by name with the provided arguments
   */
  async executeTool(name: string, args: Record<string, unknown>): Promise<string> {
    switch (name) {
      case 'store':
        return this.store(args);
      case 'edit':
        return this.edit(args);
      case 'update_metadata':
        return this.updateMetadata(args);
      case 'search_memories':
        return this.searchMemories(args);
      case 'get':
        return this.get(args);
      case 'delete':
        return this.delete(args);
      case 'get_many':
        return this.getMany(args);
      case 'create_relationship':
        return this.createRelationship(args);
      case 'revert_to_version':
        return this.revertToVersion(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Store a new memory
   */
  private async store(args: Record<string, unknown>): Promise<string> {
    const {
      type,
      text,
      source,
      title,
      tags = [],
      confidence = 1.0,
      relatedTo,
      relationshipType,
    } = args as {
      type: string;
      text: string;
      source: string;
      title: string;
      tags?: string[];
      confidence?: number;
      relatedTo?: string;
      relationshipType?: string;
    };

    // Create new memory
    const memory = await this.storage.storeMemory(
      type,
      text,
    // @ts-ignore - API signature mismatch, needs refactoring
      source,
      tags,
      confidence,
      title
    );

    // Handle manual relationship creation if specified
    // @ts-ignore - API signature mismatch, needs refactoring
    if (relatedTo && relationshipType) {
      await this.storage.createRelationship(memory.id, relatedTo, relationshipType);
    }

    return `Memory stored successfully with ID: ${memory.id}. Use Edit tool to make targeted updates, or CreateRelationship to link to other memories.`;
  }

  /**
   * Edit a memory using find-and-replace
   */
  private async edit(args: Record<string, unknown>): Promise<string> {
    const { id, old_text, new_text, replace_all = false } = args as {
      id: string;
      old_text: string;
      new_text: string;
      replace_all?: boolean;
    };

    // Get existing memory
    const existingMemory = await this.storage.get(id);
    if (!existingMemory) {
      return `Memory with ID ${id} not found. Cannot edit non-existent memory.`;
    }

    // Check if old_text exists in the content
    if (!existingMemory.text.includes(old_text)) {
      const preview =
        existingMemory.text.length > 200
          ? existingMemory.text.substring(0, 200) + '...'
          : existingMemory.text;

      return (
        `Edit failed: The specified old_text was not found in the memory content.\n\n` +
        `old_text you provided (${old_text.length} chars):\n"${old_text}"\n\n` +
        `Current memory content preview:\n"${preview}"\n\n` +
        'Tip: Use Get tool first to see the exact current content, then copy the exact text you want to replace.'
      );
    }

    // Perform the replacement
    let newContent: string;
    let replacementCount: number;

    if (replace_all) {
      replacementCount = this.countOccurrences(existingMemory.text, old_text);
      newContent = existingMemory.text.replaceAll(old_text, new_text);
    } else {
      // Replace only first occurrence
      const index = existingMemory.text.indexOf(old_text);
      newContent =
        existingMemory.text.substring(0, index) +
        new_text +
        existingMemory.text.substring(index + old_text.length);
      replacementCount = 1;
    }

    // Check if anything actually changed
    if (newContent === existingMemory.text) {
      return 'No changes made - the replacement would result in identical content.';
    }

    // Update the memory with new content (keeps all other metadata the same)
    const updatedMemory = await this.storage.updateMemory(
      id,
      existingMemory.type,
    // @ts-ignore - API signature mismatch, needs refactoring
      newContent,
      existingMemory.source,
      existingMemory.tags,
      existingMemory.confidence,
      existingMemory.title
    );

    if (!updatedMemory) {
      return `Failed to save edit to memory ${id}.`;
    }

    return (
      `Edit successful. Made ${replacementCount} replacement(s). Memory ID: ${id}, New Version: ${updatedMemory.current_version}.\n` +
      'Changes are versioned and can be reverted using RevertToVersion if needed.'
    );
  }

  /**
   * Update memory metadata without changing content
   */
  private async updateMetadata(args: Record<string, unknown>): Promise<string> {
    const { id, title, type, tags, confidence } = args as {
      id: string;
      title?: string;
      type?: string;
      tags?: string[];
      confidence?: number;
    };

    // Get existing memory
    const existingMemory = await this.storage.get(id);
    if (!existingMemory) {
      return `Memory with ID ${id} not found.`;
    }

    // Use existing values for any null parameters
    const newTitle = title ?? existingMemory.title;
    const newType = type ?? existingMemory.type;
    const newTags = tags ?? existingMemory.tags;
    const newConfidence = confidence ?? existingMemory.confidence;

    // Update the memory (content stays the same)
    const updatedMemory = await this.storage.updateMemory(
      id,
    // @ts-ignore - API signature mismatch, needs refactoring
      newType,
      existingMemory.text,
      existingMemory.source,
      newTags,
      newConfidence,
      newTitle
    );

    if (!updatedMemory) {
      return `Failed to update metadata for memory ${id}.`;
    }

    const changes: string[] = [];
    if (title !== undefined) changes.push(`title='${title}'`);
    if (type !== undefined) changes.push(`type='${type}'`);
    if (tags !== undefined) changes.push(`tags=[${tags.join(', ')}]`);
    if (confidence !== undefined) changes.push(`confidence=${confidence.toFixed(2)}`);

    return `Metadata updated successfully. Changes: ${changes.join(', ')}. Memory ID: ${id}, New Version: ${updatedMemory.current_version}.`;
  }

  /**
   * Search for similar memories
   */
  private async searchMemories(args: Record<string, unknown>): Promise<string> {
    const {
      query,
      limit = 10,
      minSimilarity = 0.7,
      filterTags,
    } = args as {
      query: string;
      limit?: number;
      minSimilarity?: number;
      filterTags?: string[];
    };

    // @ts-ignore - API signature mismatch, needs refactoring
    // Search for similar memories using metadata embeddings (title + tags)
    let memories = await this.storage.searchWithMetadataEmbedding(
      query,
      limit,
      minSimilarity,
      filterTags
    );

    let usedFallback = false;
    let actualThreshold = minSimilarity;

    // If no results found, try with a 10% lower threshold (but not below 0.0)
    if (memories.length === 0 && minSimilarity > 0.0) {
    // @ts-ignore - API signature mismatch, needs refactoring
      const fallbackThreshold = Math.max(0.0, minSimilarity - 0.1);

      memories = await this.storage.searchWithMetadataEmbedding(
        query,
        limit,
        fallbackThreshold,
        filterTags
      );

      if (memories.length > 0) {
        usedFallback = true;
        actualThreshold = fallbackThreshold;
      }
    }

    if (memories.length === 0) {
      return 'No memories found matching your query, even with a relaxed similarity threshold. Try using different search terms or lowering the similarity threshold further.';
    }

    // Format the results
    let result = '';

    if (usedFallback) {
      result += `No results found at similarity threshold ${minSimilarity.toFixed(1)}, but found ${memories.length} memories at relaxed threshold ${actualThreshold.toFixed(1)}:\n\n`;
    } else {
    // @ts-ignore - SearchResult structure changed, needs refactoring
      result += `Found ${memories.length} memories:\n\n`;
    }

    // Collect all memory IDs for retrieval suggestion
    const memoryIds: string[] = [];

    for (const memory of memories) {
      memoryIds.push(memory.id);

      result += `ID: ${memory.id}\n`;
      if (memory.title) {
        result += `Title: ${memory.title}\n`;
      }
      result += `Type: ${memory.type}\n`;
      result += `Tags: ${memory.tags.length > 0 ? memory.tags.join(', ') : 'none'}\n`;

      if (memory.similarity_score !== undefined) {
        const percent = 100 * (1 - memory.similarity_score);
        result += `Similarity: ${percent.toFixed(1)}%\n`;
      }

      result += `Created: ${new Date(memory.created_at).toISOString().replace('T', ' ').substring(0, 19)}\n\n`;
    }

    // Add retrieval instructions for lightweight results
    result += '---\n';
    result += 'To retrieve the full content of these memories, use one of the following:\n';
    result += '• Get tool with a specific memory ID to fetch one memory\n';
    result += `• GetMany tool with IDs: [${memoryIds.join(', ')}]\n`;

    return result;
  }

  /**
   * Get a specific memory by ID
   */
  private async get(args: Record<string, unknown>): Promise<string> {
    const {
      id,
      includeVersionHistory = false,
      versionNumber,
      versionLimit = 5,
    } = args as {
      id: string;
      includeVersionHistory?: boolean;
      versionNumber?: number;
      versionLimit?: number;
    };

    // If requesting a specific version, get that version
    if (versionNumber !== undefined) {
      const versions = await this.storage.getVersionHistory(id);
      const version = versions.find((v) => v.version_number === versionNumber);

      if (!version) {
        return `Version ${versionNumber} not found for memory ID ${id}.`;
      }

      let result = `📜 VERSION ${version.version_number} (Historical Snapshot)\n`;
      result += `ID: ${version.memory_id}\n`;
      result += `Title: ${version.title || 'Untitled'}\n`;
      result += `Type: ${version.type}\n`;
      result += `Text: ${version.text}\n`;
      result += `Source: ${version.source}\n`;
      result += `Tags: ${version.tags.length > 0 ? version.tags.join(', ') : 'none'}\n`;
      result += `Confidence: ${version.confidence.toFixed(2)}\n`;
      result += `Original Created: ${new Date(version.created_at).toISOString().replace('T', ' ').substring(0, 19)}\n`;
      result += `Version Created: ${new Date(version.versioned_at).toISOString().replace('T', ' ').substring(0, 19)}\n\n`;
      result += '💡 Use RevertToVersion to restore this version as current, or Get with versionNumber to view other versions.\n';

      return result;
    }

    // Get current memory
    const memory = await this.storage.get(id);

    if (!memory) {
      return `Memory with ID ${id} not found.`;
    }

    let result = `ID: ${memory.id}\n`;
    if (memory.title) {
      result += `Title: ${memory.title}\n`;
    }
    result += `Type: ${memory.type}\n`;
    result += `Text: ${memory.text}\n`;
    result += `Source: ${memory.source}\n`;
    result += `Tags: ${memory.tags.length > 0 ? memory.tags.join(', ') : 'none'}\n`;
    result += `Confidence: ${memory.confidence.toFixed(2)}\n`;
    result += `Current Version: ${memory.current_version}\n`;

    if (memory.similarity_score !== undefined) {
      const percent = 100 * (1 - memory.similarity_score);
      result += `Similarity: ${percent.toFixed(1)}%\n`;
    }

    // Collect related memory IDs for suggestion
    const relatedMemoryIds = new Set<string>();

    // List relationships
    if (memory.relationship_count && memory.relationship_count > 0) {
      const relationships = await this.storage.getRelationships(id, 'both');

      if (relationships.length > 0) {
        result += `🔗 Relationships (${relationships.length}):\n`;
        for (const rel of relationships) {
          const relatedId = rel.from_memory_id === memory.id ? rel.to_memory_id : rel.from_memory_id;
          const direction = rel.from_memory_id === memory.id ? '→' : '←';

          result += `  • [${rel.type.toUpperCase()}] ${direction} [ID: ${relatedId}]\n`;

          // Collect related memory IDs
          if (rel.from_memory_id !== memory.id) relatedMemoryIds.add(rel.from_memory_id);
          if (rel.to_memory_id !== memory.id) relatedMemoryIds.add(rel.to_memory_id);
        }
      }
    }

    result += `Created: ${new Date(memory.created_at).toISOString().replace('T', ' ').substring(0, 19)}\n`;
    result += `Updated: ${new Date(memory.updated_at).toISOString().replace('T', ' ').substring(0, 19)}\n`;

    // Include version history if requested
    if (includeVersionHistory) {
      const limitClamped = Math.min(Math.max(versionLimit, 1), 20);
      const versions = await this.storage.getVersionHistory(id);
      const recentVersions = versions.slice(0, limitClamped);

      if (recentVersions.length > 0) {
        result += `\n📜 Version History (showing ${recentVersions.length} most recent):\n`;
        for (const version of recentVersions) {
          const events = await this.storage.getEvents(id);
          const versionEvents = events.filter((e) => e.version_number === version.version_number);
          const changeTypes = [...new Set(versionEvents.map((e) => e.event_type))];
          const changesDesc = changeTypes.length > 0 ? changeTypes.join(', ') : 'initial';

          result += `  v${version.version_number} (${new Date(version.versioned_at).toISOString().replace('T', ' ').substring(0, 16)}) - ${changesDesc}\n`;
        }
        result += '\n💡 Use Get with versionNumber parameter to view a specific version, or RevertToVersion to restore.\n';
      }
    }

    // Add suggestion to load related memories if any exist
    if (relatedMemoryIds.size > 0) {
      result += '\n💡 Suggestion: This memory has relationships to other memories in the database.\n';
      result += `Consider using GetMany with these IDs to load related context: [${Array.from(relatedMemoryIds).join(', ')}]\n`;
      result += 'This can provide additional relevant information and context for your task.\n';
    }

    return result;
  }

  /**
   * Delete a memory by ID
   */
  private async delete(args: Record<string, unknown>): Promise<string> {
    const { id } = args as { id: string };

    const success = await this.storage.delete(id);

    return success
      ? `Memory with ID ${id} deleted successfully.`
      : `Memory with ID ${id} not found or could not be deleted.`;
  }

  /**
   * Get multiple memories by IDs
   */
  private async getMany(args: Record<string, unknown>): Promise<string> {
    const { ids } = args as { ids: string[] };

    const memories = await this.storage.getMany(ids);

    if (memories.length === 0) {
      return 'No memories found for the provided IDs.';
    }

    let result = `Found ${memories.length} memories:\n\n`;

    // Collect all related memory IDs for suggestion
    const relatedMemoryIds = new Set<string>();

    for (const memory of memories) {
      result += `ID: ${memory.id}\n`;
      if (memory.title) {
        result += `Title: ${memory.title}\n`;
      }
      result += `Type: ${memory.type}\n`;
      result += `Text: ${memory.text}\n`;
      result += `Source: ${memory.source}\n`;
      result += `Tags: ${memory.tags.length > 0 ? memory.tags.join(', ') : 'none'}\n`;
      result += `Confidence: ${memory.confidence.toFixed(2)}\n`;

      // List relationships and collect related IDs
      if (memory.relationship_count && memory.relationship_count > 0) {
        const relationships = await this.storage.getRelationships(memory.id, 'both');

        if (relationships.length > 0) {
          result += `🔗 Relationships (${relationships.length}):\n`;
          for (const rel of relationships) {
            const relatedId =
              rel.from_memory_id === memory.id ? rel.to_memory_id : rel.from_memory_id;
            const direction = rel.from_memory_id === memory.id ? '→' : '←';

            result += `  • [${rel.type.toUpperCase()}] ${direction} [ID: ${relatedId}]\n`;

            // Collect related memory IDs (excluding memories we already have)
            if (rel.from_memory_id !== memory.id && !ids.includes(rel.from_memory_id))
              relatedMemoryIds.add(rel.from_memory_id);
            if (rel.to_memory_id !== memory.id && !ids.includes(rel.to_memory_id))
              relatedMemoryIds.add(rel.to_memory_id);
          }
        }
      }

      result += `Created: ${new Date(memory.created_at).toISOString().replace('T', ' ').substring(0, 19)}\n\n`;
    }

    // Add suggestion to load related memories if any exist
    if (relatedMemoryIds.size > 0) {
      result += '💡 Suggestion: These memories have relationships to other memories not included in this result.\n';
      result += `Consider using GetMany with these additional IDs to load more related context: [${Array.from(relatedMemoryIds).join(', ')}]\n`;
      result += 'This can provide additional relevant information and context for your task.\n';
    }

    return result;
  }

  /**
   * Create a relationship between two memories
   */
    // @ts-ignore - API signature mismatch, needs refactoring
  private async createRelationship(args: Record<string, unknown>): Promise<string> {
    const { fromId, toId, type } = args as {
      fromId: string;
      toId: string;
      type: string;
    };

    const rel = await this.storage.createRelationship(fromId, toId, type);
    return `Relationship created: ${rel.id} from ${rel.from_memory_id} to ${rel.to_memory_id} (type: ${rel.type})`;
  }

  /**
   * Revert a memory to a previous version
   */
  private async revertToVersion(args: Record<string, unknown>): Promise<string> {
    const { id, versionNumber, changedBy } = args as {
      id: string;
      versionNumber: number;
      changedBy?: string;
    };

    // First check the memory exists
    const existingMemory = await this.storage.get(id);
    if (!existingMemory) {
      return `Memory with ID ${id} not found. Cannot revert.`;
    // @ts-ignore - API signature mismatch, needs refactoring
    }

    // Check if already at the target version
    if (existingMemory.current_version === versionNumber) {
      return `Memory is already at version ${versionNumber}. No changes made.`;
    }

    // Perform the revert
    const revertedMemory = await this.storage.revertToVersion(id, versionNumber, changedBy);

    if (!revertedMemory) {
      return `Failed to revert memory to version ${versionNumber}. The version may not exist. Use Get with includeVersionHistory=true to see available versions.`;
    }

    let result = `✅ Memory successfully reverted to version ${versionNumber}.\n\n`;
    result += 'Restored state:\n';
    result += `  ID: ${revertedMemory.id}\n`;
    result += `  Title: ${revertedMemory.title || 'Untitled'}\n`;
    result += `  Type: ${revertedMemory.type}\n`;
    result += `  Tags: ${revertedMemory.tags.length > 0 ? revertedMemory.tags.join(', ') : 'none'}\n`;
    result += `  Confidence: ${revertedMemory.confidence.toFixed(2)}\n`;
    result += `  New Version: ${revertedMemory.current_version}\n\n`;
    result += 'Note: A new version has been created recording this revert. Embeddings have been regenerated.\n';
    result += 'Use Get with id to see the full restored content.\n';

    return result;
  }

  /**
   * Count occurrences of a pattern in text
   */
  private countOccurrences(text: string, pattern: string): number {
    let count = 0;
    let index = 0;
    while ((index = text.indexOf(pattern, index)) !== -1) {
      count++;
      index += pattern.length;
    }
    return count;
  }
}
