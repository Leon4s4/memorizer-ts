/**
 * Core memory types shared between server and client
 */

export interface Memory {
  id: string;
  type: string;
  content: Record<string, unknown>;
  text: string;
  source: string;
  tags: string[];
  confidence: number;
  title: string | null;
  current_version: number;
  created_at: Date;
  updated_at: Date;

  // Embedding vectors (not always included in responses)
  embedding?: number[];
  embedding_metadata?: number[];

  // Denormalized counts
  relationship_count?: number;

  // Optional search metadata
  similarity_score?: number;
}

export interface MemoryCreateInput {
  type: string;
  content: Record<string, unknown>;
  text: string;
  source: string;
  tags?: string[];
  confidence?: number;
  title?: string;
}

export interface MemoryUpdateInput {
  type?: string;
  content?: Record<string, unknown>;
  text?: string;
  source?: string;
  tags?: string[];
  confidence?: number;
  title?: string;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  threshold?: number;
  types?: string[];
  tags?: string[];
  includeContent?: boolean;
}

export interface SearchResult {
  memory: Memory;
  score: number;
  matched_on: 'content' | 'metadata' | 'both';
}

export interface MemoryStats {
  total_memories: number;
  total_versions: number;
  total_relationships: number;
  total_events: number;
  types: Record<string, number>;
  tags: Record<string, number>;
  avg_confidence: number;
  embedding_dimensions: number;
  database_size_mb: number;
}
