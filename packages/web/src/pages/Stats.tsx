import { useEffect, useState } from 'react';
import type { MemoryStats } from '@leon4s4/memorizer-shared';

export function Stats() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Loading statistics...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">
          {error || 'Failed to load statistics'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Statistics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Memories"
          value={stats.total_memories}
          description="Memories stored"
        />
        <StatCard
          title="Total Versions"
          value={stats.total_versions}
          description="Version snapshots"
        />
        <StatCard
          title="Relationships"
          value={stats.total_relationships}
          description="Memory connections"
        />
        <StatCard
          title="Events"
          value={stats.total_events}
          description="Audit log entries"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Memory Types</h2>
          {Object.keys(stats.types).length === 0 ? (
            <p className="text-muted-foreground">No memories yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.types).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="capitalize">{type}</span>
                  <span className="px-2 py-1 bg-secondary rounded text-sm">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Top Tags</h2>
          {Object.keys(stats.tags).length === 0 ? (
            <p className="text-muted-foreground">No tags yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.tags)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([tag, count]) => (
                  <div key={tag} className="flex justify-between items-center">
                    <span>#{tag}</span>
                    <span className="px-2 py-1 bg-secondary rounded text-sm">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-border rounded-lg p-6 bg-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Average Confidence
          </h3>
          <p className="text-2xl font-bold">
            {(stats.avg_confidence * 100).toFixed(1)}%
          </p>
        </div>

        <div className="border border-border rounded-lg p-6 bg-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Embedding Dimensions
          </h3>
          <p className="text-2xl font-bold">{stats.embedding_dimensions}D</p>
        </div>

        <div className="border border-border rounded-lg p-6 bg-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Database Size
          </h3>
          <p className="text-2xl font-bold">
            {stats.database_size_mb.toFixed(2)} MB
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="border border-border rounded-lg p-6 bg-card">
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
      <p className="text-3xl font-bold mb-1">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
