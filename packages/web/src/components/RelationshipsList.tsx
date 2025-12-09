import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { MemoryRelationship, Memory } from '@memorizer/shared';

interface RelationshipsListProps {
  memoryId: string;
  direction?: 'outgoing' | 'incoming' | 'both';
}

interface RelationshipWithMemory extends MemoryRelationship {
  relatedMemory?: Memory;
}

export function RelationshipsList({ memoryId, direction = 'both' }: RelationshipsListProps) {
  const [relationships, setRelationships] = useState<RelationshipWithMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRelationships();
  }, [memoryId, direction]);

  const fetchRelationships = async () => {
    try {
      const response = await fetch(
        `/api/memories/${memoryId}/relationships?direction=${direction}`
      );
      if (!response.ok) throw new Error('Failed to fetch relationships');

      const data = await response.json();
      const rels = data.relationships;

      // Fetch related memories
      const withMemories = await Promise.all(
        rels.map(async (rel: MemoryRelationship) => {
          const relatedId =
            rel.from_memory_id === memoryId ? rel.to_memory_id : rel.from_memory_id;

          try {
            const memResponse = await fetch(`/api/memories/${relatedId}`);
            if (memResponse.ok) {
              const memory = await memResponse.json();
              return { ...rel, relatedMemory: memory };
            }
          } catch (err) {
            console.error('Failed to fetch related memory:', err);
          }

          return rel;
        })
      );

      setRelationships(withMemories);
    } catch (err) {
      setError('Failed to load relationships');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading relationships...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (relationships.length === 0) {
    return (
      <div className="text-gray-600 italic">
        No relationships found. Create relationships to connect related memories.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">
        Relationships ({relationships.length})
      </h3>

      <div className="space-y-3">
        {relationships.map((rel) => {
          const isOutgoing = rel.from_memory_id === memoryId;
          const directionLabel = isOutgoing ? '→' : '←';

          return (
            <div
              key={rel.id}
              className="border rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-2">
                <span className="text-2xl text-gray-400">{directionLabel}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                      {rel.type}
                    </span>
                    {rel.score !== null && rel.score !== undefined && (
                      <span className="text-xs text-gray-600">
                        Score: {rel.score.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {rel.relatedMemory ? (
                    <>
                      <Link
                        to={`/memories/${rel.relatedMemory.id}`}
                        className="font-semibold hover:text-blue-600"
                      >
                        {rel.relatedMemory.title || 'Untitled Memory'}
                      </Link>
                      <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                        {rel.relatedMemory.text}
                      </p>
                      {rel.relatedMemory.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {rel.relatedMemory.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Related memory not found
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
