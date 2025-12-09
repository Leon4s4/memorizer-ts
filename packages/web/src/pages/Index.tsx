import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Memory } from '@leon4s4/memorizer-shared';

export function Index() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/memories?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch memories');
      }
      const data = await response.json();
      setMemories(data.memories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) {
      return;
    }

    try {
      const response = await fetch(`/api/memories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete memory');
      }

      // Refresh list
      fetchMemories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete memory');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Loading memories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Memories</h1>
        <Link
          to="/create"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Create Memory
        </Link>
      </div>

      {memories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No memories yet</p>
          <Link
            to="/create"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-block"
          >
            Create your first memory
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">
                  {memory.title || 'Untitled'}
                </h3>
                <div className="flex gap-2">
                  <Link
                    to={`/memories/${memory.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View
                  </Link>
                  <Link
                    to={`/memories/${memory.id}/edit`}
                    className="text-sm text-primary hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteMemory(memory.id)}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-2">
                {memory.text.substring(0, 200)}
                {memory.text.length > 200 && '...'}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-secondary rounded">
                  {memory.type}
                </span>
                {memory.tags && memory.tags.length > 0 && (
                  <div className="flex gap-1">
                    {memory.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-accent rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <span>v{memory.current_version}</span>
                <span>
                  {new Date(memory.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
