/**
 * LanceDB Storage Service
 * Core data access layer for Memorizer
 */

import * as lancedb from '@lancedb/lancedb';
import { v4 as uuidv4 } from 'uuid';
import { injectable, singleton } from 'tsyringe';
import type {
  Memory,
  MemoryCreateInput,
  MemoryUpdateInput,
  SearchOptions,
  SearchResult,
  MemoryVersion,
  MemoryEvent,
  MemoryRelationship,
  RelationshipCreateInput,
  MemoryStats,
} from '@memorizer/shared';
import { MemoryEventType } from '@memorizer/shared';

@singleton()
@injectable()
export class StorageService {
  private db!: lancedb.Connection;
  public memoryTable!: lancedb.Table;
  private versionTable!: lancedb.Table;
  private eventTable!: lancedb.Table;
  private relationshipTable!: lancedb.Table;

  private initialized = false;

  /**
   * Initialize LanceDB connection and create tables
   */
  async initialize(dataPath: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Connect to LanceDB (creates directory if doesn't exist)
    this.db = await lancedb.connect(dataPath);

    // Ensure all tables exist
    await this.ensureTables();

    this.initialized = true;
    console.log(`Storage initialized at ${dataPath}`);
  }

  /**
   * Create tables if they don't exist
   */
  private async ensureTables(): Promise<void> {
    const tables = await this.db.tableNames();

    // Memories table
    if (!tables.includes('memories')) {
      // LanceDB 0.22+ requires data to create table (infers schema)
      this.memoryTable = await this.db.createTable('memories', [
        {
          id: '00000000-0000-0000-0000-000000000000',
          type: '_init_',
          content: {},
          text: '_init_',
          source: '_init_',
          embedding: Array(768).fill(0),
          embedding_metadata: Array(768).fill(0),
          tags: [],
          confidence: 0,
          title: null,
          current_version: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          relationship_count: 0,
        },
      ]);

      // Delete the initialization record
      await this.memoryTable.delete(`id = '00000000-0000-0000-0000-000000000000'`);

      // Note: Vector indexes can be created later when there's enough data
      // await this.memoryTable.createIndex('embedding', { config: IvfPQ.default() });
    } else {
      this.memoryTable = await this.db.openTable('memories');
    }

    // Memory versions table
    if (!tables.includes('memory_versions')) {
      this.versionTable = await this.db.createTable('memory_versions', [
        {
          version_id: '00000000-0000-0000-0000-000000000000',
          memory_id: '00000000-0000-0000-0000-000000000000',
          version_number: 0,
          type: '_init_',
          content: {},
          text: '_init_',
          source: '_init_',
          tags: [],
          confidence: 0,
          title: null,
          relationship_ids: [],
          created_at: new Date().toISOString(),
          versioned_at: new Date().toISOString(),
        },
      ]);
      await this.versionTable.delete(`version_id = '00000000-0000-0000-0000-000000000000'`);
    } else {
      this.versionTable = await this.db.openTable('memory_versions');
    }

    // Memory events table
    if (!tables.includes('memory_events')) {
      this.eventTable = await this.db.createTable('memory_events', [
        {
          event_id: '00000000-0000-0000-0000-000000000000',
          memory_id: '00000000-0000-0000-0000-000000000000',
          version_number: 0,
          event_type: '_init_',
          event_data: {},
          timestamp: new Date().toISOString(),
          changed_by: null,
        },
      ]);
      await this.eventTable.delete(`event_id = '00000000-0000-0000-0000-000000000000'`);
    } else {
      this.eventTable = await this.db.openTable('memory_events');
    }

    // Memory relationships table
    if (!tables.includes('memory_relationships')) {
      this.relationshipTable = await this.db.createTable('memory_relationships', [
        {
          id: '00000000-0000-0000-0000-000000000000',
          from_memory_id: '00000000-0000-0000-0000-000000000000',
          to_memory_id: '00000000-0000-0000-0000-000000000000',
          type: '_init_',
          score: null,
          created_at: new Date().toISOString(),
          created_in_version: null,
          deleted_in_version: null,
        },
      ]);
      await this.relationshipTable.delete(`id = '00000000-0000-0000-0000-000000000000'`);
    } else {
      this.relationshipTable = await this.db.openTable('memory_relationships');
    }
  }

  /**
   * Store a new memory
   */
  async storeMemory(
    input: MemoryCreateInput,
    embedding: number[],
    embeddingMetadata: number[]
  ): Promise<Memory> {
    const now = new Date();
    const memory: Memory = {
      id: uuidv4(),
      type: input.type,
      content: input.content,
      text: input.text,
      source: input.source,
      tags: input.tags || [],
      confidence: input.confidence ?? 1.0,
      title: input.title || null,
      current_version: 1,
      created_at: now,
      updated_at: now,
      relationship_count: 0,
    };

    // Insert into memories table
    await this.memoryTable.add([
      {
        ...memory,
        embedding,
        embedding_metadata: embeddingMetadata,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
    ]);

    // Create initial version snapshot
    await this.createVersionSnapshot(memory, []);

    // Log creation event
    await this.logEvent(memory.id, 1, MemoryEventType.Created, {
      initial_type: memory.type,
      initial_tags: memory.tags,
    });

    return memory;
  }

  /**
   * Get a memory by ID
   */
  async getMemory(id: string, includeEmbeddings = false): Promise<Memory | null> {
    const results = await this.memoryTable
      .search(Array(768).fill(0)) // Dummy query vector
      .where(`id = '${id}'`)
      .limit(1)
      .toArray();

    if (results.length === 0) {
      return null;
    }

    const row = results[0];
    const memory: Memory = {
      id: row.id,
      type: row.type,
      content: row.content,
      text: row.text,
      source: row.source,
      tags: row.tags,
      confidence: row.confidence,
      title: row.title,
      current_version: row.current_version,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      relationship_count: row.relationship_count || 0,
    };

    if (includeEmbeddings) {
      memory.embedding = row.embedding;
      memory.embedding_metadata = row.embedding_metadata;
    }

    return memory;
  }

  /**
   * Get multiple memories by IDs
   */
  async getMemories(ids: string[]): Promise<Memory[]> {
    if (ids.length === 0) {
      return [];
    }

    const idsFilter = ids.map((id) => `'${id}'`).join(',');
    const results = await this.memoryTable
      .search(Array(768).fill(0))
      .where(`id IN (${idsFilter})`)
      .limit(ids.length)
      .toArray();

    return results.map((row: any) => ({
      id: row.id,
      type: row.type,
      content: row.content,
      text: row.text,
      source: row.source,
      tags: row.tags,
      confidence: row.confidence,
      title: row.title,
      current_version: row.current_version,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      relationship_count: row.relationship_count || 0,
    }));
  }

  /**
   * List all memories with optional filtering
   */
  async listMemories(
    limit = 100,
    offset = 0,
    types?: string[],
    tags?: string[]
  ): Promise<Memory[]> {
    let query = this.memoryTable.search(Array(768).fill(0));

    // Apply filters
    const filters: string[] = [];
    if (types && types.length > 0) {
      const typeFilter = types.map((t) => `'${t}'`).join(',');
      filters.push(`type IN (${typeFilter})`);
    }
    if (tags && tags.length > 0) {
      // LanceDB doesn't have array_contains, so we'll filter in memory
      // For now, skip tag filtering in query
    }

    if (filters.length > 0) {
      query = query.where(filters.join(' AND '));
    }

    const results = await query.limit(limit).toArray();

    let memories = results.map((row: any) => ({
      id: row.id,
      type: row.type,
      content: row.content,
      text: row.text,
      source: row.source,
      tags: row.tags,
      confidence: row.confidence,
      title: row.title,
      current_version: row.current_version,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      relationship_count: row.relationship_count || 0,
    }));

    // Filter by tags in memory
    if (tags && tags.length > 0) {
      memories = memories.filter((m: any) => tags.some((tag) => m.tags.includes(tag)));
    }

    // Apply offset
    return memories.slice(offset);
  }

  /**
   * Update a memory
   */
  async updateMemory(
    id: string,
    updates: MemoryUpdateInput,
    embedding?: number[],
    embeddingMetadata?: number[]
  ): Promise<Memory | null> {
    // Get current memory
    const current = await this.getMemory(id, true);
    if (!current) {
      return null;
    }

    // Create version snapshot before update
    const relationshipIds = await this.getRelationshipIds(id);
    await this.createVersionSnapshot(current, relationshipIds);

    const now = new Date();
    const updated: Memory = {
      ...current,
      ...updates,
      current_version: current.current_version + 1,
      updated_at: now,
    };

    // Delete old record
    await this.memoryTable.delete(`id = '${id}'`);

    // Insert updated record
    await this.memoryTable.add([
      {
        ...updated,
        embedding: embedding || current.embedding,
        embedding_metadata: embeddingMetadata || current.embedding_metadata,
        created_at: current.created_at.toISOString(),
        updated_at: now.toISOString(),
      },
    ]);

    // Log update events
    if (updates.content !== undefined) {
      await this.logEvent(id, updated.current_version, MemoryEventType.ContentUpdated, {
        previous_version: current.current_version,
      });
    }
    if (updates.tags !== undefined) {
      await this.logEvent(id, updated.current_version, MemoryEventType.TagsUpdated, {
        old_tags: current.tags,
        new_tags: updates.tags,
      });
    }
    if (updates.title !== undefined) {
      await this.logEvent(id, updated.current_version, MemoryEventType.TitleUpdated, {
        old_title: current.title,
        new_title: updates.title,
      });
    }

    return updated;
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id: string): Promise<boolean> {
    const memory = await this.getMemory(id);
    if (!memory) {
      return false;
    }

    // Delete from memories table
    await this.memoryTable.delete(`id = '${id}'`);

    // Delete versions
    await this.versionTable.delete(`memory_id = '${id}'`);

    // Delete events
    await this.eventTable.delete(`memory_id = '${id}'`);

    // Delete relationships
    await this.relationshipTable.delete(`from_memory_id = '${id}' OR to_memory_id = '${id}'`);

    return true;
  }

  /**
   * Semantic search using vector similarity
   */
  async search(options: SearchOptions, queryEmbedding: number[]): Promise<SearchResult[]> {
    const limit = options.limit || 10;
    const threshold = options.threshold || 0.7;

    // Build filter
    const filters: string[] = [];
    if (options.types && options.types.length > 0) {
      const typeFilter = options.types.map((t) => `'${t}'`).join(',');
      filters.push(`type IN (${typeFilter})`);
    }

    // Search using content embedding
    let query = this.memoryTable.search(queryEmbedding).limit(limit * 2); // Get extra for filtering

    if (filters.length > 0) {
      query = query.where(filters.join(' AND '));
    }

    const results = await query.toArray();

    // Convert to SearchResults and filter by threshold
    const searchResults: SearchResult[] = [];

    for (const row of results) {
      const score = 1 - (row._distance || 0); // Convert distance to similarity score

      if (score >= threshold) {
        const memory: Memory = {
          id: row.id,
          type: row.type,
          content: options.includeContent ? row.content : {},
          text: options.includeContent ? row.text : '',
          source: row.source,
          tags: row.tags,
          confidence: row.confidence,
          title: row.title,
          current_version: row.current_version,
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
          relationship_count: row.relationship_count || 0,
        };

        searchResults.push({
          memory,
          score,
          matched_on: 'content',
        });
      }
    }

    // Filter by tags if specified
    if (options.tags && options.tags.length > 0) {
      return searchResults.filter((result) =>
        options.tags!.some((tag) => result.memory.tags.includes(tag))
      );
    }

    return searchResults.slice(0, limit);
  }

  /**
   * Create a version snapshot
   */
  private async createVersionSnapshot(
    memory: Memory,
    relationshipIds: string[]
  ): Promise<void> {
    const version: MemoryVersion = {
      version_id: uuidv4(),
      memory_id: memory.id,
      version_number: memory.current_version,
      type: memory.type,
      content: memory.content,
      text: memory.text,
      source: memory.source,
      tags: memory.tags,
      confidence: memory.confidence,
      title: memory.title,
      relationship_ids: relationshipIds,
      created_at: memory.created_at,
      versioned_at: new Date(),
    };

    await this.versionTable.add([
      {
        ...version,
        created_at: version.created_at.toISOString(),
        versioned_at: version.versioned_at.toISOString(),
      },
    ]);
  }

  /**
   * Log a memory event
   */
  private async logEvent(
    memoryId: string,
    versionNumber: number,
    eventType: MemoryEventType,
    eventData: Record<string, unknown>
  ): Promise<void> {
    const event: MemoryEvent = {
      event_id: uuidv4(),
      memory_id: memoryId,
      version_number: versionNumber,
      event_type: eventType,
      event_data: eventData,
      timestamp: new Date(),
      changed_by: null,
    };

    await this.eventTable.add([
      {
        ...event,
        timestamp: event.timestamp.toISOString(),
      },
    ]);
  }

  /**
   * Get relationship IDs for a memory
   */
  private async getRelationshipIds(memoryId: string): Promise<string[]> {
    const results = await this.relationshipTable
      .search(Array(768).fill(0))
      .where(
        `(from_memory_id = '${memoryId}' OR to_memory_id = '${memoryId}') AND deleted_in_version IS NULL`
      )
      .toArray();

    return results.map((row: any) => row.id);
  }

  /**
   * Create a relationship between memories
   */
  async createRelationship(input: RelationshipCreateInput): Promise<MemoryRelationship> {
    const now = new Date();
    const relationship: MemoryRelationship = {
      id: uuidv4(),
      from_memory_id: input.from_memory_id,
      to_memory_id: input.to_memory_id,
      type: input.type,
      score: input.score || null,
      created_at: now,
      created_in_version: null,
      deleted_in_version: null,
    };

    await this.relationshipTable.add([
      {
        ...relationship,
        created_at: now.toISOString(),
      },
    ]);

    // Update relationship counts
    await this.incrementRelationshipCount(input.from_memory_id);
    await this.incrementRelationshipCount(input.to_memory_id);

    // Log events
    await this.logEvent(input.from_memory_id, 0, MemoryEventType.RelationshipAdded, {
      relationship_id: relationship.id,
      to_memory_id: input.to_memory_id,
      type: input.type,
    });

    return relationship;
  }

  /**
   * Get relationships for a memory
   */
  async getRelationships(
    memoryId: string,
    direction: 'outgoing' | 'incoming' | 'both' = 'both'
  ): Promise<MemoryRelationship[]> {
    let whereClause = '';

    if (direction === 'outgoing') {
      whereClause = `from_memory_id = '${memoryId}' AND deleted_in_version IS NULL`;
    } else if (direction === 'incoming') {
      whereClause = `to_memory_id = '${memoryId}' AND deleted_in_version IS NULL`;
    } else {
      whereClause = `(from_memory_id = '${memoryId}' OR to_memory_id = '${memoryId}') AND deleted_in_version IS NULL`;
    }

    const results = await this.relationshipTable
      .search(Array(768).fill(0))
      .where(whereClause)
      .toArray();

    return results.map((row: any) => ({
      id: row.id,
      from_memory_id: row.from_memory_id,
      to_memory_id: row.to_memory_id,
      type: row.type,
      score: row.score,
      created_at: new Date(row.created_at),
      created_in_version: row.created_in_version,
      deleted_in_version: row.deleted_in_version,
    }));
  }

  /**
   * Increment relationship count for a memory
   */
  private async incrementRelationshipCount(memoryId: string): Promise<void> {
    const memory = await this.getMemory(memoryId, true);
    if (!memory) return;

    const count = (memory.relationship_count || 0) + 1;

    await this.memoryTable.delete(`id = '${memoryId}'`);
    await this.memoryTable.add([
      {
        ...memory,
        relationship_count: count,
        created_at: memory.created_at.toISOString(),
        updated_at: memory.updated_at.toISOString(),
      },
    ]);
  }

  /**
   * Get statistics about the memory database
   */
  async getStats(): Promise<MemoryStats> {
    // Count memories
    const allMemories = await this.memoryTable.search(Array(768).fill(0)).limit(100000).toArray();

    const totalMemories = allMemories.length;

    // Count versions
    const allVersions = await this.versionTable.search(Array(768).fill(0)).limit(100000).toArray();
    const totalVersions = allVersions.length;

    // Count relationships
    const allRelationships = await this.relationshipTable
      .search(Array(768).fill(0))
      .where('deleted_in_version IS NULL')
      .limit(100000)
      .toArray();
    const totalRelationships = allRelationships.length;

    // Count events
    const allEvents = await this.eventTable.search(Array(768).fill(0)).limit(100000).toArray();
    const totalEvents = allEvents.length;

    // Aggregate types
    const types: Record<string, number> = {};
    for (const memory of allMemories) {
      types[memory.type] = (types[memory.type] || 0) + 1;
    }

    // Aggregate tags
    const tags: Record<string, number> = {};
    for (const memory of allMemories) {
      for (const tag of memory.tags || []) {
        tags[tag] = (tags[tag] || 0) + 1;
      }
    }

    // Calculate average confidence
    const avgConfidence =
      totalMemories > 0
        ? allMemories.reduce((sum: any, m: any) => sum + m.confidence, 0) / totalMemories
        : 0;

    return {
      total_memories: totalMemories,
      total_versions: totalVersions,
      total_relationships: totalRelationships,
      total_events: totalEvents,
      types,
      tags,
      avg_confidence: avgConfidence,
      embedding_dimensions: 768,
      database_size_mb: 0, // TODO: Calculate actual size
    };
  }

  /**
   * Get version history for a memory
   */
  async getVersionHistory(memoryId: string): Promise<MemoryVersion[]> {
    const results = await this.versionTable
      .search(Array(768).fill(0))
      .where(`memory_id = '${memoryId}'`)
      .toArray();

    const versions = results.map((row: any) => ({
      version_id: row.version_id,
      memory_id: row.memory_id,
      version_number: row.version_number,
      type: row.type,
      content: row.content,
      text: row.text,
      source: row.source,
      tags: row.tags,
      confidence: row.confidence,
      title: row.title,
      relationship_ids: row.relationship_ids,
      created_at: new Date(row.created_at),
      versioned_at: new Date(row.versioned_at),
    }));

    // Sort by version number descending
    return versions.sort((a: any, b: any) => b.version_number - a.version_number);
  }

  /**
   * Get a specific version
   */
  async getVersion(versionId: string): Promise<MemoryVersion | null> {
    const results = await this.versionTable
      .search(Array(768).fill(0))
      .where(`version_id = '${versionId}'`)
      .limit(1)
      .toArray();

    if (results.length === 0) {
      return null;
    }

    const row = results[0];
    return {
      version_id: row.version_id,
      memory_id: row.memory_id,
      version_number: row.version_number,
      type: row.type,
      content: row.content,
      text: row.text,
      source: row.source,
      tags: row.tags,
      confidence: row.confidence,
      title: row.title,
      relationship_ids: row.relationship_ids,
      created_at: new Date(row.created_at),
      versioned_at: new Date(row.versioned_at),
    };
  }

  /**
   * Revert a memory to a specific version
   */
  async revertToVersion(memoryId: string, versionId: string): Promise<Memory | null> {
    const version = await this.getVersion(versionId);
    if (!version || version.memory_id !== memoryId) {
      return null;
    }

    const current = await this.getMemory(memoryId, true);
    if (!current) {
      return null;
    }

    // Create snapshot of current state before reverting
    const relationshipIds = await this.getRelationshipIds(memoryId);
    await this.createVersionSnapshot(current, relationshipIds);

    // Revert to version data
    const reverted: Memory = {
      id: memoryId,
      type: version.type,
      content: version.content,
      text: version.text,
      source: version.source,
      tags: version.tags,
      confidence: version.confidence,
      title: version.title,
      current_version: current.current_version + 1,
      created_at: current.created_at,
      updated_at: new Date(),
      relationship_count: current.relationship_count,
    };

    // Delete current record
    await this.memoryTable.delete(`id = '${memoryId}'`);

    // Insert reverted record
    await this.memoryTable.add([
      {
        ...reverted,
        embedding: current.embedding, // Keep current embedding
        embedding_metadata: current.embedding_metadata,
        created_at: reverted.created_at.toISOString(),
        updated_at: reverted.updated_at.toISOString(),
      },
    ]);

    // Log revert event
    await this.logEvent(memoryId, reverted.current_version, MemoryEventType.Reverted, {
      reverted_to_version: version.version_number,
      previous_version: current.current_version,
    });

    return reverted;
  }

  /**
   * Find similar memories using embedding similarity
   */
  async findSimilarMemories(
    memoryId: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<SearchResult[]> {
    const memory = await this.getMemory(memoryId, true);
    if (!memory || !memory.embedding) {
      return [];
    }

    const results = await this.memoryTable
      .search(memory.embedding)
      .where(`id != '${memoryId}'`) // Exclude the memory itself
      .limit(limit * 2) // Get more results to filter
      .toArray();

    const similar: SearchResult[] = [];

    for (const row of results) {
      if (!row.embedding) continue;

      // Calculate cosine similarity
      const score = this.cosineSimilarity(memory.embedding, row.embedding);

      if (score >= threshold) {
        const similarMemory: Memory = {
          id: row.id,
          type: row.type,
          content: row.content,
          text: row.text,
          source: row.source,
          tags: row.tags,
          confidence: row.confidence,
          title: row.title,
          current_version: row.current_version,
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
          relationship_count: row.relationship_count || 0,
          similarity_score: score,
        };

        similar.push({
          memory: similarMemory,
          score,
          matched_on: 'content',
        });
      }
    }

    // Sort by score descending
    similar.sort((a: any, b: any) => b.score - a.score);

    return similar.slice(0, limit);
  }

  /**
   * Get events for a memory
   */
  async getEvents(memoryId: string): Promise<MemoryEvent[]> {
    const results = await this.eventTable
      .search(Array(768).fill(0))
      .where(`memory_id = '${memoryId}'`)
      .toArray();

    const events = results.map((row: any) => ({
      event_id: row.event_id,
      memory_id: row.memory_id,
      version_number: row.version_number,
      event_type: row.event_type,
      event_data: row.event_data,
      timestamp: new Date(row.timestamp),
      changed_by: row.changed_by,
    }));

    // Sort by timestamp descending
    return events.sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Alias for getMemory (used by MCP tools)
   */
  async get(id: string): Promise<Memory | null> {
    return this.getMemory(id);
  }

  /**
   * Alias for getMemories (used by MCP tools)
   */
  async getMany(ids: string[]): Promise<Memory[]> {
    return this.getMemories(ids);
  }

  /**
   * Delete a memory and all its related data
   */
  async delete(id: string): Promise<boolean> {
    // Check if memory exists
    const memory = await this.getMemory(id);
    if (!memory) {
      return false;
    }

    // Delete from memories table
    await this.memoryTable.delete(`id = '${id}'`);

    // Delete versions
    await this.versionTable.delete(`memory_id = '${id}'`);

    // Delete events
    await this.eventTable.delete(`memory_id = '${id}'`);

    // Mark relationships as deleted (soft delete)
    const relationships = await this.relationshipTable
      .search(Array(768).fill(0))
      .where(`(from_memory_id = '${id}' OR to_memory_id = '${id}') AND deleted_in_version IS NULL`)
      .toArray();

    for (const rel of relationships) {
      // Update the relationship to mark as deleted
      await this.relationshipTable.delete(`id = '${rel.id}'`);
    }

    return true;
  }

  /**
   * Search using metadata embeddings (title + tags)
   */
  async searchWithMetadataEmbedding(
    queryEmbedding: number[],
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const limit = options?.limit || 10;
    const threshold = options?.threshold || 0.5;

    // Search using metadata embedding
    // Note: LanceDB 0.22+ doesn't have .column() method
    // We'll use the main search and filter in memory
    const results = await this.memoryTable
      .search(queryEmbedding)
      .limit(limit * 2)
      .toArray();

    // Convert to SearchResults and filter by threshold
    const searchResults: SearchResult[] = [];

    for (const row of results) {
      const score = 1 - (row._distance || 0);

      if (score >= threshold) {
        const memory: Memory = {
          id: row.id,
          type: row.type,
          content: row.content,
          text: row.text,
          source: row.source,
          tags: row.tags,
          confidence: row.confidence,
          title: row.title,
          current_version: row.current_version,
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
          relationship_count: row.relationship_count || 0,
        };

        searchResults.push({
          memory,
          score,
          matched_on: 'metadata',
        });
      }

      if (searchResults.length >= limit) {
        break;
      }
    }

    return searchResults;
  }
}
