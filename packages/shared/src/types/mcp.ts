/**
 * Model Context Protocol types
 */

export interface McpToolParams {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface StoreMemoryParams {
  type: string;
  content: Record<string, unknown>;
  text: string;
  source: string;
  tags?: string[];
  confidence?: number;
  title?: string;
}

export interface SearchMemoryParams {
  query: string;
  limit?: number;
  threshold?: number;
  types?: string[];
  tags?: string[];
}

export interface GetMemoryParams {
  id: string;
  include_versions?: boolean;
  include_relationships?: boolean;
}

export interface EditMemoryParams {
  id: string;
  updates: {
    type?: string;
    content?: Record<string, unknown>;
    text?: string;
    source?: string;
    tags?: string[];
    confidence?: number;
    title?: string;
  };
}

export interface DeleteMemoryParams {
  id: string;
}

export interface CreateRelationshipParams {
  from_memory_id: string;
  to_memory_id: string;
  type: string;
  score?: number;
}

export interface GetRelationshipsParams {
  memory_id: string;
  direction?: 'outgoing' | 'incoming' | 'both';
  type?: string;
}

export interface RevertMemoryParams {
  id: string;
  version_number: number;
}

export interface McpToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
