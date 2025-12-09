import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Memory } from '@memorizer/shared';

interface SimilarMemoriesProps {
  memoryId: string;
  limit?: number;
  threshold?: number;
}

export function SimilarMemories({ memoryId, limit = 5, threshold = 0.7 }: SimilarMemoriesProps) {
  const [similar, setSimilar] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSimilarMemories();
  }, [memoryId, limit, threshold]);

  const fetchSimilarMemories = async () => {
    try {
      const response = await fetch(
        `/api/memories/${memoryId}/similar?limit=${limit}&threshold=${threshold}`
      );
      if (!response.ok) throw new Error('Failed to fetch similar memories');

      const data = await response.json();
      setSimilar(data.similar);
    } catch (err) {
      setError('Failed to load similar memories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading similar memories...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (similar.length === 0) {
    return (
      <div className="text-gray-600 italic">
        No similar memories found (threshold: {(threshold * 100).toFixed(0)}%)
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">
        Similar Memories ({similar.length})
      </h3>

      <div className="space-y-3">
        {similar.map((memory) => (
          <div
            key={memory.id}
            className="border rounded-lg p-3 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <Link
                  to={`/memories/${memory.id}`}
                  className="font-semibold hover:text-blue-600"
                >
                  {memory.title || 'Untitled Memory'}
                </Link>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <span className="px-2 py-0.5 bg-gray-100 rounded">
                    {memory.type}
                  </span>
                  {memory.similarity_score !== undefined && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                      {(memory.similarity_score * 100).toFixed(1)}% similar
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-2 line-clamp-2">{memory.text}</p>

            {memory.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {memory.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
