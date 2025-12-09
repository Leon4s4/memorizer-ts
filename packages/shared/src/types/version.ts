/**
 * Memory versioning and history types
 */

export interface MemoryVersion {
  version_id: string;
  memory_id: string;
  version_number: number;

  // Snapshot of content at this version
  type: string;
  content: Record<string, unknown>;
  text: string;
  source: string;
  tags: string[];
  confidence: number;
  title: string | null;

  // Snapshot of relationships
  relationship_ids: string[];

  // Metadata
  created_at: Date;
  versioned_at: Date;
}

export interface MemoryEvent {
  event_id: string;
  memory_id: string;
  version_number: number;
  event_type: MemoryEventType;
  event_data: Record<string, unknown>;
  timestamp: Date;
  changed_by: string | null;
}

export enum MemoryEventType {
  Created = 'memory_created',
  ContentUpdated = 'content_updated',
  TagsUpdated = 'tags_updated',
  TitleUpdated = 'title_updated',
  TypeUpdated = 'type_updated',
  Reverted = 'memory_reverted',
  RelationshipAdded = 'relationship_added',
  RelationshipRemoved = 'relationship_removed',
}

export interface VersionDiff {
  from_version: number;
  to_version: number;
  changes: FieldChange[];
}

export interface FieldChange {
  field: string;
  old_value: unknown;
  new_value: unknown;
  change_type: 'added' | 'removed' | 'modified';
}

export interface MemoryRelationship {
  id: string;
  from_memory_id: string;
  to_memory_id: string;
  type: string;
  score: number | null;
  created_at: Date;
  created_in_version: number | null;
  deleted_in_version: number | null;
}

export interface RelationshipCreateInput {
  from_memory_id: string;
  to_memory_id: string;
  type: string;
  score?: number;
}
