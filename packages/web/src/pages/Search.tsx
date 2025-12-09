import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Memory } from '@leon4s4/memorizer-shared';

interface SearchResult extends Memory {
  similarity_score?: number;
}

interface SearchResponse {
  results: SearchResult[];
  count: number;
  query: string;
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Filter options
  const [limit, setLimit] = useState(10);
  const [threshold, setThreshold] = useState(0.5);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const memoryTypes = ['note', 'fact', 'idea', 'task', 'question'];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          limit,
          threshold,
          types: selectedTypes.length > 0 ? selectedTypes : undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResponse = await response.json();
      setResults(data.results);
    } catch (err) {
      setError('Failed to search memories. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.currentTarget;
      const tag = input.value.trim();
      if (tag && !selectedTags.includes(tag)) {
        setSelectedTags([...selectedTags, tag]);
        input.value = '';
      }
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Search Memories</h1>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4 mb-8">
        {/* Query Input */}
        <div>
          <label htmlFor="query" className="block text-sm font-medium mb-2">
            Search Query
          </label>
          <input
            type="text"
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your search query..."
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Limit */}
          <div>
            <label htmlFor="limit" className="block text-sm font-medium mb-2">
              Results Limit
            </label>
            <input
              type="number"
              id="limit"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              min="1"
              max="100"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Threshold */}
          <div>
            <label htmlFor="threshold" className="block text-sm font-medium mb-2">
              Similarity Threshold ({threshold.toFixed(2)})
            </label>
            <input
              type="range"
              id="threshold"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              min="0"
              max="1"
              step="0.05"
              className="w-full"
            />
          </div>
        </div>

        {/* Type Filters */}
        <div>
          <label className="block text-sm font-medium mb-2">Filter by Type</label>
          <div className="flex flex-wrap gap-2">
            {memoryTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTypes.includes(type)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Tag Filters */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium mb-2">
            Filter by Tags (press Enter to add)
          </label>
          <input
            type="text"
            id="tags"
            onKeyDown={handleTagInput}
            placeholder="Type a tag and press Enter..."
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Search Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {results.length > 0
              ? `Found ${results.length} result${results.length === 1 ? '' : 's'}`
              : 'No results found'}
          </h2>

          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {result.title || 'Untitled Memory'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <span className="px-2 py-0.5 bg-gray-100 rounded">
                          {result.type}
                        </span>
                        {result.similarity_score !== undefined && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded">
                            {(result.similarity_score * 100).toFixed(1)}% match
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-3 line-clamp-3">{result.text}</p>

                  {result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {result.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link
                      to={`/memories/${result.id}`}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      View Details
                    </Link>
                    <Link
                      to={`/memories/${result.id}/edit`}
                      className="text-green-500 hover:text-green-700 text-sm"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {!searched && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">How to use semantic search:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>Enter natural language queries like "ideas about AI"</li>
            <li>Adjust the similarity threshold to control result precision</li>
            <li>Use type and tag filters to narrow down results</li>
            <li>Results are ranked by semantic similarity</li>
          </ul>
        </div>
      )}
    </div>
  );
}
