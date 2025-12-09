import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Create() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: 'note',
    title: '',
    text: '',
    source: '',
    tags: '',
    confidence: '1.0',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title || null,
          content: { text: formData.text },
          text: formData.text,
          source: formData.source || 'manual',
          tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
          confidence: parseFloat(formData.confidence),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create memory');
      }

      const memory = await response.json();
      navigate(`/memories/${memory.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create Memory</h1>

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
            placeholder="Enter a title..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Content *</label>
          <textarea
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md bg-background min-h-[200px]"
            placeholder="Enter your memory content..."
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
            placeholder="manual"
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
            placeholder="tag1, tag2, tag3"
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
            disabled={loading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Memory'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2 border border-border rounded-md hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
