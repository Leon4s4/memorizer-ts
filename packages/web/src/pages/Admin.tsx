import { useState, useEffect } from 'react';
import { JobProgressMonitor } from '../components/JobProgressMonitor';

interface QueueStats {
  titleQueue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  embeddingQueue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}

export default function Admin() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Job tracking
  const [activeJobs, setActiveJobs] = useState<Array<{ jobId: string; type: string }>>([]);
  const [titleGenRunning, setTitleGenRunning] = useState(false);
  const [embeddingRegenRunning, setEmbeddingRegenRunning] = useState(false);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Failed to load queue statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startTitleGeneration = async () => {
    try {
      setTitleGenRunning(true);
      const response = await fetch('/api/admin/jobs/title-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty body means all memories without titles
      });

      if (!response.ok) throw new Error('Failed to start title generation');

      const data = await response.json();

      if (data.jobIds && data.jobIds.length > 0) {
        // Add first job to monitoring (others will be queued)
        setActiveJobs([...activeJobs, { jobId: data.jobIds[0], type: 'title-generation' }]);
        alert(`Started ${data.count} title generation jobs`);
      } else {
        alert(data.message || 'No jobs needed');
      }

      await fetchStats();
    } catch (err) {
      alert('Failed to start title generation: ' + (err as Error).message);
    } finally {
      setTitleGenRunning(false);
    }
  };

  const startEmbeddingRegeneration = async () => {
    try {
      setEmbeddingRegenRunning(true);
      const response = await fetch('/api/admin/jobs/embedding-regeneration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty body means all memories
      });

      if (!response.ok) throw new Error('Failed to start embedding regeneration');

      const data = await response.json();
      setActiveJobs([...activeJobs, { jobId: data.jobId, type: 'embedding-regeneration' }]);

      alert('Embedding regeneration job started');
      await fetchStats();
    } catch (err) {
      alert('Failed to start embedding regeneration: ' + (err as Error).message);
    } finally {
      setEmbeddingRegenRunning(false);
    }
  };

  const cleanJobs = async () => {
    if (!confirm('This will clean up completed and failed jobs older than 24 hours. Continue?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/jobs/clean', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to clean jobs');

      alert('Jobs cleaned successfully');
      await fetchStats();
    } catch (err) {
      alert('Failed to clean jobs: ' + (err as Error).message);
    }
  };

  const removeJobMonitor = (jobId: string) => {
    setActiveJobs(activeJobs.filter((j) => j.jobId !== jobId));
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Queue Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Title Generation Queue */}
          <div className="border rounded-lg p-6 bg-white">
            <h2 className="text-xl font-semibold mb-4">Title Generation Queue</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Waiting</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.titleQueue.waiting}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Active</div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.titleQueue.active}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Completed</div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.titleQueue.completed}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Failed</div>
                <div className="text-2xl font-bold text-red-600">
                  {stats.titleQueue.failed}
                </div>
              </div>
            </div>
            <button
              onClick={startTitleGeneration}
              disabled={titleGenRunning}
              className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {titleGenRunning ? 'Starting...' : 'Generate Missing Titles'}
            </button>
          </div>

          {/* Embedding Regeneration Queue */}
          <div className="border rounded-lg p-6 bg-white">
            <h2 className="text-xl font-semibold mb-4">Embedding Regeneration Queue</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Waiting</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.embeddingQueue.waiting}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Active</div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.embeddingQueue.active}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Completed</div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.embeddingQueue.completed}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Failed</div>
                <div className="text-2xl font-bold text-red-600">
                  {stats.embeddingQueue.failed}
                </div>
              </div>
            </div>
            <button
              onClick={startEmbeddingRegeneration}
              disabled={embeddingRegenRunning}
              className="mt-4 w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {embeddingRegenRunning ? 'Starting...' : 'Regenerate All Embeddings'}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border rounded-lg p-6 bg-white mb-8">
        <h2 className="text-xl font-semibold mb-4">Maintenance Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={cleanJobs}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Clean Old Jobs
          </button>
          <button
            onClick={fetchStats}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Active Job Monitors */}
      {activeJobs.length > 0 && (
        <div className="border rounded-lg p-6 bg-white">
          <h2 className="text-xl font-semibold mb-4">Active Jobs</h2>
          <div className="space-y-4">
            {activeJobs.map((job) => (
              <JobProgressMonitor
                key={job.jobId}
                jobId={job.jobId}
                jobType={job.type}
                onComplete={() => {
                  removeJobMonitor(job.jobId);
                  fetchStats();
                }}
                onError={() => {
                  removeJobMonitor(job.jobId);
                  fetchStats();
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold mb-2">About Background Jobs</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>
            <strong>Title Generation</strong>: Uses TinyLlama to generate titles for memories
            without titles
          </li>
          <li>
            <strong>Embedding Regeneration</strong>: Regenerates vector embeddings for all
            memories (useful after model upgrades)
          </li>
          <li>Jobs are processed in the background and can be monitored in real-time</li>
          <li>Failed jobs will be retried automatically with exponential backoff</li>
          <li>Old completed/failed jobs are cleaned up after 24 hours</li>
        </ul>
      </div>
    </div>
  );
}
