import { useState, useEffect } from 'react';
import type { MemoryVersion } from '@leon4s4/memorizer-shared';
import { DiffViewer } from './DiffViewer';

interface VersionHistoryProps {
  memoryId: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffResult {
  lines: DiffLine[];
  stats: {
    added: number;
    removed: number;
    unchanged: number;
  };
}

interface DiffResponse {
  from_version: number;
  to_version: number;
  diff: DiffResult;
}

export function VersionHistory({ memoryId }: VersionHistoryProps) {
  const [versions, setVersions] = useState<MemoryVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [memoryId]);

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/memories/${memoryId}/versions`);
      if (!response.ok) throw new Error('Failed to fetch versions');

      const data = await response.json();
      setVersions(data.versions);
    } catch (err) {
      setError('Failed to load version history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewDiff = async (versionId: string) => {
    try {
      const response = await fetch(`/api/memories/${memoryId}/diff?from_version=${versionId}`);
      if (!response.ok) throw new Error('Failed to fetch diff');

      const data: DiffResponse = await response.json();
      setDiffData(data);
    } catch (err) {
      setError('Failed to load diff');
      console.error(err);
    }
  };

  const revertToVersion = async (versionId: string) => {
    if (!confirm('Are you sure you want to revert to this version? This will create a new version.')) {
      return;
    }

    setReverting(true);
    try {
      const response = await fetch(`/api/memories/${memoryId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_id: versionId }),
      });

      if (!response.ok) throw new Error('Failed to revert');

      alert('Successfully reverted to version');
      window.location.reload(); // Reload to show updated memory
    } catch (err) {
      setError('Failed to revert to version');
      console.error(err);
    } finally {
      setReverting(false);
    }
  };

  const closeDiff = () => {
    setDiffData(null);
  };

  if (loading) {
    return <div className="text-gray-600">Loading version history...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (versions.length === 0) {
    return (
      <div className="text-gray-600 italic">
        No version history yet. Versions are created when memories are updated.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Version History ({versions.length})</h3>

      {/* Diff Viewer Modal */}
      {diffData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold">
                  Comparing Version {diffData.from_version} → Version {diffData.to_version}
                </h4>
                <button
                  onClick={closeDiff}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                <span className="text-green-600">+{diffData.diff.stats.added} added</span>
                {' · '}
                <span className="text-red-600">-{diffData.diff.stats.removed} removed</span>
                {' · '}
                <span className="text-gray-500">{diffData.diff.stats.unchanged} unchanged</span>
              </div>
            </div>
            <div className="p-4">
              <DiffViewer diff={diffData.diff} />
            </div>
          </div>
        </div>
      )}

      {/* Version List */}
      <div className="space-y-3">
        {versions.map((version) => (
          <div
            key={version.version_id}
            className="border rounded-lg p-3 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">Version {version.version_number}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{version.type}</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {new Date(version.versioned_at).toLocaleString()}
                </div>
                {version.title && (
                  <div className="text-sm font-medium mb-1">{version.title}</div>
                )}
                <div className="text-sm text-gray-700 line-clamp-2">{version.text}</div>
                {version.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {version.tags.map((tag) => (
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
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => viewDiff(version.version_id)}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                View Changes
              </button>
              <button
                onClick={() => revertToVersion(version.version_id)}
                disabled={reverting}
                className="text-sm text-green-500 hover:text-green-700 disabled:text-gray-400"
              >
                {reverting ? 'Reverting...' : 'Revert to This Version'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
