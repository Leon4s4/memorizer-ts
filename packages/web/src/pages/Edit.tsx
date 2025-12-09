import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Memory } from '@leon4s4/memorizer-shared';

export function Edit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    text: '',
    source: '',
    tags: '',
    confidence: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const data: Memory = await response.json();
      setMemory(data);
      setFormData({
        type: data.type,
        title: data.title || '',
        text: data.text,
        source: data.source,
        tags: data.tags.join(', '),
        confidence: data.confidence.toString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/memories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title || null,
          content: { text: formData.text },
          text: formData.text,
          source: formData.source,
          tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
          confidence: parseFloat(formData.confidence),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update memory');
      }

      navigate(`/memories/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error && !memory) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
        <Link to="/" className="text-primary hover:underline mt-2 inline-block">
          ← Back to memories
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Edit Memory</h1>
        <Link
          to={`/memories/${id}`}
          className="text-primary hover:underline"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
            required
          >
            <option value="note">Note</option>
            <option value="fact">Fact</option>
            <option value="idea">Idea</option>
            <option value="task">Task</option>
            <option value="question">Question</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Title (optional)
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Content *</label>
          <textarea
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md bg-background min-h-[200px]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Source</label>
          <input
            type="text"
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Confidence (0-1)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={formData.confidence}
            onChange={(e) =>
              setFormData({ ...formData, confidence: e.target.value })
            }
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            to={`/memories/${id}`}
            className="px-6 py-2 border border-border rounded-md hover:bg-accent inline-block text-center"
          >
            Cancel
          </Link>
        </div>
      </form>

      {memory && (
        <div className="mt-6 text-sm text-muted-foreground">
          <p>Version: {memory.current_version}</p>
          <p>Last updated: {new Date(memory.updated_at).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
