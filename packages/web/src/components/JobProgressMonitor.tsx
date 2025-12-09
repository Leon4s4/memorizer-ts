import { useState, useEffect, useRef } from 'react';

interface JobProgress {
  jobId: string;
  jobType: string;
  progress: number; // 0-100
  status: 'active' | 'completed' | 'failed' | 'waiting';
  result?: unknown;
  error?: string;
  timestamp: Date;
}

interface JobProgressMonitorProps {
  jobId: string;
  jobType: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function JobProgressMonitor({
  jobId,
  jobType,
  onComplete,
  onError,
}: JobProgressMonitorProps) {
  const [progress, setProgress] = useState<JobProgress>({
    jobId,
    jobType,
    progress: 0,
    status: 'waiting',
    timestamp: new Date(),
  });
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to SSE endpoint
    const eventSource = new EventSource(
      `/api/admin/jobs/${jobId}/progress?queue=${jobType}`
    );

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          setConnected(true);
          return;
        }

        if (data.type === 'progress') {
          const progressData: JobProgress = {
            jobId: data.jobId,
            jobType: data.jobType,
            progress: data.progress,
            status: data.status,
            result: data.result,
            error: data.error,
            timestamp: new Date(data.timestamp),
          };

          setProgress(progressData);

          // Handle completion
          if (data.status === 'completed') {
            if (onComplete) {
              setTimeout(onComplete, 1000);
            }
          }

          // Handle errors
          if (data.status === 'failed') {
            if (onError) {
              setTimeout(() => onError(data.error || 'Job failed'), 1000);
            }
          }
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setConnected(false);
      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [jobId, jobType, onComplete, onError]);

  const getStatusColor = () => {
    switch (progress.status) {
      case 'waiting':
        return 'bg-gray-200';
      case 'active':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-200';
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'waiting':
        return 'Waiting';
      case 'active':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getJobTypeLabel = () => {
    return jobType === 'title-generation' ? 'Title Generation' : 'Embedding Regeneration';
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-center mb-2">
        <div>
          <div className="font-semibold">{getJobTypeLabel()}</div>
          <div className="text-sm text-gray-600">Job ID: {jobId.substring(0, 8)}...</div>
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
              Connected
            </span>
          )}
          <span
            className={`text-xs px-2 py-1 text-white rounded ${
              progress.status === 'completed'
                ? 'bg-green-600'
                : progress.status === 'failed'
                  ? 'bg-red-600'
                  : progress.status === 'active'
                    ? 'bg-blue-600'
                    : 'bg-gray-600'
            }`}
          >
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{progress.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full ${getStatusColor()} transition-all duration-300 ease-out flex items-center justify-center text-xs text-white font-medium`}
            style={{ width: `${progress.progress}%` }}
          >
            {progress.progress > 10 && `${progress.progress}%`}
          </div>
        </div>
      </div>

      {/* Result or Error */}
      {progress.status === 'completed' && progress.result !== undefined && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
          <strong>Result:</strong>{' '}
          <pre className="inline">{JSON.stringify(progress.result as Record<string, unknown>, null, 2)}</pre>
        </div>
      )}

      {progress.status === 'failed' && progress.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <strong>Error:</strong> {progress.error}
        </div>
      )}

      {/* Timestamp */}
      <div className="text-xs text-gray-500 mt-2">
        Last updated: {progress.timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
}
