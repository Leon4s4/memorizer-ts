import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Memory } from '@leon4s4/memorizer-shared';
import { VersionHistory } from '../components/VersionHistory';
import { SimilarMemories } from '../components/SimilarMemories';
import { RelationshipsList } from '../components/RelationshipsList';

type Tab = 'details' | 'versions' | 'similar' | 'relationships';

export function View() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('details');

  useEffect(() => {
    if (id) {
      fetchMemory(id);
    }
  }, [id]);

  const fetchMemory = async (memoryId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/memories/${memoryId}`);
      if (!response.ok) {
        throw new Error('Memory not found');
      }
      const data = await response.json();
      setMemory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async () => {
    if (!id || !confirm('Are you sure you want to delete this memory?')) {
      return;
    }

    try {
      const response = await fetch(`/api/memories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete memory');
      }

      navigate('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete memory');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !memory) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error || 'Memory not found'}</p>
        <Link to="/" className="text-primary hover:underline mt-2 inline-block">
          ← Back to memories
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Link to="/" className="text-primary hover:underline">
          ← Back to memories
        </Link>
        <div className="flex gap-2">
          <Link
            to={`/memories/${id}/edit`}
            className="px-4 py-2 border border-border rounded-md hover:bg-accent"
          >
            Edit
          </Link>
          <button
            onClick={deleteMemory}
            className="px-4 py-2 border border-red-600 text-red-600 dark:border-red-400 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="border border-border rounded-lg p-6 bg-card">
        <h1 className="text-3xl font-bold mb-4">
          {memory.title || 'Untitled'}
        </h1>

        <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
          <span className="px-2 py-1 bg-secondary rounded">{memory.type}</span>
          {memory.tags && memory.tags.length > 0 && (
            <div className="flex gap-1">
              {memory.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-accent rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <span>Version {memory.current_version}</span>
          <span>Confidence: {(memory.confidence * 100).toFixed(0)}%</span>
        </div>

        <div className="prose dark:prose-invert max-w-none mb-6">
          <pre className="whitespace-pre-wrap bg-muted p-4 rounded">
            {memory.text}
          </pre>
        </div>

        <div className="border-t border-border pt-4 text-sm text-muted-foreground">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Source:</span> {memory.source}
            </div>
            <div>
              <span className="font-medium">Created:</span>{' '}
              {new Date(memory.created_at).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Updated:</span>{' '}
              {new Date(memory.updated_at).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">ID:</span>{' '}
              <code className="text-xs">{memory.id}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <div className="border-b border-border">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'versions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Version History
            </button>
            <button
              onClick={() => setActiveTab('similar')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'similar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Similar Memories
            </button>
            <button
              onClick={() => setActiveTab('relationships')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'relationships'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Relationships
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'details' && (
            <div className="border border-border rounded-lg p-6 bg-card">
              <h3 className="text-lg font-semibold mb-4">Memory Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-sm text-muted-foreground">Content:</span>
                  <div className="mt-1 bg-muted p-3 rounded">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(memory.content, null, 2)}
                    </pre>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-sm text-muted-foreground">
                    Relationship Count:
                  </span>{' '}
                  {memory.relationship_count || 0}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'versions' && <VersionHistory memoryId={id!} />}

          {activeTab === 'similar' && (
            <SimilarMemories memoryId={id!} limit={10} threshold={0.6} />
          )}

          {activeTab === 'relationships' && (
            <RelationshipsList memoryId={id!} direction="both" />
          )}
        </div>
      </div>
    </div>
  );
}
